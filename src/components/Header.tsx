import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { navigation } from "@/lib/content";
import ThemeToggle from "@/components/ThemeToggle";
import Image from "next/image";

export default function Header() {
  return <header className="site-header"><Link className="brand" href="/" aria-label="BuzzerBots · Seven Hills FTC home"><Image className="brand-logo" src="/buzzerbots-logo.svg" alt="" width={46} height={42}/><span><b>BUZZERBOTS</b><small>FTC · TEAM 23826</small></span></Link><nav className="desktop-nav" aria-label="Main navigation">{navigation.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav><div className="header-actions"><ThemeToggle /><Link className="nav-cta" href="/contact">Get in touch <ArrowUpRight size={14} /></Link><details className="mobile-menu"><summary aria-label="Open menu"><Menu size={20}/></summary><nav aria-label="Mobile navigation">{navigation.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}<Link href="/contact">Contact</Link></nav></details></div></header>;
}
