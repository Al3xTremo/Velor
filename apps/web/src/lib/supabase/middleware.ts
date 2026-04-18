import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routeMatches } from "@/lib/routing/route-matcher";

const PRIVATE_ROUTES = [
  "/dashboard",
  "/analytics",
  "/budgets",
  "/onboarding",
  "/transactions",
  "/categories",
  "/goals",
  "/settings",
];
const AUTH_ROUTES = ["/auth/login", "/auth/register", "/auth/forgot-password"];

export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>
      ) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
        }

        response = NextResponse.next({ request });

        for (const cookie of cookiesToSet) {
          if (cookie.options) {
            response.cookies.set({
              name: cookie.name,
              value: cookie.value,
              ...(cookie.options as Record<string, unknown>),
            });
          } else {
            response.cookies.set(cookie.name, cookie.value);
          }
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPrivateRoute = routeMatches(pathname, PRIVATE_ROUTES);
  const isAuthRoute = routeMatches(pathname, AUTH_ROUTES);

  if (!user && isPrivateRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
};
