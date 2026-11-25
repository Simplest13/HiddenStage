"""Delete seeded/QA demo accounts except an explicit keep list.

Used to clear the remaining demo customers (seeded demo users and ``@example.test``
QA accounts) that still show up in the administration user list.

    python scripts/purge_demo_accounts.py --keep amana@gmail.com --keep you@example.com
    python scripts/purge_demo_accounts.py --keep amana@gmail.com --apply
    python scripts/purge_demo_accounts.py --keep amana@gmail.com --with-history --apply

Dry run is the default: it prints exactly which accounts would be deleted.

Staff and superuser accounts are never touched. An account that still owns
protected commercial history (``Commitment.customer`` / ``Commitment.provider``
are ``PROTECT``) cannot be deleted; it is reported with the blocking models and
left in place.

``--with-history`` first removes that demo account's own commercial history
(commitments it is party to, then the events it owns) so the account itself can
go too. Only use it for seeded/QA accounts.
"""

import os
import sys

import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction  # noqa: E402
from django.db.models import ProtectedError, Q  # noqa: E402

from apps.accounts.models import User  # noqa: E402
from apps.commitments.models import Commitment  # noqa: E402
from apps.events.models import Event  # noqa: E402
from apps.quotations.models import QuotationRevision  # noqa: E402


def parse_keep() -> list[str]:
    keep: list[str] = []
    for index, arg in enumerate(sys.argv):
        if arg == '--keep' and index + 1 < len(sys.argv):
            keep.append(sys.argv[index + 1].strip().lower())
        elif arg.startswith('--keep='):
            keep.append(arg.split('=', 1)[1].strip().lower())
    return keep


def blocking_models(exc: ProtectedError) -> str:
    labels = sorted({obj._meta.label for obj in exc.protected_objects})
    return ', '.join(labels) if labels else 'unknown protected rows'


def purge_history(user) -> tuple[int, int]:
    """Delete the demo account's commitments and owned events. Returns counts.

    Submitted quotation revisions are protected from deletion by a database
    trigger, so the demo revisions are first reset to DRAFT (a lifecycle change
    the trigger allows); only demo rows reach this point.
    """
    revisions = QuotationRevision.objects.filter(
        Q(quotation__event__customer=user) | Q(quotation__provider=user)
    )
    revisions.update(status="DRAFT", submitted_at=None, superseded_at=None)

    commitments = Commitment.objects.filter(
        Q(customer=user) | Q(provider=user) | Q(event__customer=user)
    )
    commitment_count = commitments.count()
    commitments.delete()
    events = Event.objects.filter(customer=user)
    event_count = events.count()
    events.delete()
    return commitment_count, event_count


def main() -> int:
    keep = parse_keep()
    if not keep:
        print('Refusing to guess: pass --keep <email> (repeatable).')
        return 2

    targets = (
        User.objects.exclude(email__in=keep)
        .exclude(is_staff=True)
        .exclude(is_superuser=True)
        .order_by('date_joined')
    )
    rows = [(u.id, u.email, u.full_name, u.role, u.date_joined) for u in targets]

    print(f'Keep ({len(keep)}): {", ".join(keep)}')
    print(f'Accounts to delete: {len(rows)}')
    for _uid, email, full_name, role, joined in rows:
        print(f'  - {email:<58} {role:<9} {joined:%Y-%m-%d} {full_name}')

    if '--apply' not in sys.argv:
        print('\nDry run. Re-run with --apply to delete these accounts.')
        return 0

    with_history = '--with-history' in sys.argv
    removed: list[str] = []
    retained: list[tuple[str, str]] = []
    for uid, email in [(row[0], row[1]) for row in rows]:
        try:
            with transaction.atomic():
                if with_history:
                    user = User.objects.get(id=uid)
                    commitments, events = purge_history(user)
                    if commitments or events:
                        print(f'  history: {email} -> {commitments} commitment(s), {events} event(s)')
                User.objects.filter(id=uid).delete()
            removed.append(email)
        except ProtectedError as exc:
            retained.append((email, blocking_models(exc)))
        except Exception as exc:  # noqa: BLE001 - report instead of half-deleting
            retained.append((email, f'{type(exc).__name__}: {exc}'))

    print(f'\nDeleted {len(removed)} demo account(s).')
    if retained:
        print(f'Retained {len(retained)} account(s) because deletion was blocked:')
        for email, reason in retained:
            print(f'  ! {email:<58} {reason}')

    remaining = User.objects.order_by('date_joined')
    print(f'\nAccounts remaining: {remaining.count()}')
    for user in remaining:
        print(f'  kept: {user.email:<58} {user.role:<9} staff={user.is_staff}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
