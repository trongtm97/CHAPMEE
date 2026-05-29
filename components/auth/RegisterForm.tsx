"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { validateDisplayName as validateDisplayNameFormat } from "@/lib/profile/validateProfile";
import { checkDisplayNamePolicyAction } from "@/lib/username/policy-actions";

async function createProfile(
  userId: string,
  displayName: string,
  email: string
) {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").insert({
    id: userId,
    display_name: displayName,
    username: null,
    bio: `Reader account for ${email}`,
    role: "user"
  });

  if (error && error.code !== "23505") {
    throw error;
  }
}

export function RegisterForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const displayNameFormatError = validateDisplayNameFormat(displayName);
    if (displayNameFormatError) {
      setError(displayNameFormatError);
      setLoading(false);
      return;
    }

    const displayNamePolicy = await checkDisplayNamePolicyAction(displayName);
    if (!displayNamePolicy.valid) {
      setError(displayNamePolicy.message ?? "Tên hiển thị không hợp lệ.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: registerError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      });

      if (registerError) {
        setError(registerError.message);
        return;
      }

      if (data.user && data.session) {
        await createProfile(
          data.user.id,
          displayName,
          data.user.email ?? email
        );
        router.refresh();
        router.push("/me");
        return;
      }

      setMessage(
        "Account created. Check your email to confirm your account, then log in."
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-5">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          autoComplete="name"
          label="Display name"
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Your ChapMee name"
          required
          type="text"
          value={displayName}
        />
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
          autoComplete="new-password"
          label="Password"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 6 characters"
          required
          type="password"
          value={password}
        />
        {error ? (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
            {message}
          </p>
        ) : null}
        <Button className="w-full" loading={loading} type="submit">
          Register
        </Button>
        <p className="text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link className="font-semibold text-cyan-300" href="/login">
            Login
          </Link>
        </p>
      </form>
    </Card>
  );
}
