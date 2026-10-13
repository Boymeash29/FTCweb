"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/browser";

type State = "loading" | "ready" | "success" | "invalid" | "setup";

export default function AuthRecoveryPasswordForm({ error: queryError }: { error?: string }) {
  const [state, setState] = useState<State>(queryError === "setup" ? "setup" : queryError ? "invalid" : "loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (queryError) return;
    let cancelled = false;
    async function prepare() {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) setState("setup");
        return;
      }

      const currentUrl = new URL(window.location.href);
      const code = currentUrl.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState(null, "", "/auth/recovery");
        if (error) {
          if (!cancelled) setState("invalid");
          return;
        }
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (!cancelled) setState(error || !session ? "invalid" : "ready");
    }
    void prepare();
    return () => { cancelled = true; };
  }, [queryError]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) {
      setMessage("Those passwords do not match.");
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setMessage("Choose a password between 8 and 128 characters.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setState("setup");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage("We could not update the password. The recovery link may have expired; request a new one and try again.");
      setBusy(false);
      return;
    }
    await supabase.auth.signOut();
    setState("success");
    setBusy(false);
  }

  return (
    <div>
      {state === "loading" && <p role="status">Checking your recovery link…</p>}
      {state === "ready" && <form className="login-form" onSubmit={submit}>
        <label htmlFor="password">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
        <label htmlFor="confirmation">Confirm new password</label>
        <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
        <button className="google-button" type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"} <b>→</b></button>
        {message && <p className="form-error" role="alert">{message}</p>}
      </form>}
      {state === "success" && <div className="form-status" role="status">Password updated. <Link className="text-link" href="/admin/login">Sign in to the team CMS →</Link></div>}
      {state === "invalid" && <div className="form-error" role="alert">That recovery link is invalid or has expired. Request a new one and open the newest email link.</div>}
      {state === "setup" && <div className="form-error" role="alert">Supabase Auth is not configured for password recovery. Please contact a team administrator.</div>}
      {(state === "invalid" || state === "setup") && <Link className="text-link" href="/admin/forgot-password">Request another recovery link →</Link>}
    </div>
  );
}
