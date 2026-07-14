"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import {
  getBlocked,
  syncBlockedFromServer,
  unblock,
  type BlockedEntry,
} from "@/lib/blocklist";

export default function BlockedUsersPage() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<BlockedEntry[]>([]);

  useEffect(() => {
    const refresh = () => setEntries(getBlocked());
    refresh();
    // Pull the authoritative list from the server on open.
    if (token) syncBlockedFromServer(token);
    window.addEventListener("kingsspace:blocklist", refresh);
    return () => window.removeEventListener("kingsspace:blocklist", refresh);
  }, [token]);

  return (
    <div className="pb-10">
      <PageHeader title="Blocked users & channels" />
      <div className="p-4">
        <p className="mb-4 text-sm text-subtext">
          Blocked users&apos; comments and blocked channels&apos; videos are
          hidden from you. Blocking someone does not notify them. To report
          content that breaks the rules, use{" "}
          <span className="font-semibold">Report</span> on the video — reports
          go to the moderation team.
        </p>

        {entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-subtext">
            You haven&apos;t blocked anyone.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((b) => (
              <div
                key={`${b.kind}-${b.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {typeof b.name === "string" &&
                    b.name &&
                    b.name !== "[object Object]"
                      ? b.name
                      : b.id}
                  </p>
                  <p className="text-xs capitalize text-subtext">{b.kind}</p>
                </div>
                <button
                  onClick={() => unblock(b.kind, b.id, token || undefined)}
                  className="shrink-0 rounded-full bg-background px-4 py-1.5 text-xs font-bold text-primary"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
