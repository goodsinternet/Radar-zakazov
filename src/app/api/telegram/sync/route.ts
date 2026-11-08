import { NextResponse } from "next/server";
import { syncOrders } from "@/lib/telegram-client";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST — принудительная синхронизация по кнопке в интерфейсе */
export async function POST() {
  const result = await syncOrders(true);
  return NextResponse.json(
    {
      ok: result.error === null,
      count: result.orders.length,
      error: result.error,
      perChannel: result.perChannel,
      at: result.at,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** GET — лёгкий «пульс» для планировщика (cron Vercel / cron-job.org):
 *  без принуждения, с учётом внутреннего кэша */
export async function GET() {
  const result = await syncOrders(false);
  return NextResponse.json(
    {
      ok: result.error === null,
      count: result.orders.length,
      error: result.error,
      at: result.at,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
