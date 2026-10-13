export type CmsRole = "admin" | "editor";
export type EntryStatus = "draft" | "scheduled" | "published" | "archived";

export function canPublishContent(role: CmsRole) { return role === "admin"; }
export function canManageCmsUsers(role: CmsRole) { return role === "admin"; }
export function canEditEntry(role: CmsRole, status: string) { return role === "admin" || status === "draft"; }
export function canMakeMediaPublic(role: CmsRole) { return role === "admin"; }
