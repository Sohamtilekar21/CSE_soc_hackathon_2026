"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { classifyImage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const [result, setResult] = useState<{
    label: string;
    confidence: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setError(null);
    setResult(null);
    setUploading(true);

    try {
      const data = await classifyImage(file);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Loading...
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-zinc-900 to-emerald-950 px-4 py-10">

      {/* Background glow */}
      <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />


      <div className="relative z-10 mx-auto max-w-5xl">


        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h1 className="text-4xl font-bold text-white">
              🥷 ClosetNinja Dashboard
            </h1>

            <p className="mt-2 text-zinc-300">
              Welcome back, {user.email}
            </p>
          </div>


          <Button
            onClick={() =>
              signOut().then(() => router.push("/login"))
            }
            className="bg-red-500 text-white hover:bg-red-400"
          >
            Sign out
          </Button>

        </div>



        <div className="grid gap-6 md:grid-cols-2">


          {/* Upload Card */}
          <Card className="border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl">

            <CardHeader>

              <CardTitle className="text-2xl font-bold text-white">
                📸 Analyse Clothing
              </CardTitle>

              <p className="text-zinc-300">
                Upload an image and let AI identify your clothing item.
              </p>

            </CardHeader>


            <CardContent>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-500 bg-black/20 p-8 text-center text-zinc-300 hover:bg-black/30">

                <span className="mb-3 text-4xl">
                  👕
                </span>

                <span>
                  Click to upload image
                </span>


                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />

              </label>


              {uploading && (
                <p className="mt-4 text-center text-emerald-300">
                  Analysing image...
                </p>
              )}


              {error && (
                <p className="mt-4 text-center text-red-400">
                  {error}
                </p>
              )}


            </CardContent>

          </Card>



          {/* Result Card */}
          <Card className="border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl">

            <CardHeader>

              <CardTitle className="text-2xl font-bold text-white">
                ✨ AI Result
              </CardTitle>

            </CardHeader>


            <CardContent>

              {result ? (

                <div className="space-y-4">

                  <p className="text-zinc-300">
                    Detected item:
                  </p>

                  <p className="text-3xl font-bold text-emerald-400">
                    {result.label}
                  </p>


                  <p className="text-zinc-300">
                    Confidence:
                  </p>

                  <p className="text-xl text-white">
                    {(result.confidence * 100).toFixed(1)}%
                  </p>


                </div>

              ) : (

                <p className="text-zinc-400">
                  Upload an image to see AI results here.
                </p>

              )}

            </CardContent>

          </Card>


        </div>



        {/* Feature cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-4">

          <div className="rounded-xl border border-white/10 bg-white/10 p-4 text-zinc-300 backdrop-blur-xl">
            ✨ AI Detection
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 p-4 text-zinc-300 backdrop-blur-xl">
            👕 Smart Wardrobe
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 p-4 text-zinc-300 backdrop-blur-xl">
            📸 Outfit Tracking
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 p-4 text-zinc-300 backdrop-blur-xl">
            ♻️ Sustainable Fashion
          </div>

        </div>


      </div>

    </main>
  );
}
