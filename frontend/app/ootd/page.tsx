"use client";

import { useState } from "react";
import { classifyImage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OOTDPage() {
  const [result, setResult] = useState<{
    label: string;
    confidence: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);


  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setError(null);
    setResult(null);
    setUploading(true);

    try {
      const data = await classifyImage(file);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setUploading(false);
    }
  }


  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-zinc-900 to-emerald-950 px-4 py-10">


      {/* Background glow */}
      <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

      <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />


      <div className="relative z-10 mx-auto max-w-xl">


        <Card className="border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl">


          <CardHeader>

            <CardTitle className="text-center text-4xl font-bold text-white">
              👗 Outfit of the Day
            </CardTitle>

            <p className="text-center text-zinc-300">
              Upload your outfit and let ClosetNinja analyse your look.
            </p>

          </CardHeader>


          <CardContent>


            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-500 bg-black/20 p-10 text-center text-zinc-300 transition hover:bg-black/30">


              <span className="mb-4 text-5xl">
                📸
              </span>


              <span className="text-lg">
                Upload today's outfit
              </span>


              <span className="mt-2 text-sm text-zinc-400">
                PNG, JPG or WEBP
              </span>


              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />


            </label>



            {uploading && (
              <p className="mt-5 text-center text-emerald-300">
                Analysing your outfit...
              </p>
            )}



            {error && (
              <p className="mt-5 text-center text-red-400">
                {error}
              </p>
            )}



            {result && (
              <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-5 text-center">


                <h2 className="text-lg text-zinc-300">
                  Today's Outfit
                </h2>


                <p className="mt-2 text-3xl font-bold text-emerald-400">
                  {result.label}
                </p>


                <p className="mt-3 text-zinc-300">
                  Confidence:
                </p>


                <p className="text-xl font-semibold text-white">
                  {(result.confidence * 100).toFixed(1)}%
                </p>


              </div>
            )}


          </CardContent>


        </Card>


      </div>


    </main>
  );
}
