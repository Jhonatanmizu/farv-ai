from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.security import decode_access_token
from app.domain.models.user import User

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    auth: HTTPAuthorizationCredentials | None = Security(security_scheme),
    db: AsyncSession = Depends(get_db_session),
) -> User | None:
    """Returns the authenticated user if a valid bearer token is present, else None."""
    if not auth or not auth.credentials:
        return None

    payload = decode_access_token(auth.credentials)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user = await db.get(User, user_id)
    return user


async def get_current_user(
    user: User | None = Depends(get_current_user_optional),
) -> User:
    """Requires an authenticated user or raises HTTP 401."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária. Faça login para continuar.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
