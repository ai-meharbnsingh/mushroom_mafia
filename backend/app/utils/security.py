import secrets
import string
from datetime import datetime, timedelta, timezone

import bcrypt
from cryptography.fernet import Fernet
from jose import JWTError, jwt

from app.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise ValueError("Invalid or expired token")


# --- Device crypto utilities ---


def generate_license_key() -> str:
    """Generate a license key in format LIC-XXXX-YYYY-ZZZZ."""
    chars = string.ascii_uppercase + string.digits
    part1 = "".join(secrets.choice(chars) for _ in range(4))
    part2 = "".join(secrets.choice(chars) for _ in range(4))
    part3 = "".join(secrets.choice(chars) for _ in range(4))
    return f"LIC-{part1}-{part2}-{part3}"


def generate_device_password() -> str:
    """Generate a random 32-char device password."""
    chars = string.ascii_letters + string.digits
    return "".join(secrets.choice(chars) for _ in range(32))


def _get_fernet() -> Fernet:
    return Fernet(settings.DEVICE_ENCRYPTION_KEY.encode())


def encrypt_device_password(plain_password: str) -> str:
    """Encrypt a device password with AES-256 (Fernet)."""
    return _get_fernet().encrypt(plain_password.encode()).decode()


def decrypt_device_password(encrypted_password: str) -> str:
    """Decrypt a device password."""
    return _get_fernet().decrypt(encrypted_password.encode()).decode()
