import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
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
  title: "Fitness Tracker | Daily Nutrition Dashboard",
  description:
    "Track daily macros, calories, and meal logs powered by FastAPI and Next.js",
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
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        {children}

        {/* Global toast notifications */}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#171717",
              color: "#fff",
              border: "1px solid #262626",
            },
          }}
        />
      </body>
    </html>
  );
}
