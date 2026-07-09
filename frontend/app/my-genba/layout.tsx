"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { useLogout } from "@/hooks/useAuth";
import { Building2, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorkerMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { mutate: logout } = useLogout();

  return (
    <RoleGuard allowedRoles={["WORKER"]}>
      <div className="flex flex-col min-h-screen bg-slate-50 font-sans antialiased text-[#0F172A] pb-[72px]">
        {/* Topbar */}
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-white/95 backdrop-blur border-b border-border px-4">
          <div className="font-bold text-lg text-blue-600">マイ現場</div>
          <button 
            onClick={() => logout()}
            className="flex items-center justify-center p-2 text-slate-500"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-lg mx-auto">
          {children}
        </main>

        {/* Bottom Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-[72px] items-center justify-around bg-white border-t border-border pb-safe">
          <Link
            href="/my-genba"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1",
              pathname === "/my-genba" || pathname.startsWith("/my-genba/")
                ? "text-blue-600"
                : "text-slate-500"
            )}
          >
            <Building2 className="h-6 w-6" />
            <span className="text-[10px] font-medium">現場一覧</span>
          </Link>
          <Link
            href="/my-genba/profile"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1",
              pathname === "/my-genba/profile"
                ? "text-blue-600"
                : "text-slate-500"
            )}
          >
            <User className="h-6 w-6" />
            <span className="text-[10px] font-medium">マイページ</span>
          </Link>
        </nav>
      </div>
    </RoleGuard>
  );
}
