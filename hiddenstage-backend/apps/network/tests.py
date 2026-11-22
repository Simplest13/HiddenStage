"""Manager–Worker network and assignment rules."""

from datetime import time, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIClient

from apps.commitments.services import accept_quotation
from apps.core.testutils import (
    invite_and_accept,
    make_customer,
    make_event,
    make_provider,
    submitted_quotation,
)
from apps.network.models import (
    AssignmentStatus,
    AssociationStatus,
    NetworkAssociation,
    NetworkInvitation,
    NetworkInvitationStatus,
    WorkerAssignment,
)
from apps.network.services import (
    assignment_conflicts,
    cancel_assignment,
    check_availability,
    complete_assignment,
    create_assignment,
    end_network_association,
    list_assignments,
    respond_to_assignment,
    respond_to_network_invitation,
    send_network_invitation,
    start_assignment,
)
from apps.profiles.models import ProviderKind, ProviderProfile


def make_provider_of_kind(email, kind, categories=("photography",), pin_code="560001", city="Bengaluru"):
    user = make_provider(email, categories=categories, pin_code=pin_code, city=city)
    ProviderProfile.objects.filter(user=user).update(kind=kind)
    return user


def connect(manager, worker):
    invitation = send_network_invitation(manager=manager, worker_id=worker.id)
    respond_to_network_invitation(
        invitation_id=invitation.id, worker=worker, accept=True
    )
    return NetworkAssociation.objects.get(
        manager=manager, worker=worker, status=AssociationStatus.ACTIVE
    )


def accepted_commitment(customer, manager, event=None, category="photography"):
    event = event or make_event(customer, category=category)
    invite_and_accept(event, manager)
    quotation = submitted_quotation(manager, event)
    revision = quotation.current_revision
    return accept_quotation(
        actor=customer,
        quotation_id=quotation.id,
        revision_id=revision.id,
        requirement_ids=[event.requirements.first().id],
    )


def assignment_payload(commitment, worker):
    return {
        "worker_id": worker.id,
        "commitment_id": commitment.id,
        "role": "Photographer",
        "task_description": "Photograph the ceremony and reception.",
        "start_time": time(10, 0),
        "end_time": time(18, 0),
        "reporting_time": time(9, 30),
        "location": "Indiranagar, Bengaluru",
        "instructions": "Bring two bodies and a backup flash.",
    }


class NetworkInvitationTests(TestCase):
    def setUp(self):
        self.manager = make_provider_of_kind("manager@example.com", ProviderKind.MANAGER)
        self.worker = make_provider_of_kind("worker@example.com", ProviderKind.WORKER)
        self.manager_b = make_provider_of_kind("manager-b@example.com", ProviderKind.MANAGER)
        self.worker_b = make_provider_of_kind("worker-b@example.com", ProviderKind.WORKER)

    def test_accepting_a_network_invitation_creates_association(self):
        invitation = send_network_invitation(manager=self.manager, worker_id=self.worker.id)
        accepted, association = respond_to_network_invitation(
            invitation_id=invitation.id, worker=self.worker, accept=True
        )
        self.assertEqual(accepted.status, NetworkInvitationStatus.ACCEPTED)
        self.assertIsNotNone(association)
        self.assertTrue(
            NetworkAssociation.objects.filter(
                manager=self.manager, worker=self.worker, status=AssociationStatus.ACTIVE
            ).exists()
        )

    def test_declining_creates_no_association_and_keeps_history(self):
        invitation = send_network_invitation(manager=self.manager, worker_id=self.worker.id)
        declined, association = respond_to_network_invitation(
            invitation_id=invitation.id, worker=self.worker, accept=False
        )
        self.assertEqual(declined.status, NetworkInvitationStatus.DECLINED)
        self.assertIsNone(association)
        self.assertFalse(NetworkAssociation.objects.filter(worker=self.worker).exists())
        self.assertTrue(NetworkInvitation.objects.filter(id=invitation.id).exists())

    def test_duplicate_pending_invitation_is_rejected(self):
        send_network_invitation(manager=self.manager, worker_id=self.worker.id)
        with self.assertRaises(Exception):
            send_network_invitation(manager=self.manager, worker_id=self.worker.id)

    def test_manager_cannot_invite_a_manager(self):
        with self.assertRaises(Exception):
            send_network_invitation(manager=self.manager, worker_id=self.manager_b.id)

    def test_worker_can_associate_with_two_managers(self):
        connect(self.manager, self.worker)
        connect(self.manager_b, self.worker)
        self.assertEqual(
            NetworkAssociation.objects.filter(
                worker=self.worker, status=AssociationStatus.ACTIVE
            ).count(),
            2,
        )

    def test_worker_cannot_answer_another_workers_invitation(self):
        invitation = send_network_invitation(manager=self.manager, worker_id=self.worker.id)
        with self.assertRaises(PermissionDenied):
            respond_to_network_invitation(
                invitation_id=invitation.id, worker=self.worker_b, accept=True
            )

    def test_ending_an_association_retains_the_row(self):
        association = connect(self.manager, self.worker)
        end_network_association(
            association_id=association.id, actor=self.worker, reason="Taking a break"
        )
        association.refresh_from_db()
        self.assertEqual(association.status, AssociationStatus.ENDED)
        self.assertEqual(association.ended_reason, "Taking a break")
        self.assertTrue(NetworkAssociation.objects.filter(id=association.id).exists())

    def test_expired_invitation_is_marked_when_invitations_are_listed(self):
        invitation = send_network_invitation(manager=self.manager, worker_id=self.worker.id)
        NetworkInvitation.objects.filter(id=invitation.id).update(
            expires_at=timezone.now() - timedelta(minutes=1)
        )
        client = APIClient()
        client.force_authenticate(self.worker)
        response = client.get("/api/v1/network/invitations/")
        self.assertEqual(response.status_code, 200)
        row = next(item for item in response.data if item["id"] == str(invitation.id))
        self.assertEqual(row["status"], NetworkInvitationStatus.EXPIRED)


class AssignmentTests(TestCase):
    def setUp(self):
        self.customer = make_customer("customer@example.com")
        self.manager = make_provider_of_kind("manager@example.com", ProviderKind.MANAGER)
        self.worker = make_provider_of_kind("worker@example.com", ProviderKind.WORKER)
        self.other_worker = make_provider_of_kind("other@example.com", ProviderKind.WORKER)
        self.manager_b = make_provider_of_kind("manager-b@example.com", ProviderKind.MANAGER)
        connect(self.manager, self.worker)
        self.commitment = accepted_commitment(self.customer, self.manager)
        self.assignment = create_assignment(
            manager=self.manager, **assignment_payload(self.commitment, self.worker)
        )

    def test_assignment_is_sent_and_worker_accepts(self):
        self.assertEqual(self.assignment.status, AssignmentStatus.SENT)
        accepted = respond_to_assignment(
            worker=self.worker, assignment_id=self.assignment.id, accept=True
        )
        self.assertEqual(accepted.status, AssignmentStatus.ACCEPTED)
        self.assertIsNotNone(accepted.accepted_at)

    def test_unassociated_worker_cannot_be_assigned(self):
        with self.assertRaises(PermissionDenied):
            create_assignment(
                manager=self.manager, **assignment_payload(self.commitment, self.other_worker)
            )

    def test_manager_cannot_assign_another_managers_commitment(self):
        connect(self.manager_b, self.worker)
        with self.assertRaises(PermissionDenied):
            create_assignment(
                manager=self.manager_b, **assignment_payload(self.commitment, self.worker)
            )

    def test_declined_assignment_can_be_reassigned_without_losing_history(self):
        declined = respond_to_assignment(
            worker=self.worker,
            assignment_id=self.assignment.id,
            accept=False,
            reason="Already booked",
        )
        self.assertEqual(declined.status, AssignmentStatus.DECLINED)
        connect(self.manager, self.other_worker)
        replacement = create_assignment(
            manager=self.manager,
            **assignment_payload(self.commitment, self.other_worker),
            replaces_id=self.assignment.id,
        )
        self.assignment.refresh_from_db()
        self.assertEqual(self.assignment.status, AssignmentStatus.REASSIGNED)
        self.assertEqual(replacement.replaces_id, self.assignment.id)
        self.assertTrue(
            WorkerAssignment.objects.filter(id=self.assignment.id).exists()
        )

    def test_pending_assignment_does_not_block_but_accepted_assignment_does(self):
        self.assertTrue(
            check_availability(
                manager=self.manager_b,
                worker_id=self.worker.id,
                event_date=self.assignment.event_date,
                start_time=time(12, 0),
                end_time=time(14, 0),
            )["available"]
        )
        respond_to_assignment(worker=self.worker, assignment_id=self.assignment.id, accept=True)
        result = check_availability(
            manager=self.manager_b,
            worker_id=self.worker.id,
            event_date=self.assignment.event_date,
            start_time=time(12, 0),
            end_time=time(14, 0),
        )
        self.assertFalse(result["available"])
        self.assertTrue(result["conflict"])

    def test_unassociated_manager_gets_only_limited_worker_availability(self):
        respond_to_assignment(
            worker=self.worker, assignment_id=self.assignment.id, accept=True
        )
        client = APIClient()
        client.force_authenticate(self.manager_b)
        response = client.get(
            "/api/v1/assignments/availability/",
            {
                "worker_id": str(self.worker.id),
                "event_date": self.assignment.event_date.isoformat(),
                "start_time": "12:00:00",
                "end_time": "14:00:00",
            },
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            set(response.data),
            {"available", "conflict", "event_date", "start_time", "end_time"},
        )
        self.assertFalse(response.data["available"])
        self.assertTrue(response.data["conflict"])

    def test_non_manager_cannot_query_worker_availability(self):
        for user in (self.customer, self.worker):
            client = APIClient()
            client.force_authenticate(user)
            response = client.get(
                "/api/v1/assignments/availability/",
                {
                    "worker_id": str(self.worker.id),
                    "event_date": self.assignment.event_date.isoformat(),
                    "start_time": "12:00:00",
                    "end_time": "14:00:00",
                },
            )
            self.assertEqual(response.status_code, 403, response.content)

    def test_overlapping_assignment_cannot_be_accepted(self):
        first = respond_to_assignment(
            worker=self.worker, assignment_id=self.assignment.id, accept=True
        )
        self.assertEqual(first.status, AssignmentStatus.ACCEPTED)

        connect(self.manager_b, self.worker)
        other_event = make_event(self.customer, category="photography")
        commitment_b = accepted_commitment(self.customer, self.manager_b, event=other_event)
        second = create_assignment(
            manager=self.manager_b, **assignment_payload(commitment_b, self.worker)
        )
        with self.assertRaises(Exception):
            respond_to_assignment(
                worker=self.worker, assignment_id=second.id, accept=True
            )
        self.assertEqual(
            len(
                assignment_conflicts(
                    worker=self.worker,
                    event_date=second.event_date,
                    start_time=second.start_time,
                    end_time=second.end_time,
                )
            ),
            1,
        )

    def test_cancelled_assignment_does_not_block_and_history_remains(self):
        respond_to_assignment(worker=self.worker, assignment_id=self.assignment.id, accept=True)
        cancelled = cancel_assignment(
            manager=self.manager, assignment_id=self.assignment.id, reason="Client changed scope"
        )
        self.assertEqual(cancelled.status, AssignmentStatus.CANCELLED)
        self.assertTrue(
            check_availability(
                manager=self.manager_b,
                worker_id=self.worker.id,
                event_date=self.assignment.event_date,
                start_time=time(12, 0),
                end_time=time(14, 0),
            )["available"]
        )

    def test_assignment_lifecycle_start_and_complete(self):
        respond_to_assignment(worker=self.worker, assignment_id=self.assignment.id, accept=True)
        started = start_assignment(worker=self.worker, assignment_id=self.assignment.id)
        self.assertEqual(started.status, AssignmentStatus.IN_PROGRESS)
        done = complete_assignment(
            worker=self.worker,
            assignment_id=self.assignment.id,
            completion_notes="All photographs delivered.",
        )
        self.assertEqual(done.status, AssignmentStatus.COMPLETED)
        self.assertEqual(done.completion_notes, "All photographs delivered.")

    def test_ending_network_does_not_cancel_accepted_assignment(self):
        respond_to_assignment(worker=self.worker, assignment_id=self.assignment.id, accept=True)
        association = NetworkAssociation.objects.get(manager=self.manager, worker=self.worker)
        end_network_association(association_id=association.id, actor=self.manager)
        self.assignment.refresh_from_db()
        self.assertEqual(self.assignment.status, AssignmentStatus.ACCEPTED)

    def test_assignment_detail_is_private(self):
        client = APIClient()
        client.force_authenticate(self.other_worker)
        self.assertEqual(
            client.get(f"/api/v1/assignments/{self.assignment.id}/").status_code, 403
        )
        client.force_authenticate(self.customer)
        self.assertEqual(
            client.get(f"/api/v1/assignments/{self.assignment.id}/").status_code, 403
        )

    def test_worker_cannot_accept_another_workers_assignment(self):
        with self.assertRaises(PermissionDenied):
            respond_to_assignment(
                worker=self.other_worker, assignment_id=self.assignment.id, accept=True
            )

    def test_customer_cannot_list_assignments(self):
        client = APIClient()
        client.force_authenticate(self.customer)
        self.assertEqual(client.get("/api/v1/assignments/").status_code, 403)

    def test_manager_assignment_list_is_scoped_to_own_assignments(self):
        client = APIClient()
        client.force_authenticate(self.manager_b)
        self.assertEqual(client.get("/api/v1/assignments/").data, [])
        client.force_authenticate(self.manager)
        self.assertEqual(len(client.get("/api/v1/assignments/").data), 1)
