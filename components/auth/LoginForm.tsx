"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

function displayNameFromEmail(email: string) {
  return email.split("@")[0] || "ChapMee reader";
}

async function ensureProfile(userId: string, email: string) {
  const supabase = createClient();
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing) {
    return;
  }

  const { error: insertError } = await supabase.from("profiles").insert({
    id: userId,
    display_name: displayNameFromEmail(email),
    role: "user"
  });

  if (insertError) {
    throw insertError;
  }
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/me";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      if (data.user) {
        await ensureProfile(data.user.id, data.user.email ?? email);
      }

      router.refresh();
      router.push(nextPath);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-5">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          autoComplete="email"
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
        <Input
          autoComplete="current-password"
          label="Password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
          required
          type="password"
          value={password}
        />
        {error ? (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        <Button className="w-full" loading={loading} type="submit">
          Login
        </Button>
        <p className="text-center text-sm text-zinc-400">
          New to ChapMee?{" "}
          <Link className="font-semibold text-cyan-300" href="/register">
            Create an account
          </Link>
        </p>
      </form>
    </Card>
  );
}
