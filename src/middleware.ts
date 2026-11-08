import { NextRequest, NextResponse } from "next/server";

/**
 * Простая защита личного радара паролем.
 * Если переменная APP_PASSCODE не задана — защита выключена
 * (локальная разработка и песочница работают без пароля).
 */

const COOKIE = "radar_key";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (
    pathname === "/login" ||
    pathname === "/api/auth" ||
    pathname === "/favicon.ico" ||
    pathname === "/logo.svg" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  const expected = await sha256Hex(`${passcode}::radar`);
  if (req.cookies.get(COOKIE)?.value === expected) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Требуется вход — откройте сайт и введите пароль." },
      { status: 401 },
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
