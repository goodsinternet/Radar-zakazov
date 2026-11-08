import { NextResponse } from "next/server";
import { telegramStatus } from "@/lib/telegram-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await telegramStatus();
    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { connected: false, error: e instanceof Error ? e.message : "Ошибка статуса" },
      { status: 500 },
    );
  }
}
