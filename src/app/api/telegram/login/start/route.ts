import { NextResponse } from "next/server";
import { startLogin } from "@/lib/telegram-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      apiId?: string | number;
      apiHash?: string;
      phone?: string;
    };

    const apiId = Number(String(body.apiId ?? "").trim());
    const apiHash = (body.apiHash ?? "").trim();
    let phone = (body.phone ?? "").replace(/[^\d+]/g, "");

    if (!Number.isInteger(apiId) || apiId <= 0) {
      return NextResponse.json({ error: "Укажите числовой api_id с my.telegram.org" }, { status: 400 });
    }
    if (!/^[a-f0-9]{32}$/i.test(apiHash)) {
      return NextResponse.json(
        { error: "api_hash — 32 символа (буквы и цифры). Скопируйте его целиком." },
        { status: 400 },
      );
    }
    if (!/^\+?\d{7,15}$/.test(phone)) {
      return NextResponse.json(
        { error: "Телефон в формате +79991234567" },
        { status: 400 },
      );
    }
    if (!phone.startsWith("+")) phone = `+${phone}`;

    const { isCodeViaApp } = await startLogin(apiId, apiHash, phone);
    return NextResponse.json({ sent: true, isCodeViaApp });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Не удалось отправить код" },
      { status: 400 },
    );
  }
}
