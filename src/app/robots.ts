import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/faq",
          "/impressum",
          "/datenschutz",
          "/agb",
          "/widerruf",
          "/llms.txt",
        ],
        disallow: [
          "/control",
          "/control/",
          "/api/",
          "/mfa",
          "/mfa/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
