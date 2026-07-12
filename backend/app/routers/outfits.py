from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel

from app.auth import get_current_user, CurrentUser
from app.supabase_client import supabase
from app.config import settings
from app.claude_client import match_outfit_items, build_outfit

router = APIRouter(prefix="/outfits", tags=["outfits"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
SIGNED_URL_TTL = 60 * 60  # 1 hour


@router.post("")
async def create_outfit(
    file: UploadFile,
    current_user: CurrentUser = Depends(get_current_user),
):
    """OOTD upload: identify which wardrobe items are worn in the photo."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    image_bytes = await file.read()
    storage_path = f"{current_user.id}/outfits/{file.filename}"

    try:
        supabase.storage.from_(settings.supabase_storage_bucket).upload(
            storage_path,
            image_bytes,
            file_options={"content-type": file.content_type},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {exc}")

    try:
        wardrobe = (
            supabase.table("classifications")
            .select("id, label, type, colour")
            .eq("user_id", current_user.id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not fetch wardrobe: {exc}")

    wardrobe_items = wardrobe.data or []

    matched_ids: list[str] = []
    if wardrobe_items:
        try:
            match_result = match_outfit_items(image_bytes, file.content_type, wardrobe_items)
            matched_ids = match_result.get("item_ids", [])
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Outfit matching failed: {exc}")

    try:
        outfit_result = (
            supabase.table("outfits")
            .insert({"user_id": current_user.id, "image_path": storage_path, "source": "upload"})
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not save outfit: {exc}")

    outfit_id = outfit_result.data[0]["id"]

    if matched_ids:
        rows = [{"outfit_id": outfit_id, "classification_id": item_id} for item_id in matched_ids]
        supabase.table("outfit_items").insert(rows).execute()

        supabase.table("classifications").update(
            {"last_used": datetime.now(timezone.utc).isoformat()}
        ).in_("id", matched_ids).execute()

    matched_details = [item for item in wardrobe_items if item["id"] in matched_ids]

    return {
        "outfit_id": outfit_id,
        "image_path": storage_path,
        "items": matched_details,
    }


class BuildOutfitRequest(BaseModel):
    prompt: str


@router.post("/build")
async def build_outfit_route(
    body: BuildOutfitRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        wardrobe = (
            supabase.table("classifications")
            .select("id, label, type, colour, image_path")
            .eq("user_id", current_user.id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not fetch wardrobe: {exc}")

    wardrobe_items = wardrobe.data or []
    if not wardrobe_items:
        raise HTTPException(status_code=400, detail="Your wardrobe is empty — add items first")

    try:
        result = build_outfit(body.prompt, wardrobe_items)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Outfit generation failed: {exc}")

    selected_ids = result.get("item_ids", [])
    styling_note = result.get("styling_note", "")

    try:
        outfit_result = (
            supabase.table("outfits")
            .insert(
                {
                    "user_id": current_user.id,
                    "image_path": None,
                    "source": "generated",
                    "prompt": body.prompt,
                }
            )
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not save outfit: {exc}")

    outfit_id = outfit_result.data[0]["id"]

    if selected_ids:
        rows = [{"outfit_id": outfit_id, "classification_id": item_id} for item_id in selected_ids]
        supabase.table("outfit_items").insert(rows).execute()

    # last_used is intentionally NOT updated here - being suggested by the
    # AI isn't the same as being worn. Only the OOTD upload flow above
    # represents confirmed real-world wear.

    selected_details = [item for item in wardrobe_items if item["id"] in selected_ids]

    return {
        "outfit_id": outfit_id,
        "styling_note": styling_note,
        "items": selected_details,
    }


@router.get("")
async def list_outfits(current_user: CurrentUser = Depends(get_current_user)):
    try:
        result = (
            supabase.table("outfits")
            .select(
                "id, image_path, source, prompt, created_at, "
                "outfit_items(classifications(id, label, type, colour, image_path))"
            )
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not fetch outfits: {exc}")

    items = result.data or []

    for outfit in items:
        if outfit["image_path"]:
            try:
                signed = supabase.storage.from_(settings.supabase_storage_bucket).create_signed_url(
                    outfit["image_path"], SIGNED_URL_TTL
                )
                outfit["image_url"] = signed.get("signedURL") or signed.get("signedUrl")
            except Exception:
                outfit["image_url"] = None
        else:
            outfit["image_url"] = None

    return {"items": items}
