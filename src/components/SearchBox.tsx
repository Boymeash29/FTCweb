"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { searchPublicSections } from "@/lib/content";
export default function SearchBox(){const [query,setQuery]=useState("");const results=useMemo(()=>searchPublicSections(query),[query]);return <div className="search-panel"><label htmlFor="site-search">Search the site</label><div className="search-input"><Search size={18}/><input id="site-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try robot, software, or seasons"/><kbd>ENTER</kbd></div>{query&&<div className="search-results" aria-live="polite">{results.length?results.map(r=><Link href={r.href} key={r.href}><span><small>{r.type}</small><b>{r.title}</b></span><Search size={14}/></Link>):<p>No published pages match “{query}”.</p>}</div>}<p className="search-note">Search currently covers public section pages. Published CMS content search is a database-backed launch task.</p></div>;}
