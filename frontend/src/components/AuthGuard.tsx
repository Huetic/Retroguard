"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
  /** If provided, user must have this role (or admin) to access the page. */
  requiredRole?: "admin" | "supervisor" | "inspector";
}

/**
 * Wrap any page that requires authentication.
 * Redirects to /login if no valid session, and to / if the user's role is
 * insufficient (unless they are admin, who can access everything).
 */
export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requiredRole && user.role !== "admin" && user.role !== requiredRole) {
      router.replace("/");
    }
  }, [loading, user, requiredRole, router]);

  // While loading or about to redirect, render nothing
  if (loading || !user) return null;
  if (requiredRole && user.role !== "admin" && user.role !== requiredRole) return null;

  return <>{children}</>;
}
