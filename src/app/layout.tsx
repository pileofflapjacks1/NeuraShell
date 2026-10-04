import type { Metadata } from "next";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://neurashell-eta.vercel.app"),
  title: "NeuraShell — computer-side intent control plane",
  description:
    "Control plane for high-bandwidth intent: gym, hard ARM gate, panic, calibrate, record/replay, Actuate OS dry-run. Simulator-first. Not implant software. Not a medical device. Not affiliated with Neuralink.",
  keywords: [
    "accessibility",
    "BCI",
    "intent",
    "control plane",
    "NeuraShell",
    "Neura Suite",
  ],
  openGraph: {
    title: "NeuraShell — 0.6.0",
    description:
      "Computer-side control plane: readiness, ARM, panic, calibrate, record/replay, OS dry-run. Not implant software.",
    type: "website",
    url: "https://neurashell-eta.vercel.app",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "NeuraShell" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuraShell",
    description:
      "Computer-side intent control plane. Simulator-first. Not a medical device.",
    images: ["/og.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-shell-bg text-shell-fg">
        {children}
      </body>
    </html>
  );
}
