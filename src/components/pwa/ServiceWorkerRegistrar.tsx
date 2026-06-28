"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (production + secure context only), mirroring the
 * reference app's "register on window load" approach. The worker uses
 * skipWaiting + clients.claim, so an updated build becomes active on the next
 * launch — no in-session reload is forced (which keeps navigation stable).
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!window.isSecureContext) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
