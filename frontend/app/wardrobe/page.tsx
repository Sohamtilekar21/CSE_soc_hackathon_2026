"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { classifyImage, getWardrobe } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type WardrobeItem = {
  id: string;
  image_path: string;
  image_url: string | null;
  label: string;
  confidence: number;
  created_at: string;
};

export default function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadWardrobe() {
    setLoading(true);
    setError(null);
    try {
      const res = await getWardrobe();
      setItems(res.items);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWardrobe();
  }, []);

  async function handleAddItem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const data = await classifyImage(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
      e.target.value = ""; //Reset the file input
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Wardrobe</h1>
        <label className="cursor-pointer rounded bg-black text-white px-4 py-2">
          {uploading ? "Uploading..." : "Add item"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAddItem}
            disabled={uploading}
          />
        </label>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>Your wardrobe is empty. Add your first item!</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {items.map((item) => (
            <div key={item.id} className="border rounded overflow-hidden">
              {item.image_url ? (
                <img src={item.image_url} alt={item.label} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gray-100" />
              )}
              <div className="p-2">
                <p className="font-medium capitalize">{item.label}</p>
                <p className="text-sm text-gray-500">
                  {Math.round(item.confidence * 100)}% confidence
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
