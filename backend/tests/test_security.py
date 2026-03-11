"""
Pure logic tests for security/crypto utility functions.

No database, no Redis, no async.
Tests password hashing, license key generation, device password
encryption/decryption, and JWT token creation/decoding.
"""

import os
import re
import time
from unittest.mock import patch

import pytest

# A valid Fernet key is required for encrypt/decrypt tests.
from cryptography.fernet import Fernet

_TEST_FERNET_KEY = Fernet.generate_key().decode()

# Force valid Fernet key into env before settings may load
os.environ["DEVICE_ENCRYPTION_KEY"] = _TEST_FERNET_KEY
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-ci")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")
os.environ.setdefault("ENVIRONMENT", "development")

from app.utils.security import (
    hash_password,
    verify_password,
    generate_license_key,
    generate_device_password,
    encrypt_device_password,
    decrypt_device_password,
    create_access_token,
    decode_token,
)
from app.config import settings

# The settings singleton may have been created with an invalid key by conftest.
# Patch it to use our valid Fernet key.
settings.DEVICE_ENCRYPTION_KEY = _TEST_FERNET_KEY


# ============================================================================
# hash_password + verify_password
# ============================================================================

class TestPasswordHashing:
    """Tests for hash_password and verify_password round-trip."""

    def test_round_trip(self):
        password = "my_secret_password_123"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True

    def test_wrong_password_fails(self):
        password = "correct_password"
        hashed = hash_password(password)
        assert verify_password("wrong_password", hashed) is False

    def test_hash_is_not_plain_text(self):
        password = "plain_text"
        hashed = hash_password(password)
        assert hashed != password
        assert len(hashed) > len(password)

    def test_same_password_produces_different_hashes(self):
        """bcrypt should produce different hashes due to random salt."""
        password = "same_password"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        assert hash1 != hash2
        # Both should still verify
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True

    def test_empty_password(self):
        password = ""
        hashed = hash_password(password)
        assert verify_password("", hashed) is True
        assert verify_password("not_empty", hashed) is False

    def test_unicode_password(self):
        password = "p@ssw0rd_with_unicode_\u00e9\u00e8\u00ea"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True


# ============================================================================
# generate_license_key
# ============================================================================

class TestGenerateLicenseKey:
    """Tests for generate_license_key."""

    def test_format_matches_pattern(self):
        key = generate_license_key()
        pattern = r"^LIC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$"
        assert re.match(pattern, key), f"Key '{key}' does not match expected pattern"

    def test_starts_with_lic(self):
        key = generate_license_key()
        assert key.startswith("LIC-")

    def test_correct_length(self):
        key = generate_license_key()
        # LIC- + 4 + - + 4 + - + 4 = 4 + 4 + 1 + 4 + 1 + 4 = 18
        assert len(key) == 18

    def test_100_calls_produce_unique_keys(self):
        keys = {generate_license_key() for _ in range(100)}
        assert len(keys) == 100, f"Expected 100 unique keys, got {len(keys)}"

    def test_only_uppercase_and_digits_in_parts(self):
        key = generate_license_key()
        parts = key.split("-")
        assert parts[0] == "LIC"
        for part in parts[1:]:
            assert re.match(r"^[A-Z0-9]{4}$", part), f"Part '{part}' has invalid chars"


# ============================================================================
# generate_device_password
# ============================================================================

class TestGenerateDevicePassword:
    """Tests for generate_device_password."""

    def test_length_32(self):
        pw = generate_device_password()
        assert len(pw) == 32

    def test_alphanumeric(self):
        pw = generate_device_password()
        assert re.match(r"^[A-Za-z0-9]{32}$", pw), f"Password '{pw}' is not alphanumeric"

    def test_unique_passwords(self):
        passwords = {generate_device_password() for _ in range(50)}
        assert len(passwords) == 50

    def test_contains_mix_of_chars(self):
        """Over 50 passwords, we expect to see both letters and digits."""
        all_chars = "".join(generate_device_password() for _ in range(10))
        has_letters = any(c.isalpha() for c in all_chars)
        has_digits = any(c.isdigit() for c in all_chars)
        assert has_letters, "Expected some letters in generated passwords"
        assert has_digits, "Expected some digits in generated passwords"


# ============================================================================
# encrypt_device_password + decrypt_device_password
# ============================================================================

class TestDevicePasswordEncryption:
    """Tests for encrypt_device_password and decrypt_device_password round-trip."""

    def test_round_trip(self):
        plain = "my_device_password_abc123"
        encrypted = encrypt_device_password(plain)
        decrypted = decrypt_device_password(encrypted)
        assert decrypted == plain

    def test_encrypted_differs_from_plain(self):
        plain = "test_password"
        encrypted = encrypt_device_password(plain)
        assert encrypted != plain

    def test_different_encryptions_of_same_value_differ(self):
        """Fernet includes a timestamp, so encryptions of the same value differ."""
        plain = "same_value"
        enc1 = encrypt_device_password(plain)
        enc2 = encrypt_device_password(plain)
        assert enc1 != enc2
        # Both should decrypt to the same value
        assert decrypt_device_password(enc1) == plain
        assert decrypt_device_password(enc2) == plain

    def test_empty_string_round_trip(self):
        plain = ""
        encrypted = encrypt_device_password(plain)
        assert decrypt_device_password(encrypted) == ""

    def test_long_password_round_trip(self):
        plain = "a" * 1000
        encrypted = encrypt_device_password(plain)
        assert decrypt_device_password(encrypted) == plain


# ============================================================================
# create_access_token + decode_token
# ============================================================================

class TestJWTTokens:
    """Tests for create_access_token and decode_token."""

    def test_valid_token_decodes_correctly(self):
        data = {"sub": "42", "role": "ADMIN"}
        token = create_access_token(data)
        payload = decode_token(token)
        assert payload["sub"] == "42"
        assert payload["role"] == "ADMIN"

    def test_token_contains_exp_and_type(self):
        data = {"sub": "1"}
        token = create_access_token(data)
        payload = decode_token(token)
        assert "exp" in payload
        assert payload["type"] == "access"

    def test_token_preserves_all_data_fields(self):
        data = {"sub": "99", "role": "VIEWER", "custom": "extra_field"}
        token = create_access_token(data)
        payload = decode_token(token)
        assert payload["sub"] == "99"
        assert payload["role"] == "VIEWER"
        assert payload["custom"] == "extra_field"

    def test_expired_token_raises(self):
        """Manually craft a token with past expiry, decode should raise."""
        from datetime import datetime, timedelta, timezone
        from jose import jwt

        expired_data = {
            "sub": "1",
            "role": "ADMIN",
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
            "type": "access",
        }
        token = jwt.encode(
            expired_data, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
        )
        with pytest.raises(ValueError, match="Invalid or expired token"):
            decode_token(token)

    def test_tampered_token_raises(self):
        data = {"sub": "1", "role": "ADMIN"}
        token = create_access_token(data)
        # Tamper with the token by flipping a character in the payload
        parts = token.split(".")
        tampered_payload = parts[1][:-1] + ("A" if parts[1][-1] != "A" else "B")
        tampered_token = f"{parts[0]}.{tampered_payload}.{parts[2]}"
        with pytest.raises(ValueError, match="Invalid or expired token"):
            decode_token(tampered_token)

    def test_completely_invalid_token_raises(self):
        with pytest.raises(ValueError, match="Invalid or expired token"):
            decode_token("not.a.valid.token")

    def test_original_data_dict_not_mutated(self):
        """create_access_token should not mutate the input dict."""
        data = {"sub": "5", "role": "OPERATOR"}
        data_copy = data.copy()
        create_access_token(data)
        assert data == data_copy
