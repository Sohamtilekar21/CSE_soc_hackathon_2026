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

export async function getHistory() {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/classify/history`, { headers });

  if (!res.ok) {
    throw new Error("Failed to fetch history");
  }

  return res.json();
}
