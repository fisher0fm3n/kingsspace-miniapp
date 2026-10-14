"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAccountStats } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatViews } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";
import {
  EyeIcon,
  TvIcon,
  UsersIcon,
  UploadIcon,
  PlusIcon,
} from "@/components/Icons";

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-xl border border-border bg-card px-2 py-4">
      <span className="text-primary">{icon}</span>
      <span className="mt-2 text-xl font-bold">{value}</span>
      <span className="mt-1 text-center text-xs text-subtext">{label}</span>
    </div>
  );
}

function ActionRow({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        <p className="mt-0.5 text-sm text-subtext">{subtitle}</p>
      </div>
      <span className="text-subtext">›</span>
    </Link>
  );
}

export default function StudioDashboard() {
  const router = useRouter();
  const { token, isLoggedIn, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  const { data: stats = {}, isLoading } = useQuery({
    queryKey: ["account-stats", token],
    queryFn: () => getAccountStats(token),
    enabled: isLoggedIn,
  });

  const stat = (v: unknown) =>
    v !== undefined && v !== null && v !== "" ? String(v) : "--";

  return (
    <div>
      <PageHeader
        title="Creator Dashboard"
        right={
          <Link
            href="/upload"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white"
            aria-label="Upload"
          >
            <PlusIcon size={22} />
          </Link>
        }
      />

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : (
        <div className="p-4">
          <h2 className="mb-3 text-lg font-bold">Overview</h2>
          <div className="mb-7 flex gap-2.5">
            <StatCard
              label="Views"
              value={formatViews((stats as any).video_views).replace(
                " views",
                "",
              ) || "--"}
              icon={<EyeIcon size={22} />}
            />
            <StatCard
              label="Channels"
              value={stat((stats as any).channels)}
              icon={<TvIcon size={22} />}
            />
            <StatCard
              label="Subscribers"
              value={stat((stats as any).subscribers)}
              icon={<UsersIcon size={22} />}
            />
          </div>

          <h2 className="mb-3 text-lg font-bold">Manage</h2>
          <div className="space-y-3">
            <ActionRow
              href="/studio/channels"
              title="Channels"
              subtitle="View, edit or create your channels"
              icon={<TvIcon size={22} />}
            />
            <ActionRow
              href="/studio/videos"
              title="Videos"
              subtitle="Manage your uploaded videos"
              icon={<UploadIcon size={22} />}
            />
            <ActionRow
              href="/upload"
              title="Upload Video"
              subtitle="Add a new video or clip"
              icon={<UploadIcon size={22} />}
            />
          </div>
        </div>
      )}
    </div>
  );
}
