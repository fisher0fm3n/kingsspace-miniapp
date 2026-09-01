"use client";

import Link from "next/link";

type Action = {
  label: string;
  href?: string;
  onClick?: () => void;
};

/**
 * An empty state that always offers a way forward. Prefer this over a bare
 * "nothing here" line — every dead end should point somewhere.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  secondaryAction,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: Action;
  secondaryAction?: Action;
}) {
  return (
    <div className="mx-4 flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-8 text-center">
      {icon && (
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-background text-subtext">
          {icon}
        </span>
      )}

      <h3 className="text-base font-bold">{title}</h3>

      {body && <p className="text-sm leading-5 text-subtext">{body}</p>}

      {(action || secondaryAction) && (
        <div className="mt-3 flex flex-wrap justify-center gap-2.5">
          {action && <ActionButton action={action} primary />}
          {secondaryAction && <ActionButton action={secondaryAction} />}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  action,
  primary = false,
}: {
  action: Action;
  primary?: boolean;
}) {
  const className = primary
    ? "rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white"
    : "rounded-full border border-border px-5 py-2.5 text-sm font-bold";

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }

  return (
    <button onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}
