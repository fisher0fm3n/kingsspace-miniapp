import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SUPPORT_EMAIL, SUPPORT_RESPONSE_TIME } from "@/lib/config";

export const metadata = { title: "Contact & Support — KingsSpace" };

export default function SupportPage() {
  return (
    <div className="pb-10">
      <PageHeader title="Contact & Support" />
      <div className="space-y-4 px-5 py-4 text-sm leading-6 text-subtext">
        <p>
          Need help, found a bug, or want to report a problem with content or
          your account? We&apos;re here to help.
        </p>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-bold text-text">Email support</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-1 block font-semibold text-primary"
          >
            {SUPPORT_EMAIL}
          </a>
          <p className="mt-2 text-xs">
            We aim to respond within {SUPPORT_RESPONSE_TIME}. For account or
            privacy requests, please write from the email linked to your
            account.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-bold text-text">Report content</p>
          <p className="mt-1 text-xs">
            The fastest way to flag a video that breaks the rules is the{" "}
            <span className="font-semibold">Report</span> button on the video
            page — reports go straight to the moderation queue. You can also
            hide users or channels with <span className="font-semibold">Block</span>.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-bold text-text">Account &amp; data</p>
          <p className="mt-1 text-xs">
            You can request deletion of your account and personal data from{" "}
            <Link
              href="/settings/delete-account"
              className="font-semibold text-primary"
            >
              Delete account
            </Link>
            . See the{" "}
            <Link href="/legal/privacy" className="font-semibold text-primary">
              Privacy Policy
            </Link>{" "}
            for how your data is handled, and the{" "}
            <Link href="/legal/terms" className="font-semibold text-primary">
              Terms of Use
            </Link>{" "}
            for the content rules.
          </p>
        </div>
      </div>
    </div>
  );
}
