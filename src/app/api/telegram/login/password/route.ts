import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/telegram-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { password?: string };
    const password = (body.password ?? "").trim();
    if (!password) {
      return NextResponse.json({ error: "Введите пароль" }, { status: 400 });
    }
    const result = await verifyPassword(password);
    return NextResponse.json({ ok: true, user: result.user });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Не удалось войти" },
      { status: 400 },
    );
  }
}
