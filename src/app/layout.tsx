import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminEditButton from "@/components/AdminEditButton";
import { getCmsUser } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";


export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: "BuzzerBots · Team 23826", template: "%s · BuzzerBots FTC" },
  description: "The engineering portfolio of Seven Hills FIRST Tech Challenge Team 23826.",
  openGraph: { title: "BuzzerBots · Team 23826", description: "Student engineering, documented.", type: "website" },
  robots: { index: true, follow: true }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user=await getCmsUser();
  return <html lang="en" data-theme="dark"><body><a href="#main-content" className="skip-link">Skip to content</a><Header />{children}<Footer />{user?.role==="admin"&&<AdminEditButton/>}</body></html>;
}
