"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function AuthRecoveryRequestForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const supabase = createClient();
    if (!supabase) {
      setMessage("Password recovery is not configured right now. Please contact a team administrator.");
      setBusy(false);
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/recovery`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setMessage(error
      ? "We could not send the recovery email. Check the address and try again."
      : "If an account exists for that address, a password recovery link is on its way.");
    setBusy(false);
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label htmlFor="recovery-email">Email</label>
      <input id="recovery-email" name="email" type="email" autoComplete="username" required maxLength={254} />
      <button className="google-button" type="submit" disabled={busy}>{busy ? "Sending…" : "Send recovery link"} <b>→</b></button>
      {message && <p className="form-status" role="status">{message}</p>}
    </form>
  );
}
