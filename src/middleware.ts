import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/invoices") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("page", "invoices");

    const status = searchParams.get("status");
    const view = searchParams.get("view");
    if (status) url.searchParams.set("status", status);
    if (view) url.searchParams.set("view", view);

    return NextResponse.redirect(url);
  }

  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("page", "login");
    return NextResponse.redirect(url);
  }

  if (pathname === "/profile") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("page", "profile");
    return NextResponse.redirect(url);
  }

  if (pathname === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("page", "home");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/invoices", "/login", "/profile", "/dashboard"],
};
