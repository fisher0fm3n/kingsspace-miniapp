import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SUPPORT_EMAIL } from "@/lib/config";

export const metadata = { title: "Terms of Use — KingsSpace" };

const EFFECTIVE_DATE = "8 July 2026";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-6 text-base font-bold">{children}</h2>;
}

export default function TermsPage() {
  return (
    <div className="pb-10">
      <PageHeader title="Terms of Use" />
      <div className="px-5 py-4 text-sm leading-6 text-subtext">
        <p className="text-xs">Effective date: {EFFECTIVE_DATE}</p>

        <H2>1. About KingsSpace</H2>
        <p>
          KingsSpace is a video sharing service operated by the CeFlix /
          LoveWorld network (&quot;we&quot;, &quot;us&quot;). By using
          KingsSpace — including inside the KingsChat app — you agree to these
          Terms of Use and to our{" "}
          <Link href="/legal/privacy" className="font-semibold text-primary">
            Privacy Policy
          </Link>
          . If you do not agree, do not use the service.
        </p>

        <H2>2. Age requirement</H2>
        <p>
          KingsSpace is intended for users aged <strong>16 and over</strong>,
          in line with KingsChat&apos;s App Store age rating. All content
          published on KingsSpace must be suitable for viewers aged 16+.
        </p>

        <H2>3. Your account</H2>
        <p>
          You are responsible for activity on your account. Keep your
          credentials safe and tell us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary">
            {SUPPORT_EMAIL}
          </a>{" "}
          if you believe your account has been compromised.
        </p>

        <H2>4. Content rules</H2>
        <p>
          These rules apply to everything you publish: videos, thumbnails,
          titles, descriptions, tags, channel names and comments. You must own
          the content you upload or have the right to share it.
        </p>

        <H2>5. Prohibited content</H2>
        <p>The following is not allowed anywhere on KingsSpace:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Sexually explicit material, pornography, or sexualized depictions
            of minors (the latter is reported to authorities);
          </li>
          <li>Graphic violence, gore, or content glorifying self-harm;</li>
          <li>
            Hate speech, harassment, bullying, or threats against any person
            or group;
          </li>
          <li>
            Content promoting terrorism, violent extremism, or criminal
            activity;
          </li>
          <li>
            Misinformation likely to cause real-world harm, scams, or
            deceptive practices;
          </li>
          <li>
            Content that infringes copyright, trademarks, or other rights;
          </li>
          <li>Malware, spam, or attempts to abuse the platform;</li>
          <li>
            Any content unsuitable for viewers aged 16+, or that violates
            applicable law.
          </li>
        </ul>

        <H2>6. Moderation, takedowns and reporting</H2>
        <p>
          We may review, filter, restrict, remove or refuse to publish any
          content at our sole discretion, with or without notice, including
          content flagged by automated screening or reported by users. Every
          video has a <strong>Report</strong> option; reports are reviewed by
          our moderation team. You can also hide users or channels you do not
          want to see with the <strong>Block</strong> feature.
        </p>

        <H2>7. Suspension, bans and account termination</H2>
        <p>
          We may suspend or permanently terminate accounts and channels that
          break these rules, without prior notice for serious or repeated
          violations. Severe violations (e.g. child-safety, terrorism) result
          in immediate termination and, where required, referral to law
          enforcement. You may delete your own account at any time from
          Profile → Delete account, or by contacting{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>

        <H2>8. Licence you grant us</H2>
        <p>
          You keep ownership of your content. By publishing on KingsSpace you
          grant us a worldwide, non-exclusive, royalty-free licence to host,
          store, reproduce, distribute and display it for operating and
          promoting the service. The licence ends when your content is deleted
          from the service, except for copies required by law.
        </p>

        <H2>9. Disclaimers and liability</H2>
        <p>
          The service is provided &quot;as is&quot; without warranties of any
          kind. To the maximum extent permitted by law, we are not liable for
          indirect or consequential damages arising from your use of the
          service.
        </p>

        <H2>10. Changes to these terms</H2>
        <p>
          We may update these terms; material changes will be announced in the
          app. Continuing to use KingsSpace after changes take effect means you
          accept the updated terms.
        </p>

        <H2>11. Contact</H2>
        <p>
          Questions about these terms:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary">
            {SUPPORT_EMAIL}
          </a>{" "}
          or visit{" "}
          <Link href="/support" className="font-semibold text-primary">
            Contact &amp; Support
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
