# Implementation Plan: Outfit of the Day + Build an Outfit

## Goal

Two features on top of the existing wardrobe system:

1. **Outfit of the Day (OOTD)** — user uploads a photo of their outfit. Claude
   identifies which wardrobe items are being worn, links them to a new
   `outfits` row, and marks those wardrobe items as recently used.
2. **Build an Outfit** — user types a prompt (e.g. "casual outfit for a rainy
   day"). Claude selects items from their existing wardrobe that fit the
   prompt and returns a suggested outfit. This does **not** mark items as
   used — a suggestion isn't confirmation the person actually wore it.

Both features reuse the same `outfits` / `outfit_items` tables, distinguished
by a `source` column (`upload` vs `generated`).

---

## 1. Database migration — STATUS: ALREADY RUN

This has already been executed directly in the Supabase SQL editor (not by
Claude Code). **Do not re-run this section.** It's included here only so the
current schema state is documented and reviewable.

Starting point: `classifications` was the only table, and already had RLS
enabled with `select`/`insert`/`delete` policies from earlier work (the
`update` policy was added as part of this migration, since it's required for
the `last_used` write in section 3a below).

```sql
-- classifications: new columns
alter table classifications
  add column if not exists type text,
  add column if not exists colour text,
  add column if not exists last_used timestamptz;

alter table classifications
  drop column if exists confidence;

-- classifications: RLS update policy (select/insert/delete already existed)
create policy "Users can update their own classifications"
  on classifications for update
  using (auth.uid() = user_id);

-- outfits: new table, supports both photo-based and text-generated outfits
create table outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  image_path text,
  source text not null default 'upload' check (source in ('upload', 'generated')),
  prompt text,
  created_at timestamptz not null default now()
);

-- outfit_items: link table, no score/confidence stored
create table outfit_items (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references outfits(id) on delete cascade,
  classification_id uuid not null references classifications(id) on delete cascade
);

-- RLS on outfits
alter table outfits enable row level security;

create policy "Users can view their own outfits"
  on outfits for select
  using (auth.uid() = user_id);

create policy "Users can insert their own outfits"
  on outfits for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own outfits"
  on outfits for delete
  using (auth.uid() = user_id);

-- RLS on outfit_items (checked via parent outfit's user_id, since
-- outfit_items has no user_id column of its own)
alter table outfit_items enable row level security;

create policy "Users can view their own outfit items"
  on outfit_items for select
  using (
    exists (
      select 1 from outfits
      where outfits.id = outfit_items.outfit_id
      and outfits.user_id = auth.uid()
    )
  );

create policy "Users can insert their own outfit items"
  on outfit_items for insert
  with check (
    exists (
      select 1 from outfits
      where outfits.id = outfit_items.outfit_id
      and outfits.user_id = auth.uid()
    )
  );

create policy "Users can delete their own outfit items"
  on outfit_items for delete
  using (
    exists (
      select 1 from outfits
      where outfits.id = outfit_items.outfit_id
      and outfits.user_id = auth.uid()
    )
  );
```

Notes:
- `image_path` is nullable on `outfits` because a `generated` outfit has no
  uploaded photo — it's just a list of existing item ids plus a styling note.
- `prompt` is nullable, only populated for `generated` outfits (stores what
  the user typed, useful for displaying "outfit for: rainy day" later).
- **RLS caveat:** if `app/supabase_client.py` initializes the Supabase client
  with the **service role key**, RLS is bypassed for all backend queries by
  design — the `.eq("user_id", current_user.id)` filters already in the
  route code remain the actual enforcement for backend requests. RLS still
  matters as a safety net against direct/misconfigured frontend access. If
  the client uses the **anon key** instead, RLS is load-bearing and the
  `update` policy above is what makes `last_used` actually persist — verify
  which key is in use before assuming writes will succeed.
- No `similarity`/`confidence` column on `outfit_items` — per earlier
  decision, we don't store match scores, just the link itself.

---

## 2. `app/claude_client.py` — add a build-outfit function

Keep the two existing functions (`classify_clothing_item`,
`match_outfit_items`) as-is. Add a third:

```python
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
```

Reuses the existing `_parse_json_response` helper already in this file.

---

## 3. `app/routers/outfits.py` — update existing route, add new one

### 3a. Update `create_outfit` (existing OOTD upload route)

After matching succeeds and `outfit_items` rows are inserted, add a step to
stamp `last_used` on every matched wardrobe item:

```python
from datetime import datetime, timezone

# ... after inserting outfit_items rows ...

if matched_ids:
    supabase.table("classifications").update(
        {"last_used": datetime.now(timezone.utc).isoformat()}
    ).in_("id", matched_ids).execute()
```

Also set `source: "upload"` explicitly on the outfit insert (matches the
column default, but explicit is clearer):

```python
outfit_result = (
    supabase.table("outfits")
    .insert({"user_id": current_user.id, "image_path": storage_path, "source": "upload"})
    .execute()
)
```

### 3b. New route: `POST /outfits/build`

```python
from pydantic import BaseModel
from app.claude_client import build_outfit


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

    # NOTE: last_used is intentionally NOT updated here — see design note below.

    selected_details = [item for item in wardrobe_items if item["id"] in selected_ids]

    return {
        "outfit_id": outfit_id,
        "styling_note": styling_note,
        "items": selected_details,
    }
```

**Design note on `last_used`:** this route deliberately does not touch
`last_used`. Being suggested by the AI isn't the same as being worn. Only the
OOTD photo-upload flow (3a) represents confirmed real-world wear, so only
that flow updates `last_used`. If this product decision should change later,
it's a one-line addition here.

### 3c. Update `list_outfits` to include `source` and `prompt`

```python
.select(
    "id, image_path, source, prompt, created_at, "
    "outfit_items(classifications(id, label, type, colour, image_path))"
)
```

And guard the signed-URL step, since `generated` outfits have no
`image_path`:

```python
for outfit in items:
    if outfit["image_path"]:
        signed = supabase.storage.from_(settings.supabase_storage_bucket).create_signed_url(
            outfit["image_path"], SIGNED_URL_TTL
        )
        outfit["image_url"] = signed.get("signedURL") or signed.get("signedUrl")
    else:
        outfit["image_url"] = None
```

---

## 4. Frontend — `lib/api.ts`

Add:

```ts
export async function buildOutfit(prompt: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/outfits/build`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to build outfit");
  }
  return res.json();
}

export async function createOutfit(file: File) {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/outfits`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create outfit");
  }
  return res.json();
}

export async function getOutfits() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/outfits`, { headers });
  if (!res.ok) throw new Error("Failed to fetch outfits");
  return res.json();
}
```

Note `buildOutfit` sends JSON, not `FormData` — no file involved, just a
text prompt, so `Content-Type: application/json` is correct here (unlike
the upload endpoints, which must NOT set this header manually).

---

## 5. Frontend — new page `app/outfits/build/page.tsx`

Pattern: `useMutation` for the build action (same shape as the wardrobe
`addItem` mutation), no `useQuery` needed since this page doesn't list
existing data on load.

```tsx
"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { buildOutfit } from "@/lib/api";

type BuiltOutfitItem = {
  id: string;
  label: string;
  type: string;
  colour: string;
  image_path: string;
};

type BuildOutfitResult = {
  outfit_id: string;
  styling_note: string;
  items: BuiltOutfitItem[];
};

export default function BuildOutfitPage() {
  const [prompt, setPrompt] = useState("");

  const build = useMutation({
    mutationFn: (p: string) => buildOutfit(p) as Promise<BuildOutfitResult>,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    build.mutate(prompt);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Build an Outfit</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. casual outfit for a rainy day"
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={build.isPending}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {build.isPending ? "Thinking..." : "Build"}
        </button>
      </form>

      {build.error && (
        <p className="text-red-500 mb-4">{(build.error as Error).message}</p>
      )}

      {build.data && (
        <div>
          <p className="mb-4 text-gray-700">{build.data.styling_note}</p>

          {build.data.items.length === 0 ? (
            <p className="text-gray-500">
              Nothing in your wardrobe fit that request.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
              {build.data.items.map((item) => (
                <div key={item.id} className="border rounded overflow-hidden p-2">
                  <p className="font-medium capitalize">{item.label}</p>
                  <p className="text-sm text-gray-500">
                    {item.type} · {item.colour}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

Note: this response doesn't include signed `image_url`s (only `list_outfits`
generates those, since that's the only route that loops through and calls
`create_signed_url`). If you want thumbnails on this page too, either call
`getWardrobe`-style signed-url logic in the `/outfits/build` route as well,
or simply link out to the existing wardrobe page — worth deciding once the
core flow works, not a blocker for v1.

---

## 6. Order of implementation (for Claude Code)

1. ~~Run the SQL migration (section 1) directly in Supabase's SQL editor.~~
   **Done.** Schema and RLS are live — Claude Code should not touch the
   database schema, only application code from here on.
2. Add `build_outfit` to `claude_client.py` (section 2).
3. Update `outfits.py`: patch `create_outfit` for `last_used` (3a), add
   `POST /outfits/build` (3b), patch `list_outfits` (3c).
4. Add the three new functions to `lib/api.ts` (section 4).
5. Create `app/outfits/build/page.tsx` (section 5).
6. Verify `app/supabase_client.py` — confirm whether it's using the anon
   key or service role key, since that determines whether RLS is actively
   enforcing on backend writes or just a safety net (see the RLS caveat in
   section 1). Not a blocker, just worth knowing before debugging any
   "write succeeded but shouldn't have" or "write silently did nothing"
   surprises later.
7. Test order:
   - Upload 2–3 wardrobe items via existing `/classify` flow.
   - Upload one OOTD photo via `/outfits` — confirm `outfit_items` rows
     appear and `last_used` updates on matched `classifications` rows.
   - Hit `/outfits/build` with a prompt — confirm it returns items from the
     same wardrobe and does **not** change `last_used`.
   - Confirm `GET /outfits` returns both `source: "upload"` and
     `source: "generated"` rows correctly, with `image_url: null` for
     generated ones.

---

## Open question for later (not blocking)

The existing outfit-listing page (`app/outfits/page.tsx`, if it exists yet)
should probably render `upload` and `generated` outfits differently — one
has a photo, one has a styling note instead. Not addressed in this plan;
flag once the above is working and stable.
