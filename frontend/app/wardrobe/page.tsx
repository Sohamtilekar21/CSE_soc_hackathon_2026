"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWardrobe, classifyImage } from "@/lib/api";

type WardrobeItem = {
  id: string;
  image_path: string;
  image_url: string | null;
  label: string;
  confidence: number;
  created_at: string;
};

export default function WardrobePage() {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
  } = useQuery<{ items: WardrobeItem[] }>({
    queryKey: ["wardrobe"],
    queryFn: getWardrobe,
  });

  const addItem = useMutation({
    mutationFn: (file: File) => classifyImage(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wardrobe"] });
    },
  });

  function handleAddItem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    addItem.mutate(file);
    e.target.value = "";
  }

  const items = data?.items ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Wardrobe</h1>
        <label className="cursor-pointer rounded bg-black text-white px-4 py-2">
          {addItem.isPending ? "Uploading..." : "Add item"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAddItem}
            disabled={addItem.isPending}
          />
        </label>
      </div>

      {error && <p className="text-red-500 mb-4">{(error as Error).message}</p>}
      {addItem.error && (
        <p className="text-red-500 mb-4">{(addItem.error as Error).message}</p>
      )}

      {isLoading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>Your wardrobe is empty. Add your first item!</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {items.map((item) => (
            <div key={item.id} className="border rounded overflow-hidden">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.label}
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-gray-100" />
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
