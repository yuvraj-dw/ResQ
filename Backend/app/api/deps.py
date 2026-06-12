from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.database import get_database
from app.core.security import verify_access_token
from app.repositories.repositories import UserRepo


security = HTTPBearer()


async def get_db():
    return get_database()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    phone = payload.get("sub")
    user_repo = UserRepo()
    user = await user_repo.get_by_phone(phone)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    if not credentials:
        return None
    try:
        payload = verify_access_token(credentials.credentials)
        if not payload:
            return None
        phone = payload.get("sub")
        user_repo = UserRepo()
        user = await user_repo.get_by_phone(phone)
        return user
    except Exception:
        return None