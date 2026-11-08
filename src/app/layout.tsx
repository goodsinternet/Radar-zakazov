import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Радар заказов — агрегатор фриланс-заказов",
  description:
    "Персональный агрегатор заказов с бирж фриланса: живая лента FL.ru, умные фильтры по нише, бюджету и ключевым словам, автоскрытие мусора и дублей.",
  keywords: ["фриланс", "заказы", "FL.ru", "Kwork", "биржи фриланса", "поиск заказов"],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
