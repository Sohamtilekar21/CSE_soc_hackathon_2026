"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { buildOutfit } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BuiltOutfitItem = {
  id: string;
  label: string;
  type: string;
  colour: string;
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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-zinc-900 to-emerald-950 px-4 py-10">

      {/* Background glow */}
      <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-2xl">

        <Card className="border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl">

          <CardHeader>
            <CardTitle className="text-center text-4xl font-bold text-white">
              ✨ Build an Outfit
            </CardTitle>
            <p className="text-center text-zinc-300">
              Describe an occasion or vibe and let ClosetNinja pick from your wardrobe.
            </p>
          </CardHeader>

          <CardContent>

            <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
              <Input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. casual outfit for a rainy day"
                disabled={build.isPending}
                className="flex-1 border-white/20 bg-black/20 text-white placeholder:text-zinc-500"
              />
              <Button
                type="submit"
                disabled={build.isPending || !prompt.trim()}
                className="bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
              >
                {build.isPending ? "Thinking..." : "Build"}
              </Button>
            </form>

            {build.error && (
              <p className="mb-4 text-center text-red-400">
                {(build.error as Error).message}
              </p>
            )}

            {build.data && (
              <div>
                <p className="mb-4 text-center text-zinc-300">
                  {build.data.styling_note}
                </p>

                {build.data.items.length === 0 ? (
                  <p className="text-center text-zinc-500">
                    Nothing in your wardrobe fit that request.
                  </p>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
                    {build.data.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-white/10 bg-black/20 p-4"
                      >
                        <p className="font-semibold capitalize text-white">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">
                          {item.type} · {item.colour}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </CardContent>

        </Card>

      </div>

    </main>
  );
}
