"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function AuthRecoveryRedirect() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (fragment.get("type") !== "recovery") return;

    handled.current = true;
    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    if (!accessToken || !refreshToken) {
      router.replace("/auth/recovery?error=invalid");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      router.replace("/auth/recovery?error=setup");
      return;
    }

    void supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => router.replace(error ? "/auth/recovery?error=invalid" : "/auth/recovery"))
      .catch(() => router.replace("/auth/recovery?error=invalid"));
  }, [router]);

  return null;
}
