import { supabase } from "./supabaseClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function getAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

export async function classifyImage(file: File) {
  const headers = await getAuthHeaders();

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/classify`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Classification request failed");
  }

  return res.json();
}

export async function getWardrobe() {
  const headers = await getAuthHeaders();
  const res = await fetch (`${API_URL}/wardrobe`, { headers });

  if (!res.ok) {
    throw new Error("Failed to fetch wardrobe");
  }

  return res.json();
}

export async function getHistory() {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/classify/history`, { headers });

  if (!res.ok) {
    throw new Error("Failed to fetch history");
  }

  return res.json();
}

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
