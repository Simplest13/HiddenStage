import os
import django
from uuid import uuid4
from datetime import date, time, timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.utils import timezone
from apps.accounts.models import User, Notification
from apps.profiles.models import ProviderProfile, ServiceCategory, ProviderCoverage, ProviderKind, ProviderService
from apps.events.models import Event, ServiceRequirement, EventStatus
from apps.quotations.models import Quotation, QuotationRevision, QuotationItem, QuotationStatus
from apps.commitments.models import Commitment, CommitmentLine, CommitmentStatus, Invoice, PaymentTransaction
from apps.network.models import CustomerConnection, Conversation, ChatMessage

def seed():
    print("Seeding ecosystem demo data...")

    # 1. Categories
    cat_catering = ServiceCategory.objects.filter(code="catering").first()
    cat_photo = ServiceCategory.objects.filter(code="photography").first()
    cat_sound = ServiceCategory.objects.filter(code="sound").first()

    # 2. Users
    cust, _ = User.objects.get_or_create(
        email="customer@hiddenstage.in",
        defaults={
            "full_name": "Demo Customer",
            "username": "democustomer",
            "role": "CUSTOMER",
            "phone": "9876543210",
            "is_active": True,
            "theme_preference": "light",
            "email_verified_at": timezone.now(),
        }
    )
    cust.set_password("Pass1234!")
    cust.username = "democustomer"
    cust.save()

    ananya, _ = User.objects.get_or_create(
        email="ananya@example.com",
        defaults={
            "full_name": "Ananya Sharma",
            "username": "ananya_sharma",
            "role": "CUSTOMER",
            "phone": "9876543211",
            "is_active": True,
            "theme_preference": "light",
            "email_verified_at": timezone.now(),
        }
    )
    ananya.set_password("Password123!")
    ananya.username = "ananya_sharma"
    ananya.save()

    # Providers
    mgr, _ = User.objects.get_or_create(
        email="manager@hiddenstage.in",
        defaults={
            "full_name": "Royal Heritage Events",
            "username": "royal_heritage",
            "role": "PROVIDER",
            "phone": "9876543212",
            "is_active": True,
            "theme_preference": "light",
            "email_verified_at": timezone.now(),
        }
    )
    mgr.set_password("Pass1234!")
    mgr.username = "royal_heritage"
    mgr.save()

    mgr_prof, _ = ProviderProfile.objects.get_or_create(
        user=mgr,
        defaults={
            "display_name": "Royal Heritage Event Planners",
            "username": "royal_heritage",
            "headline": "Luxury Wedding & Gala Architect",
            "kind": ProviderKind.MANAGER,
            "description": "Premier wedding and corporate event management specialist with 12+ years experience.",
            "verification_status": "VERIFIED",
        },
    )
    if cat_catering:
        mgr_prof.primary_category = cat_catering
        mgr_prof.save()
        ProviderService.objects.get_or_create(
            provider=mgr_prof, category=cat_catering, defaults={"title": "Royal Banquet Catering"}
        )
    ProviderCoverage.objects.get_or_create(
        provider=mgr_prof, city="Bengaluru", state="Karnataka", pin_code="560001", locality="MG Road"
    )

    worker, _ = User.objects.get_or_create(
        email="worker@hiddenstage.in",
        defaults={
            "full_name": "LensCraft Studios",
            "username": "lens_craft",
            "role": "PROVIDER",
            "phone": "9876543213",
            "is_active": True,
            "theme_preference": "light",
            "email_verified_at": timezone.now(),
        },
    )
    worker.set_password("Pass1234!")
    worker.username = "lens_craft"
    worker.save()

    worker_prof, _ = ProviderProfile.objects.get_or_create(
        user=worker,
        defaults={
            "display_name": "LensCraft Wedding Photography",
            "username": "lens_craft",
            "headline": "Cinematic 4K Films & Candid Photography",
            "kind": ProviderKind.INDIVIDUAL_SERVICE_PROVIDER,
            "description": "Cinematic 4K wedding films and candid photography team.",
            "verification_status": "VERIFIED",
        },
    )
    if cat_photo:
        worker_prof.primary_category = cat_photo
        worker_prof.save()
        ProviderService.objects.get_or_create(
            provider=worker_prof, category=cat_photo, defaults={"title": "Wedding Photography"}
        )
    ProviderCoverage.objects.get_or_create(
        provider=worker_prof,
        city="Bengaluru",
        state="Karnataka",
        pin_code="560038",
        locality="Indiranagar",
    )

    demo_sound, _ = User.objects.get_or_create(
        email="demo.provider@example.com",
        defaults={
            "full_name": "SoundCraft Pro Audio",
            "username": "sound_craft",
            "role": "PROVIDER",
            "phone": "9876543214",
            "is_active": True,
            "theme_preference": "light",
            "email_verified_at": timezone.now(),
        },
    )
    demo_sound.set_password("Password123!")
    demo_sound.username = "sound_craft"
    demo_sound.save()

    sound_prof, _ = ProviderProfile.objects.get_or_create(
        user=demo_sound,
        defaults={
            "display_name": "SoundCraft Audio & Lighting",
            "username": "sound_craft",
            "headline": "Concert Sound Systems & Intelligent Lights",
            "kind": ProviderKind.ASSOCIATED_SERVICE_PROVIDER,
            "description": "High-end concert sound, line arrays, DJ setups, and ambient illumination.",
            "verification_status": "VERIFIED",
        },
    )
    if cat_sound:
        sound_prof.primary_category = cat_sound
        sound_prof.save()
        ProviderService.objects.get_or_create(
            provider=sound_prof,
            category=cat_sound,
            defaults={"title": "Live Sound & Concert Production"},
        )
    ProviderCoverage.objects.get_or_create(
        provider=sound_prof,
        city="Bengaluru",
        state="Karnataka",
        pin_code="560034",
        locality="Koramangala",
    )

    # 3. Create Events for both customers
    for user_obj in [cust, ananya]:
        # Event 1: Upcoming Grand Wedding
        ev1, _ = Event.objects.get_or_create(
            customer=user_obj,
            name="Sharma-Kapoor Grand Wedding",
            defaults={
                "event_type": "Wedding",
                "description": "Three-day destination wedding with Sangeet, Mehendi, and traditional Reception banquet.",
                "event_date": timezone.now().date() + timedelta(days=28),
                "end_date": timezone.now().date() + timedelta(days=30),
                "start_time": time(17, 0),
                "end_time": time(23, 30),
                "guest_count": 450,
                "city": "Bengaluru",
                "state": "Karnataka",
                "locality": "Old Airport Road",
                "pin_code": "560008",
                "venue_name": "The Leela Palace Ballroom",
                "venue_address": "23 HAL Old Airport Rd, Kodihalli, Bengaluru",
                "status": EventStatus.SUBMITTED,
                "submitted_at": timezone.now() - timedelta(days=5),
            }
        )

        req1 = None
        if cat_catering:
            req1, _ = ServiceRequirement.objects.get_or_create(
                event=ev1,
                category=cat_catering,
                title="Royal Royal Banquet Catering",
                defaults={
                    "description": "Full course veg/non-veg banquet with 14 live counters and dessert lounge.",
                    "budget_paise": 35000000,
                    "position": 1,
                }
            )
        req2 = None
        if cat_photo:
            req2, _ = ServiceRequirement.objects.get_or_create(
                event=ev1,
                category=cat_photo,
                title="Candid & Cinematic Photography + Drone",
                defaults={
                    "description": "3 candid shooters, 2 cinematographers, drone operator, same-day edit reel.",
                    "budget_paise": 18000000,
                    "position": 2,
                }
            )

        # Create Quotation & Commitment for Catering
        quote_cat, _ = Quotation.objects.get_or_create(
            event=ev1,
            provider=mgr,
            defaults={
                "status": QuotationStatus.OPEN,
            },
        )
        rev_cat, _ = QuotationRevision.objects.get_or_create(
            quotation=quote_cat,
            revision_number=1,
            defaults={
                "status": "SUBMITTED",
                "valid_until": timezone.now().date() + timedelta(days=60),
                "total_paise": 32000000,
                "submitted_at": timezone.now() - timedelta(days=4),
            },
        )
        quote_cat.current_revision = rev_cat
        quote_cat.save(update_fields=["current_revision"])
        if req1:
            q_item1, _ = QuotationItem.objects.get_or_create(
                revision=rev_cat,
                requirement=req1,
                defaults={
                    "title": "Imperial Royal Banquet Package",
                    "amount_paise": 32000000,
                }
            )

        commit_cat, _ = Commitment.objects.get_or_create(
            event=ev1,
            customer=user_obj,
            provider=mgr,
            quotation=quote_cat,
            revision=rev_cat,
            defaults={
                "total_paise": 32000000,
                "status": CommitmentStatus.ACTIVE,
                "accepted_at": timezone.now() - timedelta(days=3),
            }
        )

        # Invoices for Catering
        inv1, _ = Invoice.objects.get_or_create(
            commitment=commit_cat,
            event=ev1,
            customer=user_obj,
            provider=mgr,
            invoice_number=f"INV-{str(user_obj.id)[:4].upper()}-001",
            defaults={
                "issue_date": timezone.now().date() - timedelta(days=3),
                "due_date": timezone.now().date() - timedelta(days=1),
                "amount_paise": 12800000,  # 40% advance
                "tax_paise": 2304000,
                "status": "PAID",
                "items": [
                    {"description": "Advance 40% for Royal Banquet Catering", "amount_paise": 12800000}
                ],
                "pdf_url": "/invoices/sample-catering-advance.pdf",
            }
        )

        PaymentTransaction.objects.get_or_create(
            invoice=inv1,
            customer=user_obj,
            defaults={
                "amount_paise": 12800000,
                "method": "SIMULATED_ESCROW",
                "reference": f"TXN-ESCROW-{str(user_obj.id)[:4].upper()}-01",
                "status": "COMPLETED",
                "paid_at": timezone.now() - timedelta(days=2),
            }
        )

        inv2, _ = Invoice.objects.get_or_create(
            commitment=commit_cat,
            event=ev1,
            customer=user_obj,
            provider=mgr,
            invoice_number=f"INV-{str(user_obj.id)[:4].upper()}-002",
            defaults={
                "issue_date": timezone.now().date(),
                "due_date": timezone.now().date() + timedelta(days=15),
                "amount_paise": 19200000,  # 60% final
                "tax_paise": 3456000,
                "status": "PAYMENT_PENDING",
                "items": [
                    {"description": "Final 60% balance for Royal Banquet Catering", "amount_paise": 19200000}
                ],
                "pdf_url": "/invoices/sample-catering-final.pdf",
            }
        )

        # Event 2: Corporate Gala
        ev2, _ = Event.objects.get_or_create(
            customer=user_obj,
            name="TechNova Annual Awards & Gala",
            defaults={
                "event_type": "Corporate Gala",
                "description": "500-attendee corporate celebration with keynote speakers, live awards, and networking dinner.",
                "event_date": timezone.now().date() + timedelta(days=55),
                "start_time": time(18, 0),
                "end_time": time(23, 0),
                "guest_count": 500,
                "city": "Bengaluru",
                "state": "Karnataka",
                "locality": "Whitefield",
                "pin_code": "560066",
                "venue_name": "Sheraton Grand Convention Hall",
                "venue_address": "Prestige Shantiniketan, Whitefield, Bengaluru",
                "status": EventStatus.SUBMITTED,
                "submitted_at": timezone.now() - timedelta(days=2),
            }
        )
        if cat_sound:
            ServiceRequirement.objects.get_or_create(
                event=ev2,
                category=cat_sound,
                title="Line Array Audio & Intelligent Stage Lighting",
                defaults={
                    "description": "Complete audio-visual setup for 500 pax with wireless digital lapels and stage wash.",
                    "budget_paise": 22000000,
                    "position": 1,
                }
            )

        # Event 3: Completed Birthday Party
        ev3, _ = Event.objects.get_or_create(
            customer=user_obj,
            name="Aarav's 1st Birthday Fiesta",
            defaults={
                "event_type": "Birthday",
                "description": "Intimate garden birthday gathering with kids entertainment and balloon styling.",
                "event_date": timezone.now().date() - timedelta(days=12),
                "start_time": time(16, 0),
                "end_time": time(20, 0),
                "guest_count": 80,
                "city": "Bengaluru",
                "state": "Karnataka",
                "locality": "Indiranagar",
                "pin_code": "560038",
                "venue_name": "The Courtyard Cafe",
                "venue_address": "100 Feet Rd, Indiranagar, Bengaluru",
                "status": EventStatus.CLOSED,
                "submitted_at": timezone.now() - timedelta(days=30),
                "closed_at": timezone.now() - timedelta(days=11),
            }
        )

        # 4. Customer Connections
        CustomerConnection.objects.get_or_create(
            customer=user_obj,
            provider=mgr,
            defaults={"notes": "Primary manager for upcoming wedding celebration"}
        )
        CustomerConnection.objects.get_or_create(
            customer=user_obj,
            provider=worker,
            defaults={"notes": "Photography and videography crew"}
        )
        CustomerConnection.objects.get_or_create(
            customer=user_obj,
            provider=demo_sound,
            defaults={"notes": "Shortlisted for TechNova gala audio"}
        )

        # 5. Conversations & Messages
        conv1, _ = Conversation.objects.get_or_create(
            customer=user_obj,
            provider=mgr,
            defaults={"event": ev1}
        )
        if not conv1.messages.exists():
            ChatMessage.objects.create(
                conversation=conv1,
                sender=mgr,
                content="Hello! We have reviewed your wedding requirements. Looking forward to orchestrating the menu tasting session.",
                created_at=timezone.now() - timedelta(hours=6)
            )
            ChatMessage.objects.create(
                conversation=conv1,
                sender=user_obj,
                content="Thanks! Could you please share the options for North Indian delicacies and live chaat counters?",
                created_at=timezone.now() - timedelta(hours=4)
            )
            ChatMessage.objects.create(
                conversation=conv1,
                sender=mgr,
                content="Certainly! We have updated the quotation with live dessert stations and royal mocktails included.",
                created_at=timezone.now() - timedelta(hours=1)
            )

        conv2, _ = Conversation.objects.get_or_create(
            customer=user_obj,
            provider=worker,
            defaults={"event": ev1}
        )
        if not conv2.messages.exists():
            ChatMessage.objects.create(
                conversation=conv2,
                sender=worker,
                content="Hi! We are excited to capture your special day. Do you have specific drone coverage preferences?",
                created_at=timezone.now() - timedelta(hours=5)
            )
            ChatMessage.objects.create(
                conversation=conv2,
                sender=user_obj,
                content="Yes, we would love 4K aerial shots of the venue entrance and the Sangeet celebrations!",
                created_at=timezone.now() - timedelta(hours=2)
            )

        # 6. Notifications
        Notification.objects.get_or_create(
            user=user_obj,
            title="Quotation Accepted",
            message=f"Royal Heritage Events confirmed for {ev1.name}.",
            notification_type="BOOKING",
            action_url="/app/bookings",
        )
        Notification.objects.get_or_create(
            user=user_obj,
            title="Payment Successful (Escrow)",
            message=f"₹1,28,000 paid securely for {ev1.name}. Funds are held safely in escrow.",
            notification_type="PAYMENT",
            action_url="/app/payments",
        )
        Notification.objects.get_or_create(
            user=user_obj,
            title="New Message from LensCraft Studios",
            message="Hi! We are excited to capture your special day. Do you have specific drone coverage preferences?",
            notification_type="MESSAGE",
            action_url="/app/network",
        )
        Notification.objects.get_or_create(
            user=user_obj,
            title="Quotation Received",
            message=f"SoundCraft Pro Audio submitted proposal for {ev2.name}.",
            notification_type="QUOTATION",
            action_url="/app/bookings",
        )

    print("Successfully seeded all ecosystem demo data!")

if __name__ == "__main__":
    seed()
