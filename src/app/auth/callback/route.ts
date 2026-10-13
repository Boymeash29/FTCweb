import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/admin";
  if (code) {
    const response = NextResponse.redirect(new URL(next.startsWith("/") && !next.startsWith("//") ? next : "/admin", requestUrl.origin));
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return NextResponse.redirect(new URL("/admin/login?error=setup", requestUrl.origin));
    const supabase = createServerClient(url, key, { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => { cookies.forEach(({ name, value, options }) => { response.cookies.set(name, value, options); }); }
    } });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
  }
  return NextResponse.redirect(new URL("/admin/login?error=oauth", requestUrl.origin));
}
