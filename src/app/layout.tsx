import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminEditButton from "@/components/AdminEditButton";
import AuthRecoveryRedirect from "@/components/AuthRecoveryRedirect";
import { getCmsUser } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";


export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: "Seven Hills FTC Teams", template: "%s · Seven Hills FTC" },
  description: "The FIRST Tech Challenge teams of Seven Hills School: BuzzerBots 23826 and Hive Mind 36438.",
  openGraph: { title: "Seven Hills FTC Teams", description: "Student engineering, documented.", type: "website" },
  robots: { index: true, follow: true }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user=await getCmsUser();
  return <html lang="en" data-theme="dark"><body><a href="#main-content" className="skip-link">Skip to content</a><AuthRecoveryRedirect/><Header />{children}<Footer />{user?.role==="admin"&&<AdminEditButton/>}</body></html>;
}
