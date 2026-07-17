import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "Midnight Observatory — 3D Hourglass",
    description: "Orbit, flip, pause, and calibrate a luminous 3D hourglass, with a narrated history of the instrument.",
    openGraph: {
      title: "Midnight Observatory",
      description: "A 3D hourglass study in glass, brass, and amber sand.",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "Midnight Observatory 3D hourglass simulation" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Midnight Observatory",
      description: "A 3D hourglass study in glass, brass, and amber sand.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
