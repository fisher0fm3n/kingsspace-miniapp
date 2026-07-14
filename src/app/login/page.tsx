"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { buildAuthorizeUrl } from "@/lib/kingschat";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";
import type { CurrentUser } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithPassword, setSession } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== "kingschat-login-success") return;
      const token = String(event.data?.token || "");
      const user = (event.data?.user || {}) as CurrentUser;
      if (!token) return;
      setSession(token, { ...user, token });
      router.replace("/profile");
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router, setSession]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithPassword(username.trim(), password);
      router.replace("/profile");
    } catch (err) {
      setError((err as Error).message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const openKingsChatLogin = () => {
    const popup = window.open(
      "/auth/kingschat-popup",
      "kingschat-login",
      "width=480,height=760,scrollbars=yes,resizable=yes",
    );
    if (!popup) {
      window.location.href = buildAuthorizeUrl();
    }
  };

  return (
    <div>
      <PageHeader title="Log in" />
      <div className="px-5 py-6">
        <div className="mb-6 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="KingsSpace" className="h-14 w-14" />
          <h1 className="mt-4 text-xl font-extrabold">Welcome</h1>
          <p className="text-sm text-subtext">Sign in to continue</p>
        </div>

        <button
          onClick={openKingsChatLogin}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f8fff] py-3 font-bold text-white"
        >
          Continue with KingsChat
        </button>

        <div className="mb-5 flex items-center gap-3 text-xs text-subtext">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username or email"
            autoCapitalize="none"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-subtext"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-subtext"
          />
          {error && <p className="text-sm text-error">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-60"
          >
            {loading ? <Spinner size={18} /> : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-subtext">
          By continuing you agree to the{" "}
          <Link href="/legal/terms" className="font-semibold text-primary">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="font-semibold text-primary">
            Privacy Policy
          </Link>
          .{" "}
          <Link href="/support" className="font-semibold text-primary">
            Contact &amp; Support
          </Link>
        </p>
      </div>
    </div>
  );
}
