import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/lib/i18n";

/**
 * Every page lives under /nl or /en. Paths without a locale are redirected
 * to Dutch (the default), so "/" -> "/nl" and "/services" -> "/nl/services".
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Skip API routes, Next internals, metadata files and anything with a file extension.
  matcher: ["/((?!api|_next|icon|apple-icon|opengraph-image|sitemap.xml|robots.txt|.*\\..*).*)"],
};
