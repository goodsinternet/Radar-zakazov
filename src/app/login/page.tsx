"use client";

import * as React from "react";
import { Loader2, LockKeyhole, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeProvider } from "@/components/theme-provider";

export default function LoginPage() {
  const [passcode, setPasscode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось войти");
        setBusy(false);
        return;
      }
      // полная перезагрузка, чтобы middleware увидел cookie
      window.location.href = "/";
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
      setBusy(false);
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <main className="grid min-h-screen place-items-center bg-background p-4 text-foreground">
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-2 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
              <Radar className="size-6" aria-hidden="true" />
            </span>
            <CardTitle className="text-xl">Радар заказов</CardTitle>
            <CardDescription>
              Сайт закрыт паролем. Введите пароль доступа, который вы задали в
              настройках Vercel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passcode">Пароль</Label>
                <Input
                  id="passcode"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  disabled={busy}
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={busy || !passcode}>
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Проверяем…
                  </>
                ) : (
                  <>
                    <LockKeyhole className="size-4" aria-hidden="true" />
                    Войти
                  </>
                )}
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Забыли пароль? Его можно поменять в Vercel: Project → Settings →
                Environment Variables → APP_PASSCODE. После смены войдите с
                новым паролем.
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </ThemeProvider>
  );
}
