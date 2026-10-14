import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Web app manifest.
 *
 * Gives "Add to Home Screen" a proper name and icon, and gives crawlers one
 * more place where the site's name and description are stated consistently.
 * Colours are the light-theme paper and the accent's light-mode value, so the
 * splash screen matches the site rather than defaulting to white-on-black.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — AI infrastructure tools`,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbfbfa",
    theme_color: "#fbfbfa",
    categories: ["developer", "productivity", "reference"],
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
