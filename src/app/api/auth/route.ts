import { NextResponse } from "next/server";

const COOKIE = "radar_key";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 дней

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const passcode = process.env.APP_PASSCODE;
  // пароль не задан — защита выключена (локальный режим)
  if (!passcode) return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => ({}))) as { passcode?: string };
  const given = String(body.passcode ?? "");
  if (!given || given !== passcode) {
    return NextResponse.json(
      { error: "Неверный пароль. Проверьте раскладку и регистр." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await sha256Hex(`${passcode}::radar`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
  return res;
}
