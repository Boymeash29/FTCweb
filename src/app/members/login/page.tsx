import Link from "next/link";
import { requestMemberSignIn } from "@/app/members/actions";

export const metadata = { title: "Member sign in", robots: { index: false, follow: false } };

export default async function MemberLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { error, sent } = await searchParams;
  const messages: Record<string, string> = {
    setup: "Member sign-in is not connected yet. Contact a team administrator.",
    email: "Enter a valid email address.",
    send: "We could not send a sign-in link. Wait a moment and try again."
  };
  return <main id="main-content" className="member-shell">
    <section className="member-login-card">
      <span className="section-tag">SEVEN HILLS FTC · MEMBERS</span>
      <h1>Your team space<span className="period">.</span></h1>
      <p>Sign in with the email your team administrator approved. We’ll send a secure, one-time link—no password to remember.</p>
      {sent && <div className="notice-success" role="status">If this address has member access, a sign-in link is on its way. Check your inbox.</div>}
      {error && <div className="form-error" role="alert">{messages[error] ?? "We could not complete sign-in."}</div>}
      <form action={requestMemberSignIn} className="entry-form member-login-form">
        <label htmlFor="member-email">Team email</label>
        <input id="member-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" />
        <button className="button-link" type="submit">Email me a sign-in link <span>→</span></button>
      </form>
      <Link className="member-back-link" href="/members">← Back to members</Link>
      <small>Not approved yet? Ask a mentor or administrator to add your email and team.</small>
    </section>
  </main>;
}
