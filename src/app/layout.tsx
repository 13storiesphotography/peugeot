import type { Metadata, Viewport } from "next";
import { Manrope, Syne } from "next/font/google";
import { AuthRecoveryRedirect } from "@/components/AuthRecoveryRedirect";
import { PwaRegister } from "@/components/PwaRegister";
import { AuthUrlSession } from "@/components/AuthUrlSession";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { getRequestLocale } from "@/i18n/server";
import { getMessages } from "@/i18n/translate";
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const m = getMessages(locale);
  return {
    title: m.meta.title,
    description: m.meta.description,
    applicationName: "Peugeot Control",
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
      title: "Peugeot Control",
      statusBarStyle: "black-translucent",
    },
    formatDetection: {
      telephone: false,
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getRequestLocale();
  return (
    <html
      lang={locale}
      className={`${display.variable} ${body.variable}`}
    >
      <body className="antialiased">
        <I18nProvider locale={locale}>
          {children}
          <AuthRecoveryRedirect />
          <AuthUrlSession />
          <PwaRegister />
        </I18nProvider>
      </body>
    </html>
  );
}
