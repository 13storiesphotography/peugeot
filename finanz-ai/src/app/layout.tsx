import type { Metadata, Viewport } from "next";
import { Manrope, Syne } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Kontura — Finanzen im Klarblick",
    template: "%s · Kontura",
  },
  description:
    "Sicherer Überblick über Konten und Budgets — mit AI, die Fragen wie „Kann ich mir den Schrank leisten?“ beantwortet.",
  applicationName: "Kontura",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Kontura",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icon-192.png",
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#10253a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${syne.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-ink">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
