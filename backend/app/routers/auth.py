"""
Optional: proxy auth endpoints through FastAPI.

In most setups the Next.js/React frontend talks to Supabase Auth directly
using the anon key (simpler, fewer hops). This router is provided in case
you'd rather keep all auth traffic behind your own API - e.g. to add
extra validation, logging, or rate limiting on signup/login.

Uses the anon key (not the service_role key) so normal Supabase auth
rules apply.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from supabase import create_client

from app.config import settings
from app.auth import get_current_user, CurrentUser

router = APIRouter(prefix="/auth", tags=["auth"])

# Separate client using the anon key, mirroring what the frontend would use.
supabase_anon = create_client(settings.supabase_url, settings.supabase_anon_key)


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    user_id: str
    email: str | None = None


@router.post("/signup", response_model=TokenResponse)
def sign_up(payload: SignUpRequest):
    try:
        result = supabase_anon.auth.sign_up(
            {"email": payload.email, "password": payload.password}
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not result.session:
        # Email confirmation may be required depending on your Supabase auth settings
        raise HTTPException(
            status_code=200,
            detail="Sign up successful. Please check your email to confirm your account.",
        )

    return TokenResponse(
        access_token=result.session.access_token,
        refresh_token=result.session.refresh_token,
        user_id=result.user.id,
        email=result.user.email,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    try:
        result = supabase_anon.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return TokenResponse(
        access_token=result.session.access_token,
        refresh_token=result.session.refresh_token,
        user_id=result.user.id,
        email=result.user.email,
    )


@router.post("/logout")
def logout(current_user: CurrentUser = Depends(get_current_user)):
    # With Supabase, logout is typically handled client-side by discarding
    # the session/token. This endpoint is a placeholder if you want to
    # track logout events or invalidate server-side state.
    return {"message": "Logged out", "user_id": current_user.id}


@router.get("/me", response_model=CurrentUser)
def get_me(current_user: CurrentUser = Depends(get_current_user)):
    return current_user
