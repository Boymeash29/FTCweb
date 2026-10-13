import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  return <footer className="site-footer"><div className="footer-top"><div><Link className="brand footer-brand" href="/" aria-label="BuzzerBots · Seven Hills FTC home"><Image className="brand-logo" src="/buzzerbots-logo.svg" alt="" width={46} height={42}/><span><b>BUZZERBOTS</b><small>FTC · TEAM 23826</small></span></Link><p>Student engineering, documented.</p></div><div className="footer-links"><Link href="/robot">Robot</Link><Link href="/engineering">Engineering</Link><Link href="/projects">Projects</Link><Link href="/seasons">Seasons</Link><Link href="/journal">Journal</Link><Link href="/contact">Contact <ArrowUpRight size={13}/></Link></div></div><div className="footer-bottom"><span>Seven Hills School · FIRST Tech Challenge</span><div><Link href="/privacy">Privacy</Link><Link href="/accessibility">Accessibility</Link><Link href="/admin/login">Team login</Link></div><span>Designed for the work.</span></div></footer>;
}
