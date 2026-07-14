"use client";

import { useEffect, useState } from "react";

// KingsChat superapp webview detection.
//
// When KingsSpace runs inside the KingsChat app, the host injects:
//   window.kcsuperapp = Object.freeze({ appVersion: "<version>", isWebView: true });
//
// Inside that webview, direct camera capture is a host-side device capability
// that KingsChat Services does not grant to miniapps — uploads must come from
// Gallery/Files only. This app therefore:
//  - never uses getUserMedia / MediaDevices,
//  - never sets the `capture` attribute on file inputs,
//  - adjusts upload UI copy to Gallery/Files when running inside KingsChat.

type KcSuperApp = {
  appVersion?: string;
  isWebView?: boolean;
};

declare global {
  interface Window {
    kcsuperapp?: KcSuperApp;
  }
}

export function isKingsChatWebView(): boolean {
  if (typeof window === "undefined") return false;
  return window.kcsuperapp?.isWebView === true;
}

export function kingsChatAppVersion(): string {
  if (typeof window === "undefined") return "";
  return window.kcsuperapp?.appVersion || "";
}

/** SSR/hydration-safe hook: false on the server, real value after mount. */
export function useIsKingsChatWebView(): boolean {
  const [inWebView, setInWebView] = useState(false);
  useEffect(() => {
    setInWebView(isKingsChatWebView());
  }, []);
  return inWebView;
}
