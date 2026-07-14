// First-line objectionable-content screening for user-generated text:
// video titles, descriptions, tags, channel names/descriptions, and comments.
//
// This is a client-side pre-filter only. Authoritative moderation happens
// server-side (Ceflix backend) plus the in-app report queue — see
// docs/MODERATION.md for the operational process, reviewer ownership and
// response times. Uploaded media (video + thumbnail) is additionally screened
// in the backend review pipeline; anything that slips through is handled via
// the report flow and admin takedown tooling.

// High-signal blocked terms: profanity, sexual content, slurs and violent/
// hateful language. Matching is case-insensitive on word boundaries with
// common leetspeak substitutions normalized, to keep false positives
// (e.g. "class", "assessment", "Scunthorpe") from blocking legitimate content.
const BLOCKED_TERMS = [
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "asshole",
  "dickhead",
  "cunt",
  "wanker",
  "slut",
  "whore",
  "porn",
  "porno",
  "pornography",
  "xxx",
  "blowjob",
  "handjob",
  "cumshot",
  "anal sex",
  "child porn",
  "nigger",
  "nigga",
  "faggot",
  "kike",
  "spic",
  "chink",
  "raghead",
  "kill yourself",
  "kys",
  "rape",
  "rapist",
  "beheading",
  "jihad porn",
];

// "¤" stands in for masked letters ("f*ck", "s**t") so they still match.
const MASK = "¤";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[*•]/g, MASK)
    .replace(/\s+/g, " ");
}

// Each letter of a term may appear as itself or as a masked character.
const BLOCKED_PATTERNS = BLOCKED_TERMS.map((term) => {
  const body = term
    .split("")
    .map((ch) => (ch === " " ? "\\s+" : `[${ch}${MASK}]`))
    .join("");
  return new RegExp(`(^|[^a-z${MASK}])${body}($|[^a-z${MASK}])`, "i");
});

export type ModerationResult =
  | { ok: true }
  | { ok: false; field: string; message: string };

/** Screens one text value. Returns ok:false with a user-facing message if it fails. */
export function moderateText(text: string, field = "text"): ModerationResult {
  const normalized = normalize(text || "");
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        ok: false,
        field,
        message: `Your ${field} appears to contain language that isn't allowed on KingsSpace. Please review our Content Rules (Terms of Use) and try again.`,
      };
    }
  }
  return { ok: true };
}

/** Screens several labelled fields at once; returns the first failure. */
export function moderateFields(
  fields: Record<string, string>,
): ModerationResult {
  for (const [field, value] of Object.entries(fields)) {
    const result = moderateText(value, field);
    if (!result.ok) return result;
  }
  return { ok: true };
}
