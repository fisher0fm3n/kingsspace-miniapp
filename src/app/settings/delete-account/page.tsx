"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { SUPPORT_EMAIL } from "@/lib/config";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";

export default function DeleteAccountPage() {
  const router = useRouter();
  const { user, token, isLoggedIn, signOut } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"webhook" | "email" | "">("");
  const [error, setError] = useState("");

  const mailtoHref = () => {
    const subject = encodeURIComponent("KingsSpace account deletion request");
    const bodyLines = [
      "Please delete my KingsSpace account and all associated personal data.",
      "",
      `Username: ${user?.username || "(fill in)"}`,
      `User ID: ${user?.userID || user?.id || "(fill in)"}`,
      "",
      "I understand deletion is permanent and will be completed within 30 days.",
    ];
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${encodeURIComponent(
      bodyLines.join("\n"),
    )}`;
  };

  const submit = async () => {
    setError("");
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      setError('Type "DELETE" to confirm.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          userID: String(user?.userID || user?.id || ""),
          username: user?.username || "",
        }),
      });
      const json = await res.json().catch(() => null);
      if (json?.status) {
        setDone("webhook");
      } else if (json?.fallback === "email") {
        // No owner webhook configured — hand off to a pre-filled email so the
        // request still reaches the service owner.
        window.location.href = mailtoHref();
        setDone("email");
      } else {
        throw new Error(json?.message || "Could not submit the request.");
      }
    } catch (err) {
      setError((err as Error).message || "Could not submit the request.");
    } finally {
      setSubmitting(false);
    }
  };

  const finish = () => {
    signOut();
    router.replace("/");
  };

  if (!isLoggedIn)
    return (
      <div>
        <PageHeader title="Delete account" />
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <p className="text-sm text-subtext">
            Sign in to manage your account, or email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary">
              {SUPPORT_EMAIL}
            </a>{" "}
            to request deletion of your data.
          </p>
          <Link
            href="/login"
            className="rounded-xl bg-primary px-6 py-3 font-bold text-white"
          >
            Log in
          </Link>
        </div>
      </div>
    );

  if (done)
    return (
      <div>
        <PageHeader title="Delete account" />
        <div className="space-y-4 px-5 py-8 text-center">
          <p className="text-lg font-bold">Deletion request started</p>
          <p className="text-sm leading-6 text-subtext">
            {done === "webhook"
              ? "Your deletion request has been submitted to the KingsSpace team."
              : "Your email app has been opened with a pre-filled deletion request — please press send to complete it."}{" "}
            Your account, uploads, comments and personal data will be
            permanently deleted within <strong>30 days</strong>. You&apos;ll
            now be signed out on this device and your local data cleared.
          </p>
          <button
            onClick={finish}
            className="w-full rounded-xl bg-primary py-3 font-bold text-white"
          >
            Sign out &amp; clear local data
          </button>
        </div>
      </div>
    );

  return (
    <div className="pb-10">
      <PageHeader title="Delete account" />
      <div className="space-y-4 px-5 py-4 text-sm leading-6 text-subtext">
        <p>
          This starts the permanent deletion of your KingsSpace account and
          personal data. Here is exactly what happens:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>What is deleted:</strong> your profile (name, username,
            email, picture), your uploaded videos and thumbnails, channels,
            playlists, comments, watch history, likes and subscriptions.
          </li>
          <li>
            <strong>When:</strong> the KingsSpace team processes deletion
            requests within <strong>30 days</strong> of receipt. Backup copies
            expire within a further 90 days.
          </li>
          <li>
            <strong>How:</strong> your request is sent to the service owner
            (CeFlix / LoveWorld network) for processing. You&apos;ll be signed
            out immediately and data stored on this device is cleared.
          </li>
          <li>
            <strong>What may be kept:</strong> records we are legally required
            to retain (e.g. takedown records for illegal content).
          </li>
        </ul>
        <p>
          Deletion is <strong>permanent</strong> and cannot be undone. If you
          only want a break, you can simply sign out instead. Questions? See
          the{" "}
          <Link href="/legal/privacy" className="font-semibold text-primary">
            Privacy Policy
          </Link>{" "}
          or contact{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>

        <div className="rounded-xl border border-border bg-card p-4">
          <label className="mb-1.5 block text-sm font-semibold text-text">
            Type DELETE to confirm
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoCapitalize="characters"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-subtext"
          />
          {error && <p className="mt-2 text-sm text-error">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-error py-3 font-bold text-white disabled:opacity-60"
          >
            {submitting ? <Spinner size={18} /> : "Request account deletion"}
          </button>
        </div>
      </div>
    </div>
  );
}
