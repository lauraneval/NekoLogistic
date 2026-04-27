import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getRequiredRoles, isPublicRoute } from "@/lib/rbac-config";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const env = getEnv();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This will refresh the session if it's expired
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 1. If it's a public route, allow it
  if (isPublicRoute(pathname)) {
    return response;
  }

  // 2. If no user and not public, redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Avoid infinite redirect if already on login (redundant due to isPublicRoute but safe)
    if (pathname === "/login") return response;
    return NextResponse.redirect(url);
  }

  // 3. RBAC Check
  const requiredRoles = getRequiredRoles(pathname);
  if (requiredRoles) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || !requiredRoles.includes(profile.role as any)) {
      // If it's an API route, return 403
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // If it's a page, redirect to their home or login
      const url = request.nextUrl.clone();
      if (!profile) {
        url.pathname = "/login";
      } else {
        // Redirect to their respective dashboard
        const role = profile.role;
        url.pathname = role === "admin_gudang" ? "/admin-gudang" : `/${role}`;
        // If already on that path, avoid infinite loop (though RBAC would have passed)
        if (pathname === url.pathname) return response;
      }
      return NextResponse.redirect(url);
    }
  }

  return response;
}
