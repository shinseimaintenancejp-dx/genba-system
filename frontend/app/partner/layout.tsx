"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/hooks/useAuth";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Building2, LayoutDashboard, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@/hooks/useAuth";
import { useHeaderStore } from "@/store/useHeaderStore";

function PartnerSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();

  const menuItems = [
    {
      title: "担当現場一覧",
      path: "/partner/genba",
      icon: Building2,
    },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[#0F172A] text-slate-100 transition-all duration-300 ease-in-out shrink-0 border-r border-slate-800",
        collapsed ? "w-[72px]" : "w-[280px]"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
        <Link href="/partner/genba" className="flex items-center gap-2 overflow-hidden">
          <LayoutDashboard className="h-6 w-6 text-blue-500 shrink-0" />
          {!collapsed && (
            <span className="font-bold text-lg tracking-wider text-white whitespace-nowrap">
              パートナー・ポータル
            </span>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all group relative",
                isActive
                  ? "bg-[#1E293B] text-white"
                  : "text-slate-400 hover:bg-[#1E293B]/50 hover:text-white"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-blue-500" : "text-slate-400 group-hover:text-slate-100")} />
              {!collapsed && <span className="whitespace-nowrap">{item.title}</span>}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-16 z-50 rounded bg-slate-950 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap shadow-md border border-slate-800">
                  {item.title}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User & Collapse Toggle */}
      <div className="p-3 border-t border-slate-800 flex flex-col gap-2">
        {!collapsed && user && (
          <div className="px-3 py-2 text-sm text-slate-400 truncate">
            {user.full_name}
          </div>
        )}
        <div className="flex justify-end">
          <button
            onClick={onToggle}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-[#1E293B] hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </aside>
  );
}

function PartnerHeader() {
  const { mutate: logout } = useLogout();
  const { title, description } = useHeaderStore();
  
  return (
    <header className="flex h-auto min-h-16 w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">パートナー向け管理画面</span>
          {title && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-slate-600">{title}</span>
            </>
          )}
        </div>
        {title && <h1 className="text-xl font-bold text-slate-900 leading-tight mt-1">{title}</h1>}
        {description && <div className="text-sm text-slate-500 mt-1">{description}</div>}
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          ログアウト
        </button>
      </div>
    </header>
  );
}

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <RoleGuard allowedRoles={["PARTNER"]}>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans antialiased text-[#0F172A]">
        <PartnerSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <PartnerHeader />
          <main className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto max-w-[1400px] w-full flex flex-col gap-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
