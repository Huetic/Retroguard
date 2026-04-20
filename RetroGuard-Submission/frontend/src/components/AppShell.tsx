"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import SearchCommand from "./SearchCommand";
import { useAuth } from "../lib/auth";

/**
 * App-level gate:
 *   • /login renders bare (no sidebar, no auth check)
 *   • every other route requires an authenticated session; unauthenticated
 *     visitors are redirected to /login
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isLogin = pathname === "/login";

  useEffect(() => {
    if (isLogin) return;
    if (loading) return;
    if (!user) router.replace("/login");
  }, [isLogin, loading, user, router]);

  // Login page renders without the shell
  if (isLogin) return <>{children}</>;

  // Block rendering (and flashing the UI) while we resolve auth / redirect
  if (loading || !user) return null;

  return (
    <>
      {/* Glass tray behind the left sidebar */}
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
      <div className="flex gap-3 p-3 min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <SearchCommand />
    </>
  );
}
