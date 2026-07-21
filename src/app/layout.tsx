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
  title: "NeuraShell — computer-side intent control plane",
  description:
    "Daily-driver computer-side control plane for high-bandwidth intent users: mode switch, panic stop/undo, confidence, local profiles, session ready. Simulator-first. Not implant software. Not a medical device. Not affiliated with Neuralink.",
  keywords: [
    "accessibility",
    "BCI",
    "intent",
    "control plane",
    "NeuraShell",
    "Neura Suite",
  ],
  openGraph: {
    title: "NeuraShell",
    description:
      "Computer-side control plane for high-bandwidth intent: modes, panic, profiles, session ready.",
    type: "website",
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
