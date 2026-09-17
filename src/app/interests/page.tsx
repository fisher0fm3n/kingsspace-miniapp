"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  getInterestCatalog,
  getInterestStatus,
  saveInterests,
  skipInterests,
} from "@/lib/api";
import { dismissInterestsForSession } from "@/lib/onboarding";
import { clean } from "@/lib/utils";
import { Spinner } from "@/components/Skeletons";
import { CheckIcon } from "@/components/Icons";

/**
 * The interests picker, in the app's current design: square picture tiles
 * with the name underneath. Until an interest has an image, or if it fails to
 * load, the tile is the interest's own colour with its initial.
 *
 * Opened by the onboarding gate for signed-in users with nothing selected, or
 * from the "You" tab with ?mode=edit.
 */
function InterestsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { token, isLoggedIn, loading } = useAuth();

  const isEditing = params.get("mode") === "edit";
  // The gate pushes this page over Home, so leaving is a plain back.
  const fromGate = params.get("from") === "gate";

  const catalog = useQuery({
    queryKey: ["interest-catalog"],
    queryFn: getInterestCatalog,
    staleTime: 1000 * 60 * 30,
  });

  const status = useQuery({
    queryKey: ["interest-status", token],
    queryFn: () => getInterestStatus(token),
    enabled: isLoggedIn,
    staleTime: Infinity,
  });

  const [selected, setSelected] = useState<number[] | null>(null);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing opens with the user's existing picks already on.
  useEffect(() => {
    if (selected === null && status.data) {
      setSelected(Array.isArray(status.data.selected) ? status.data.selected : []);
    }
  }, [selected, status.data]);

  const picks = selected ?? [];
  const interests = catalog.data?.interests ?? [];
  const recommendedMinimum = catalog.data?.recommendedMinimum ?? 3;
  const maxSelections = catalog.data?.maxSelections ?? 25;
  const remaining = Math.max(0, recommendedMinimum - picks.length);

  const headline = useMemo(() => {
    if (isEditing) return "Your interests";
    if (picks.length === 0) return "What are you into?";
    if (remaining > 0) return `Nice. ${remaining} more to go`;
    return "Your feed is ready";
  }, [isEditing, picks.length, remaining]);

  const subtitle = isEditing
    ? "Update these any time. Your home page adjusts straight away."
    : remaining > 0
      ? `Pick at least ${recommendedMinimum} topics and we'll build a home page around them.`
      : "Great picks. You can always change these later from the You tab.";

  function toggle(id: number) {
    setSelected((prev) => {
      const current = prev ?? [];
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= maxSelections) return current;
      return [...current, id];
    });
  }

  function leave() {
    if (isEditing || fromGate) {
      router.back();
      return;
    }
    router.replace("/");
  }

  function handleSkip() {
    if (leaving) return;
    // Dismisses for this session only; the picker comes back next time until
    // at least one interest is saved. The server still records the skip. The
    // request is not awaited: nothing about leaving depends on it.
    setLeaving(true);
    dismissInterestsForSession();
    if (token) skipInterests(token).catch(() => {});
    leave();
  }

  async function handleSave() {
    if (!token) {
      leave();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveInterests(token, picks);
      // The gate reads this; updating it here means it cannot bounce the
      // user back to the picker.
      queryClient.setQueryData(["interest-status", token], {
        ...(status.data ?? {}),
        selected: picks,
        selected_count: picks.length,
      });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      leave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your interests. Please try again.");
      setSaving(false);
    }
  }

  if (loading || catalog.isLoading || (isLoggedIn && status.isLoading)) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
        <Spinner size={28} />
        <p className="text-sm text-subtext">Loading interests…</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-xl font-bold">Your interests</h1>
        <p className="text-sm text-subtext">
          Sign in to choose the topics your home page is built around.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (catalog.error) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-subtext">We couldn&apos;t load interests right now.</p>
        <button
          onClick={() => catalog.refetch()}
          className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white"
        >
          Try again
        </button>
        {!isEditing && (
          <button onClick={handleSkip} disabled={leaving} className="py-2 text-sm font-medium text-subtext">
            {leaving ? "Skipping…" : "Skip for now"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pb-32">
      <div className="flex items-start justify-between gap-4 px-5 pt-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{headline}</h1>
          <p className="mt-1.5 text-sm leading-5 text-subtext">{subtitle}</p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={leaving}
            className="shrink-0 pt-1 text-[15px] font-medium text-subtext"
          >
            {leaving ? "Skipping…" : "Skip for now"}
          </button>
        )}
      </div>

      {error && (
        <p className="mx-5 mt-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-[18px] px-5">
        {interests.map((interest) => {
          const isSelected = picks.includes(interest.id);
          const accent = interest.color || "var(--primary)";
          const showImage = Boolean(interest.thumbnail) && !failedImages[interest.id];

          return (
            <button
              key={interest.id}
              type="button"
              onClick={() => toggle(interest.id)}
              role="checkbox"
              aria-checked={isSelected}
              aria-label={clean(interest.title)}
              className="block text-left"
            >
              <span
                className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md"
                style={{ background: accent }}
              >
                {showImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={interest.thumbnail}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [interest.id]: true }))
                    }
                  />
                ) : (
                  <span className="text-5xl font-bold text-white/90">
                    {clean(interest.title).charAt(0).toUpperCase()}
                  </span>
                )}

                {isSelected && (
                  <>
                    <span className="absolute inset-0 bg-black/30" />
                    <span className="absolute inset-0 rounded-md border-[3px] border-primary" />
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                      <CheckIcon size={15} />
                    </span>
                  </>
                )}
              </span>

              <span
                className={`mt-2 line-clamp-2 block text-[14.5px] font-semibold leading-[19px] ${
                  isSelected ? "text-primary" : ""
                }`}
              >
                {clean(interest.title)}
              </span>
              <span className="mt-0.5 block text-xs text-subtext">
                {interest.channel_count} channel{interest.channel_count === 1 ? "" : "s"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[480px] -translate-x-1/2 items-center justify-between gap-4 border-t border-border bg-background/95 px-5 py-4 backdrop-blur">
        <p className="text-sm text-subtext">{picks.length} selected</p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || (!isEditing && picks.length === 0)}
          className="rounded-full bg-primary px-7 py-2.5 text-sm font-bold text-white disabled:bg-card disabled:text-subtext"
        >
          {saving ? "Saving…" : isEditing ? "Save changes" : "Continue"}
        </button>
      </div>
    </div>
  );
}

export default function InterestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <Spinner size={28} />
        </div>
      }
    >
      <InterestsInner />
    </Suspense>
  );
}
