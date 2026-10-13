import { signInWithPassword } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Team login", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/admin");
  }
  const { error } = await searchParams;
  const messages: Record<string, string> = {
    setup: "Authentication is not configured. Follow the setup guide to connect Supabase Auth.",
    credentials: "Email or password was not accepted. Check your details and try again.",
    access: "This account is not approved for team CMS access.",
  };

  return (
    <main id="main-content" className="admin-shell">
      <div className="admin-card">
        <span className="section-tag">TEAM ADMINISTRATION</span>
        <h1>Team CMS<span className="period">.</span></h1>
        <p>Sign in with your approved team CMS email and password.</p>
        {error && <div role="alert" className="form-error">{messages[error] ?? "Sign-in failed. Please try again."}</div>}
        <form action={signInWithPassword} className="login-form">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={128} />
          <button className="google-button" type="submit">Sign in <b>→</b></button>
        </form>
        <small>Access is limited to accounts explicitly approved by a team administrator.</small>
      </div>
    </main>
  );
}
