"""Remove accounts created by the browser-QA suite, and nothing else.

The Playwright suite registers throwaway users at `@example.test` only. This
command deletes exactly those accounts (and their cascading rows) so repeated QA
runs do not leave litter behind. It never touches any other address.

    python scripts/purge_qa_accounts.py            # dry run, prints the plan
    python scripts/purge_qa_accounts.py --apply    # performs the deletion
"""

import os
import sys

import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User  # noqa: E402
from apps.commitments.models import Commitment  # noqa: E402
from apps.events.models import Event, EventAttachment  # noqa: E402
from apps.network.models import NetworkAssociation, NetworkInvitation, WorkerAssignment  # noqa: E402
from apps.quotations.models import Quotation  # noqa: E402

QA_PATTERN = r'^[a-z0-9-]+.[a-z0-9]+@example.test


def main() -> int:
    users = User.objects.filter(email__regex=QA_PATTERN)
    since = None
    for index, arg in enumerate(sys.argv):
        if arg == '--since' and index + 1 < len(sys.argv):
            since = sys.argv[index + 1]
    if not since:
        print('Refusing to guess: pass --since YYYY-MM-DD (accounts created on/after that date).')
        return 2
    users = users.filter(date_joined__date__gte=since)
    user_ids = list(users.values_list("id", flat=True))
    events = Event.objects.filter(customer_id__in=user_ids)
    report = {
        "qa_accounts": len(user_ids),
        "events": events.count(),
        "attachments": EventAttachment.objects.filter(event__in=events).count(),
        "quotations": Quotation.objects.filter(provider_id__in=user_ids).count(),
        "commitments": Commitment.objects.filter(customer_id__in=user_ids).count(),
        "network_invitations": NetworkInvitation.objects.filter(
            manager_id__in=user_ids
        ).count()
        + NetworkInvitation.objects.filter(worker_id__in=user_ids).count(),
        "associations": NetworkAssociation.objects.filter(manager_id__in=user_ids).count()
        + NetworkAssociation.objects.filter(worker_id__in=user_ids).count(),
        "assignments": WorkerAssignment.objects.filter(manager_id__in=user_ids).count()
        + WorkerAssignment.objects.filter(worker_id__in=user_ids).count(),
    }
    print(f"QA cleanup plan ({since} onward, {QA_PATTERN}):")
    for key, value in report.items():
        print(f"  {key:>19}: {value}")

    print("  sample:", list(users.values_list("email", flat=True)[:3]))

    if "--apply" not in sys.argv:
        print("\nDry run. Re-run with --apply to delete these records.")
        return 0

    deleted, _ = users.delete()
    print(f"\nDeleted {deleted} rows belonging to {len(user_ids)} QA accounts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())



def main() -> int:
    users = User.objects.filter(email__endswith=QA_DOMAIN)
    user_ids = list(users.values_list("id", flat=True))
    events = Event.objects.filter(customer_id__in=user_ids)
    report = {
        "qa_accounts": len(user_ids),
        "events": events.count(),
        "attachments": EventAttachment.objects.filter(event__in=events).count(),
        "quotations": Quotation.objects.filter(provider_id__in=user_ids).count(),
        "commitments": Commitment.objects.filter(customer_id__in=user_ids).count(),
        "network_invitations": NetworkInvitation.objects.filter(
            manager_id__in=user_ids
        ).count()
        + NetworkInvitation.objects.filter(worker_id__in=user_ids).count(),
        "associations": NetworkAssociation.objects.filter(manager_id__in=user_ids).count()
        + NetworkAssociation.objects.filter(worker_id__in=user_ids).count(),
        "assignments": WorkerAssignment.objects.filter(manager_id__in=user_ids).count()
        + WorkerAssignment.objects.filter(worker_id__in=user_ids).count(),
    }
    print("QA cleanup plan (domain %s):" % QA_DOMAIN)
    for key, value in report.items():
        print(f"  {key:>19}: {value}")

    if "--apply" not in sys.argv:
        print("\nDry run. Re-run with --apply to delete these records.")
        return 0

    deleted, _ = users.delete()
    print(f"\nDeleted {deleted} rows belonging to {len(user_ids)} QA accounts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
