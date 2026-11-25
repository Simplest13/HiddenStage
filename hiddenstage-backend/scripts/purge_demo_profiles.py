"""Delete provider profiles (and their login accounts) except an explicit keep list.

Used to clear seeded/QA providers from the public directory before manual
category-by-category testing.

    python scripts/purge_demo_profiles.py --keep amana@gmail.com
    python scripts/purge_demo_profiles.py --keep amana@gmail.com --apply

Dry run is the default: it prints exactly what would be deleted.

Profiles are deleted first, so the public directory is clean even when a demo
provider account still owns protected commercial history (Commitment.provider is
PROTECT). Accounts that can be removed without touching protected rows are then
deleted; the rest are reported and left in place.
"""

import os
import sys

import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction  # noqa: E402
from django.db.models import ProtectedError  # noqa: E402

from apps.accounts.models import User  # noqa: E402
from apps.profiles.models import ProviderProfile  # noqa: E402


def parse_keep() -> list[str]:
    keep: list[str] = []
    for index, arg in enumerate(sys.argv):
        if arg == '--keep' and index + 1 < len(sys.argv):
            keep.append(sys.argv[index + 1].strip().lower())
        elif arg.startswith('--keep='):
            keep.append(arg.split('=', 1)[1].strip().lower())
    return keep


def main() -> int:
    keep = parse_keep()
    if not keep:
        print('Refusing to guess: pass --keep <email> (repeatable).')
        return 2

    profiles = (
        ProviderProfile.objects.select_related('user')
        .exclude(user__email__in=keep)
        .order_by('created_at')
    )
    rows = [(p.id, p.user_id, p.user.email, p.display_name, p.kind) for p in profiles]

    print(f'Keep ({len(keep)}): {", ".join(keep)}')
    print(f'Provider profiles to delete: {len(rows)}')
    for _pid, _uid, email, display_name, kind in rows:
        print(f'  - {email:<55} {kind:<32} {display_name}')

    if '--apply' not in sys.argv:
        print('\nDry run. Re-run with --apply to delete these profiles and accounts.')
        return 0

    profile_ids = [row[0] for row in rows]
    user_ids = [row[1] for row in rows]

    try:
        with transaction.atomic():
            deleted_rows, _ = ProviderProfile.objects.filter(id__in=profile_ids).delete()
    except Exception as exc:  # noqa: BLE001 - report instead of half-deleting
        print(f'\nProfile deletion refused: {type(exc).__name__}: {exc}')
        return 1
    print(f'\nDeleted {deleted_rows} rows across {len(profile_ids)} provider profiles.')

    removed_accounts: list[str] = []
    retained_accounts: list[tuple[str, str]] = []
    for uid, email in [(row[1], row[2]) for row in rows]:
        try:
            with transaction.atomic():
                User.objects.filter(id=uid).delete()
            removed_accounts.append(email)
        except ProtectedError:
            retained_accounts.append((email, 'protected commercial history'))
        except Exception as exc:  # noqa: BLE001
            retained_accounts.append((email, f'{type(exc).__name__}: {exc}'))

    print(f'Deleted {len(removed_accounts)} provider login accounts.')
    if retained_accounts:
        print(f'Retained {len(retained_accounts)} account(s) because deletion was protected:')
        for email, reason in retained_accounts:
            print(f'  ! {email:<55} {reason}')

    remaining = ProviderProfile.objects.select_related('user').order_by('created_at')
    print(f'\nProvider profiles remaining: {remaining.count()}')
    for profile in remaining:
        print(f'  kept: {profile.user.email:<45} {profile.kind:<32} {profile.display_name}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
