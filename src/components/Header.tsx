import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { navigation } from "@/lib/content";
import ThemeToggle from "@/components/ThemeToggle";

export default function Header() {
  return <header className="site-header"><Link className="brand" href="/" aria-label="Seven Hills FTC home"><span className="shared-mark" aria-hidden="true">SH</span><span><b>SEVEN HILLS FTC</b><small>TWO ROBOTICS TEAMS</small></span></Link><nav className="desktop-nav" aria-label="Main navigation">{navigation.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav><div className="header-actions"><ThemeToggle /><Link className="nav-cta" href="/members">Member portal <ArrowUpRight size={14} /></Link><details className="mobile-menu"><summary aria-label="Open menu"><Menu size={20}/></summary><nav aria-label="Mobile navigation">{navigation.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}<Link href="/members">Member portal</Link><Link href="/contact">Contact</Link></nav></details></div></header>;
}
