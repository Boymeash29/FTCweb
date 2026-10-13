import Link from "next/link";
import AuthRecoveryPasswordForm from "@/components/AuthRecoveryPasswordForm";

export const metadata = { title: "Set a new password", robots: { index: false, follow: false } };

export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main id="main-content" className="admin-shell">
      <div className="admin-card">
        <span className="section-tag">ACCOUNT RECOVERY</span>
        <h1>Set a new password<span className="period">.</span></h1>
        <p>Choose a new password for your BuzzerBots team CMS account.</p>
        <AuthRecoveryPasswordForm error={error} />
        <p><Link className="text-link" href="/admin/login">Back to team login →</Link></p>
      </div>
    </main>
  );
}
