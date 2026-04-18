import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import SearchCommand from "../components/SearchCommand";
import { AuthProvider } from "../lib/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RetroGuard · NHAI Retroreflectivity Command",
  description:
    "Highway retroreflectivity assessment & digital-twin control for Indian national corridors.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-full text-ink">
        {/* Glass tray behind the left sidebar — visible on every page */}
        <div
          aria-hidden
          className="fixed top-0 left-0 bottom-0 w-[272px] z-[1100] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(251,247,236,0.62) 0%, rgba(251,247,236,0.48) 100%)",
            backdropFilter: "blur(22px) saturate(170%)",
            WebkitBackdropFilter: "blur(22px) saturate(170%)",
            boxShadow:
              "inset -1px 0 0 rgba(255,255,255,0.30), inset 0 1px 0 rgba(255,255,255,0.55)",
          }}
        />
        <AuthProvider>
          <div className="flex gap-3 p-3 min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
          {/* Global search modal — opens via ⌘K or openGlobalSearch() */}
          <SearchCommand />
        </AuthProvider>
      </body>
    </html>
  );
}
