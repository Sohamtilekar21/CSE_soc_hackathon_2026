"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
    } else {
      setMessage("Check your email to confirm your account before logging in.");
    }
  }

  return(
  <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-zinc-900 to-emerald-950 px-4">
  <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
  <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

    <Card className="relative z-10 w-full max-w-md border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl">

<CardHeader>

  <CardTitle className="text-center text-4xl font-bold text-white">
    🥷 ClosetNinja
  </CardTitle>

  <p className="text-center text-zinc-300">
    Build Your Smart Digital Wardrobe.
  </p>

</CardHeader>


      <CardContent>

        <form 
  onSubmit={handleSignUp} 
  className="flex flex-col space-y-4"
>

          <Input
	    className="bg-black/30 border-zinc-700 text-white placeholder:text-zinc-400"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />


          <Input
	    className="bg-black/30 border-zinc-700 text-white placeholder:text-zinc-400"
            type="password"
            placeholder="Password (minimum 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />


          <Button
            className="w-full bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>


        </form>


        {error && (
          <p className="text-red-400 text-sm text-center">
            {error}
          </p>
        )}


        {message && (
          <p className="text-emerald-300 text-sm text-center">
            {message}
          </p>
        )}


        <p className="mt-6 text-center text-sm">
          Already have an account?{" "}
          <a 
            href="/login"
            className="font-semibold text-emerald-400 hover:text-emerald-300"
          >
            Log in
          </a>
        </p>
	<div className="mt-8 space-y-2 text-sm text-zinc-300">

    <p>✨ AI Clothing Detection</p>

    <p>👕 Smart Digital Wardrobe</p>

    <p>📸 Outfit Tracking</p>

    <p>♻️ Sustainable Fashion</p>

</div>


      </CardContent>

    </Card>

  </main>
);
}
