import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";

export default function NotFound() {
  return <main id="main-content" className="not-found wrap"><span className="section-tag">404 / NOT FOUND</span><div className="not-found-number">404<span>.</span></div><h1>This page isn&apos;t<br/>in the workshop.</h1><p>That address may have moved. Try the portfolio or season archive.</p><div><Link className="button-link" href="/">Back home <ArrowUpRight size={16}/></Link><Link className="text-link" href="/search"><Search size={15}/> Search the site</Link></div></main>;
}
