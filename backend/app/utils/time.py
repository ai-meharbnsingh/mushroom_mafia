from datetime import datetime, timezone


def utcnow_naive() -> datetime:
    """Return current UTC time as a naive datetime.

    Use this for all DB writes to TIMESTAMP WITHOUT TIME ZONE columns.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
