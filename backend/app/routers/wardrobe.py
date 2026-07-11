from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user, CurrentUser
from app.supabase_client import supabase
from app.config import settings
from app.models.classifier import run_inference

router = APIRouter(prefix="/wardrobe", tags=["wardrobe"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

SIGNED_URL_EXPIRATION = 60 * 60 # 1 hour

@router.get("")
async def get_wardrobe(
        current_user: CurrentUser = Depends(get_current_user)
):
    try:
        result = (
            supabase.table("classifications")
            .select("id, image_path, label, confidence, created_at")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not fetch wardrobe: {exc}")

    items = result.data or []

    for item in items:
        try:
            signed = supabase.storage.from_(settings.supabase_storage_bucket
            ).create_signed_url(item["image_path"], SIGNED_URL_EXPIRATION)
            print("Signed url:", signed)
            item["image_url"] = signed.get("signedURL") or signed.get("signedUrl")
        except Exception as exc:
            print("signed url error:", exc)
            item["image_url"] = None
    
    return {"items": items}
