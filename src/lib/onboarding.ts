/**
 * Two gates run before the main app, as in the KingsSpace app
 * (services/onboarding.ts):
 *
 *  - Welcome: shown to signed-out visitors the first time this browser opens
 *    the app, explaining what KingsSpace is. Stored on the device, not the
 *    account, so it is never shown to the same browser twice.
 *
 *  - Interests: shown to signed-in users until they have saved at least one
 *    interest. "Skip" only dismisses it for the current session; it comes
 *    back next time until something is actually selected.
 */

const WELCOME_SEEN_KEY = "kingsspace.onboarding.welcome_seen";
const INTERESTS_DISMISSED_KEY = "kingsspace.onboarding.interests_dismissed";

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === "1";
  } catch {
    // Unreadable storage must not trap the visitor on the welcome screen.
    return true;
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function dismissInterestsForSession() {
  try {
    sessionStorage.setItem(INTERESTS_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function wasInterestsDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(INTERESTS_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Called on sign-out so the next account is prompted on its own merits. */
export function resetInterestsDismissal() {
  try {
    sessionStorage.removeItem(INTERESTS_DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}
