import { NextResponse } from "next/server";
import { verifyCode } from "@/lib/telegram-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { code?: string };
    const code = (body.code ?? "").replace(/\D/g, "");
    if (code.length < 4) {
      return NextResponse.json({ error: "Введите код из Telegram" }, { status: 400 });
    }
    const result = await verifyCode(code);
    if ("needsPassword" in result) {
      return NextResponse.json({
        needsPassword: true,
        hint: result.hint ?? undefined,
      });
    }
    return NextResponse.json({ ok: true, user: result.user });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Не удалось подтвердить код" },
      { status: 400 },
    );
  }
}
