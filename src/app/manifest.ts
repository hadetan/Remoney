import type { MetadataRoute } from "next";

/**
 * Web App Manifest (served at /manifest.webmanifest).
 * Next injects <link rel="manifest"> automatically when this route exists.
 * Makes Remoney installable to the home screen on Android/desktop/iOS.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Remoney — track what you owe",
    short_name: "Remoney",
    description: "Track what you owe each shop — offline, on your device.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafa",
    theme_color: "#ffffff",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
