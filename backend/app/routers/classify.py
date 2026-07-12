from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.auth import get_current_user, CurrentUser
from app.supabase_client import supabase
from app.config import settings
from app.claude_client import classify_clothing_item

router = APIRouter(prefix="/classify", tags=["classify"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("")
async def classify_image(
    file: UploadFile,
    current_user: CurrentUser = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    image_bytes = await file.read()

    try:
        classification = classify_clothing_item(image_bytes, file.content_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Classification failed: {exc}")

    label = classification.get("label", "unknown")
    item_type = classification.get("type", "unknown")
    colour = classification.get("colour", "unknown")

    storage_path = f"{current_user.id}/{file.filename}"

    try:
        supabase.storage.from_(settings.supabase_storage_bucket).upload(
            storage_path,
            image_bytes,
            file_options={"content-type": file.content_type},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {exc}")

    try:
        supabase.table("classifications").insert(
            {
                "user_id": current_user.id,
                "image_path": storage_path,
                "label": label,
                "type": item_type,
                "colour": colour,
            }
        ).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database insert failed: {exc}")

    return {
        "label": label,
        "type": item_type,
        "colour": colour,
        "image_path": storage_path,
    }


@router.get("/history")
def get_history(current_user: CurrentUser = Depends(get_current_user)):
    result = (
        supabase.table("classifications")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data
