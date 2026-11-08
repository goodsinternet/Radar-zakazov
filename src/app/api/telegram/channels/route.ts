import { NextResponse } from "next/server";
import { addChannel, removeChannel, telegramStatus } from "@/lib/telegram-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const status = await telegramStatus();
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { username?: string };
    const result = await addChannel(body.username ?? "");
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Не удалось добавить канал" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { username?: string };
    const url = new URL(req.url);
    const username = body.username ?? url.searchParams.get("username") ?? "";
    if (!username) {
      return NextResponse.json({ error: "Не указан канал" }, { status: 400 });
    }
    await removeChannel(username);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Не удалось удалить канал" },
      { status: 400 },
    );
  }
}
