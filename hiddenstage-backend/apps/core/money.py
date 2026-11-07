"""Money helpers.

All amounts crossing the API boundary are integer paise. These helpers exist for
seeding, tests and display formatting; they never introduce floats into stored
values.
"""

from decimal import Decimal, InvalidOperation


def rupees_to_paise(amount) -> int:
    """Convert a rupee amount (str/Decimal/int) to integer paise exactly."""
    try:
        value = Decimal(str(amount))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError("Amount must be a valid decimal number.") from exc
    hundredths = value * 100
    if hundredths != hundredths.to_integral_value():
        raise ValueError("Rupee amounts with fractions of a paisa are not supported.")
    return int(hundredths)


def paise_to_rupees(paise: int) -> Decimal:
    return (Decimal(paise) / Decimal(100)).quantize(Decimal("0.01"))


def format_paise(paise: int) -> str:
    """Indian-format currency string for emails and receipts."""
    rupees, remainder = divmod(int(paise), 100)
    whole = str(rupees)
    if len(whole) > 3:
        head, tail = whole[:-3], whole[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        whole = ",".join(groups) + "," + tail
    return f"INR {whole}.{remainder:02d}"
