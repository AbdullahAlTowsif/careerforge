"use client";

import { useEffect, useState } from "react";
import { serverFetch } from "@/lib/serverFetch";
import type { User } from "@/types/user";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    serverFetch<User>("/auth/me")
      .then((data) => {
        if (active) setUser(data);
      })
      .catch(() => {
        // serverFetch redirects to /login on failure
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Loading your dashboard...</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">
        Welcome{user?.fullName ? `, ${user.fullName}` : ""} 👋
      </h1>
      <p className="text-muted-foreground">
        You&apos;re logged in. Your full dashboard is coming soon.
      </p>
    </div>
  );
}
