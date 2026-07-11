"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { classifyImage } from "@/lib/api";

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
    return <main>Loading...</main>;
  }

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Signed in as {user.email}</p>
      <button onClick={() => signOut().then(() => router.push("/login"))}>
        Sign out
      </button>

      <hr />

      <h2>Classify an image</h2>
      <input
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {uploading && <p>Classifying...</p>}
      {error && <p className="error">{error}</p>}
      {result && (
        <p>
          <strong>{result.label}</strong> ({(result.confidence * 100).toFixed(1)}%)
        </p>
      )}
    </main>
  );
}
