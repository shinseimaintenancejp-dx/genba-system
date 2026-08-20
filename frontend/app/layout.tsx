import type { Metadata, Viewport } from "next";
// import { Noto_Sans_JP, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// =============================================================================
// Font Configuration (FE§5.1)
// Primary: Noto Sans JP — covers all Japanese characters
// Mono: JetBrains Mono — for codes, IDs, timestamps
// =============================================================================
// Font variables are defined in globals.css now
const notoSansJP = { variable: "--font-noto-sans-jp" };
const jetbrainsMono = { variable: "--font-jetbrains-mono" };

// =============================================================================
// SEO Metadata
// =============================================================================
export const metadata: Metadata = {
  title: {
    default: "現場管理システム | 株式会社シンセイ",
    template: "%s | 現場管理システム",
  },
  description:
    "株式会社シンセイの現場管理システム。359以上の現場情報を一元管理します。",
  keywords: ["現場管理", "シンセイ", "清掃管理", "ビル管理"],
  authors: [{ name: "Shinsei Co., Ltd." }],
  robots: "noindex, nofollow",  // Internal system — do not index
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,  // Prevent user scaling on mobile forms
};

// =============================================================================
// Root Layout — Wraps all pages
// Providers added in subsequent Sprints:
//   Sprint 2: AuthProvider (JWT session)
//   Sprint 2: QueryClientProvider (TanStack Query)
//   Sprint 2: ToastProvider (shadcn/ui Toaster)
// =============================================================================
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const RootLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <html
      lang="ja"
      className={cn(notoSansJP.variable, jetbrainsMono.variable, "font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-background font-sans subpixel-antialiased"
        style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
      >
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
};

export default RootLayout;
