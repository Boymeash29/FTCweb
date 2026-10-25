import Image from "next/image";

export default function RosterAvatar({ assetId, name, alt }: { assetId?: string | null; name: string; alt?: string | null }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return <span className="roster-avatar" aria-label={assetId ? undefined : `${name} initials`}>
    {assetId ? <Image src={`/api/media/${assetId}/download`} alt={alt?.trim() || `Portrait of ${name}`} fill sizes="64px" unoptimized/> : <span aria-hidden="true">{initials}</span>}
  </span>;
}
