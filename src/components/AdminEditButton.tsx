"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pencil } from "lucide-react";

function editorPath(pathname:string) {
  const path=decodeURIComponent(pathname).replace(/\/$/,"")||"/";
  if(path==="/")return "/admin/pages/home";
  const parts=path.split("/").filter(Boolean);
  if(parts[0]==="admin"||parts[0]==="api")return null;
  if(["news","journal","projects"].includes(parts[0])&&parts.length===2)return `/admin/content/by-slug/${encodeURIComponent(parts[1])}`;
  if(parts[0]==="mechanisms"&&parts.length===2)return `/admin/mechanisms/${encodeURIComponent(parts[1])}`;
  if(parts[0]==="seasons"&&parts.length===2)return `/admin/pages/season-${encodeURIComponent(parts[1])}`;
  return `/admin/pages/${encodeURIComponent(parts[0])}`;
}

export default function AdminEditButton(){
  const pathname=usePathname();const href=editorPath(pathname);
  if(!href)return null;
  return <Link className="admin-edit-page" href={href}><Pencil size={15}/> Edit this page</Link>;
}
