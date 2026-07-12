"""
Claude-backed helpers for clothing classification and outfit assembly.

Three entry points, each wrapping a single Messages API call:

- classify_clothing_item: identify a single uploaded clothing photo
  (label/type/colour) - used by the /classify route.
- match_outfit_items: given an outfit photo and the user's existing
  wardrobe, figure out which wardrobe items are being worn - used by
  the OOTD upload route.
- build_outfit: given a text prompt and the user's wardrobe, select a
  coherent outfit - used by the /outfits/build route.
"""

import base64
import json

import anthropic

from app.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
MODEL = "claude-sonnet-4-5"


def _parse_json_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
        if text.endswith("```"):
            text = text[: -len("```")]
    return json.loads(text.strip())


def _image_block(image_bytes: bytes, media_type: str) -> dict:
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": media_type,
            "data": base64.standard_b64encode(image_bytes).decode("utf-8"),
        },
    }


def classify_clothing_item(image_bytes: bytes, media_type: str) -> dict:
    """
    Identify a single clothing item from a photo.
    Returns {"label": string, "type": string, "colour": string}
    """
    response = client.messages.create(
        model=MODEL,
        max_tokens=300,
        system=(
            "You are a clothing classification assistant. Given a photo of a "
            "single clothing item, identify it. Respond with ONLY a JSON "
            "object, no other text, no markdown fences. Format: "
            '{"label": string, "type": string, "colour": string}. '
            '"label" is a short descriptive name (e.g. "blue denim jacket"). '
            '"type" is a general category (e.g. "jacket", "t-shirt", "jeans", '
            '"shoes"). "colour" is the dominant colour.'
        ),
        messages=[
            {
                "role": "user",
                "content": [
                    _image_block(image_bytes, media_type),
                    {"type": "text", "text": "Identify this clothing item."},
                ],
            }
        ],
    )
    return _parse_json_response(response.content[0].text)


def match_outfit_items(
    image_bytes: bytes, media_type: str, wardrobe_items: list[dict]
) -> dict:
    """
    wardrobe_items: [{"id": ..., "label": ..., "type": ..., "colour": ...}, ...]
    Identify which wardrobe items are being worn in the given outfit photo.
    Returns {"item_ids": [...]}
    """
    item_list_text = "\n".join(
        f'- id: {item["id"]}, label: {item["label"]}, type: {item["type"]}, colour: {item["colour"]}'
        for item in wardrobe_items
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=500,
        system=(
            "You are a styling assistant. You are given a photo of an outfit "
            "someone is wearing, and a list of their wardrobe items (id, "
            "label, type, colour). Identify which wardrobe items from the "
            "list are being worn in the photo. Only match items that are "
            "clearly visible in the photo - do not guess or invent items "
            "outside the provided list. Respond with ONLY a JSON object, no "
            'other text, no markdown fences. Format: {"item_ids": [string, '
            '...]}. If none of the wardrobe items match, return '
            '{"item_ids": []}.'
        ),
        messages=[
            {
                "role": "user",
                "content": [
                    _image_block(image_bytes, media_type),
                    {
                        "type": "text",
                        "text": (
                            f"Wardrobe:\n{item_list_text}\n\n"
                            "Which of these items am I wearing in this photo?"
                        ),
                    },
                ],
            }
        ],
    )
    return _parse_json_response(response.content[0].text)


def build_outfit(prompt: str, wardrobe_items: list[dict]) -> dict:
    """
    wardrobe_items: [{"id": ..., "label": ..., "type": ..., "colour": ...}, ...]
    Returns {"item_ids": [...], "styling_note": str}
    """
    item_list_text = "\n".join(
        f'- id: {item["id"]}, label: {item["label"]}, type: {item["type"]}, colour: {item["colour"]}'
        for item in wardrobe_items
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=500,
        system=(
            "You are a styling assistant. You are given a person's wardrobe "
            "(id, label, type, colour) and a request describing an occasion or vibe. "
            "Select a coherent outfit using ONLY items from the provided wardrobe — "
            "do not invent items. Respond with ONLY a JSON object, no other text, "
            "no markdown fences. Format: "
            '{"item_ids": [string, ...], "styling_note": string}. '
            '"styling_note" is one short sentence explaining the choice. '
            "If nothing in the wardrobe reasonably fits the request, return "
            '{"item_ids": [], "styling_note": "explanation of why nothing fits"}.'
        ),
        messages=[
            {
                "role": "user",
                "content": (
                    f"Wardrobe:\n{item_list_text}\n\n"
                    f"Request: {prompt}"
                ),
            }
        ],
    )
    return _parse_json_response(response.content[0].text)
