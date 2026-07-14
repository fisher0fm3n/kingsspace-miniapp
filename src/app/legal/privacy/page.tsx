import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SUPPORT_EMAIL } from "@/lib/config";

export const metadata = { title: "Privacy Policy — KingsSpace" };

const EFFECTIVE_DATE = "8 July 2026";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-6 text-base font-bold">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <div className="pb-10">
      <PageHeader title="Privacy Policy" />
      <div className="px-5 py-4 text-sm leading-6 text-subtext">
        <p className="text-xs">Effective date: {EFFECTIVE_DATE}</p>

        <H2>1. Who we are</H2>
        <p>
          KingsSpace is a video sharing service operated by the CeFlix /
          LoveWorld network. This policy explains what data we collect when you
          use KingsSpace (including inside the KingsChat app), how we use it,
          who we share it with, how long we keep it, and your rights.
        </p>

        <H2>2. Data we collect</H2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Account data</strong> — name, username, email and profile
            picture from your CeFlix account, or from KingsChat when you sign
            in with KingsChat (we receive your basic KingsChat profile; we
            never see your KingsChat password).
          </li>
          <li>
            <strong>Content you create</strong> — videos, thumbnails, titles,
            descriptions, tags, channels, playlists and comments.
          </li>
          <li>
            <strong>Activity data</strong> — watch history, likes,
            subscriptions and reports you submit, used to operate those
            features.
          </li>
          <li>
            <strong>Technical data</strong> — basic request information (IP
            address, device/browser type) processed by our servers to deliver
            the service and protect it from abuse.
          </li>
          <li>
            <strong>Local device data</strong> — your session token, autoplay
            preference and block list are stored on your device
            (localStorage) and can be cleared by signing out or clearing
            browser data.
          </li>
        </ul>

        <H2>3. How we use data</H2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Providing and personalising the service;</li>
          <li>Processing uploads and serving video playback;</li>
          <li>Moderation: reviewing reports and enforcing our Terms;</li>
          <li>Security, abuse prevention and legal compliance;</li>
          <li>Responding to your support requests.</li>
        </ul>
        <p className="mt-2">
          We do not sell your personal data, and we do not use third-party
          advertising or tracking SDKs in this app. Authentication codes and
          tokens from KingsChat are exchanged server-side and are never
          logged or shared with third parties.
        </p>

        <H2>4. Sharing</H2>
        <p>Data is shared only with:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Our hosting and backend infrastructure (CeFlix / LoveWorld APIs)
            that runs the service;
          </li>
          <li>
            KingsChat, to complete sign-in when you use &quot;Continue with
            KingsChat&quot;;
          </li>
          <li>
            Law enforcement or regulators where we are legally required to do
            so.
          </li>
        </ul>

        <H2>5. Retention and deletion</H2>
        <p>
          Account data and content are kept while your account is active.
          When you delete your account (Profile → Delete account), your
          personal data, uploads and comments are queued for permanent
          deletion and removed from the service within <strong>30 days</strong>
          , except where a longer retention period is required by law (e.g.
          records of illegal-content takedowns). Backup copies expire on a
          rolling basis within a further 90 days. You can also delete
          individual videos, channels and playlists at any time from Creator
          Studio.
        </p>

        <H2>6. Your rights and consent revocation</H2>
        <p>
          You may access, correct, export or delete your personal data, and
          you may withdraw any consent you have given (for example, revoking
          KingsSpace&apos;s access from your KingsChat account settings stops
          future data sharing from KingsChat). To exercise any of these
          rights, use{" "}
          <Link
            href="/settings/delete-account"
            className="font-semibold text-primary"
          >
            Delete account
          </Link>{" "}
          in the app or contact{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary">
            {SUPPORT_EMAIL}
          </a>
          . We respond to privacy requests within 30 days.
        </p>

        <H2>7. Children</H2>
        <p>
          KingsSpace is not directed at children under 16. If we learn that a
          user is under 16 we will close the account and delete its data.
        </p>

        <H2>8. Changes and contact</H2>
        <p>
          Material changes to this policy will be announced in the app.
          Questions:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary">
            {SUPPORT_EMAIL}
          </a>{" "}
          or{" "}
          <Link href="/support" className="font-semibold text-primary">
            Contact &amp; Support
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
