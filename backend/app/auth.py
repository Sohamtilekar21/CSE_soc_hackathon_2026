"""
Verifies Supabase-issued JWTs sent from the frontend.

The Next.js/React app authenticates users directly against Supabase
(sign up / sign in), gets back an access token, and sends it to FastAPI
as: Authorization: Bearer <access_token>

Supabase projects created from Oct 2025 onward sign tokens with an
asymmetric key (ES256) by default, verified via the project's JWKS
endpoint. Older projects (or ones that haven't rotated) may still use
the legacy shared-secret (HS256) signing key. This checks the token's
`alg` header and verifies accordingly, so it works either way.
"""

import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException, status
from pydantic import BaseModel

from app.config import settings

# Cached JWKS client - only used for asymmetric (ES256/RS256) tokens.
_jwks_client = PyJWKClient(
    f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
)


class CurrentUser(BaseModel):
    id: str
    email: str | None = None
    role: str | None = None


def get_current_user(authorization: str = Header(...)) -> CurrentUser:
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )

    token = authorization.removeprefix("Bearer ").strip()

    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Malformed token")

    alg = unverified_header.get("alg", "HS256")

    try:
        if alg == "HS256":
            # Legacy shared-secret projects
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        else:
            # New default: asymmetric keys (ES256), verified via JWKS
            signing_key = _jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                audience="authenticated",
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject claim")

    return CurrentUser(
        id=user_id,
        email=payload.get("email"),
        role=payload.get("role"),
    )
