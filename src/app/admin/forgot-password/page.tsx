import Link from "next/link";
import AuthRecoveryRequestForm from "@/components/AuthRecoveryRequestForm";

export const metadata = { title: "Recover team login", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <main id="main-content" className="admin-shell">
      <div className="admin-card">
        <span className="section-tag">ACCOUNT RECOVERY</span>
        <h1>Recover your login<span className="period">.</span></h1>
        <p>Enter your team CMS email and we’ll send a link to set a new password.</p>
        <AuthRecoveryRequestForm />
        <Link className="text-link" href="/admin/login">Back to team login →</Link>
      </div>
    </main>
  );
}
