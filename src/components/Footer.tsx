import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Footer() {
  return <footer className="site-footer"><div className="footer-top"><div><Link className="brand footer-brand" href="/" aria-label="Seven Hills FTC home"><span className="shared-mark" aria-hidden="true">SH</span><span><b>SEVEN HILLS FTC</b><small>TWO ROBOTICS TEAMS</small></span></Link><p>Student engineering, documented.</p></div><div className="footer-links"><Link href="/teams">Teams</Link><Link href="/robot">Robot</Link><Link href="/engineering">Engineering</Link><Link href="/seasons">Seasons</Link><Link href="/journal">Journal</Link><Link href="/members">Members</Link><Link href="/contact">Contact <ArrowUpRight size={13}/></Link></div></div><div className="footer-bottom"><span>Seven Hills School · FIRST Tech Challenge</span><div><Link href="/privacy">Privacy</Link><Link href="/accessibility">Accessibility</Link><Link href="/admin/login">Team login</Link></div><span>Designed for the work.</span></div></footer>;
}
