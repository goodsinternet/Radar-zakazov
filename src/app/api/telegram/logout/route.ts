import { NextResponse } from "next/server";
import { logout } from "@/lib/telegram-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    await logout();
    return NextResponse.json({ ok: true });
  } catch {
    // даже если Telegram не ответил — локальную сессию чистим
    return NextResponse.json({ ok: true });
  }
}
