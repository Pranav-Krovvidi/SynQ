"""
app.api.deps — FastAPI dependency functions.

Provides:
  - get_current_user  : validates the Bearer JWT and returns the User ORM row
  - require_role      : factory that raises 403 if the user lacks the required role
"""

from __future__ import annotations

from typing import Annotated

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db import get_db
from app.models.user import User

_bearer = HTTPBearer(auto_error=True)

# Role hierarchy — each role can do everything below it
_ROLE_RANK: dict[str, int] = {
    "viewer": 0,
    "contributor": 1,
    "admin": 2,
}


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Validate the Bearer JWT and return the authenticated User.

    Raises HTTP 401 if the token is missing, invalid, or the user does not exist.
    Raises HTTP 403 if the user account is inactive.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    return user


def require_role(minimum_role: str):
    """
    Dependency factory — raises HTTP 403 if the current user's role is below
    *minimum_role* in the hierarchy  (viewer < contributor < admin).

    Usage::

        @router.delete("/{id}", dependencies=[Depends(require_role("admin"))])
    """

    async def _check(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if _ROLE_RANK.get(current_user.role, -1) < _ROLE_RANK.get(minimum_role, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{minimum_role}' or above is required",
            )
        return current_user

    return _check


# Convenience aliases
CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_role("admin"))]
ContributorUser = Annotated[User, Depends(require_role("contributor"))]
