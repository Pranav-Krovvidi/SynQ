"""
app.core.security — password hashing and JWT utilities.

Never import settings at module level in tests; everything is read lazily
through the functions so test overrides work correctly.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    """Return a bcrypt hash of *plain*."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches *hashed*."""
    return _pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(subject: str, extra_claims: dict | None = None) -> str:
    """
    Create a signed JWT.

    Parameters
    ----------
    subject:
        Typically the user's UUID as a string.
    extra_claims:
        Optional dict merged into the payload (e.g. {"role": "admin"}).
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(hours=settings.jwt_expire_hours)
    payload: dict = {
        "sub": subject,
        "iat": now,
        "exp": expire,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """
    Decode and verify *token*.

    Raises
    ------
    jose.JWTError
        If the token is invalid, expired, or has a bad signature.
    """
    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
    )


def extract_subject(token: str) -> str:
    """Return the ``sub`` claim or raise JWTError."""
    payload = decode_access_token(token)
    sub = payload.get("sub")
    if sub is None:
        raise JWTError("Token missing 'sub' claim")
    return str(sub)
