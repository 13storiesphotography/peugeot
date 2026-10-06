import type { Metadata, Viewport } from "next";
import { Manrope, Syne } from "next/font/google";
import { AuthRecoveryRedirect } from "@/components/AuthRecoveryRedirect";
import { CookieConsent } from "@/components/CookieConsent";
import { OptionalAnalytics } from "@/components/OptionalAnalytics";
import { PwaRegister } from "@/components/PwaRegister";
import { AuthUrlSession } from "@/components/AuthUrlSession";
import { TrafficBeacon } from "@/components/TrafficBeacon";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · Peugeot im Browser steuern`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#071018" },
    { color: "#071018" },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${display.variable} ${body.variable}`}
    >
      <body className="antialiased">
        {children}
        <AuthRecoveryRedirect />
        <AuthUrlSession />
        <PwaRegister />
        <CookieConsent />
        <TrafficBeacon />
        <OptionalAnalytics />
      </body>
    </html>
  );
}
