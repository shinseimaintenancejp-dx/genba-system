"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  Building2,
  Users,
  FileText,
  Receipt,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isModuleEnabled } from "@/lib/modules";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

interface MenuItem {
  title: string;
  path: string;
  icon: React.ElementType;
  roles: string[];
  /** Module name used in ENABLED_MODULES check. Null means always shown. */
  module: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed: externalCollapsed,
  onToggle,
}) => {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const isCollapsed =
    externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const toggleCollapse = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  // Define menu items with required roles and feature module name
  const menuItems: MenuItem[] = [
    {
      title: "現場管理",
      path: "/genba",
      icon: Building2,
      roles: ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"],
      module: null, // core — always shown
    },
    {
      title: "取引先管理",
      path: "/customers",
      icon: Users,
      roles: ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"],
      module: "customers",
    },
    {
      title: "契約管理",
      path: "/contracts",
      icon: FileText,
      roles: ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"],
      module: "contracts",
    },
    {
      title: "請求管理",
      path: "/invoices",
      icon: Receipt,
      roles: ["ADMIN", "SENIOR_STAFF"],
      module: "invoices",
    },
    {
      title: "承認ワークフロー",
      path: "/approvals",
      icon: CheckSquare,
      roles: ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"],
      module: "approvals",
    },
    {
      title: "ユーザー管理",
      path: "/admin/users",
      icon: ShieldCheck,
      roles: ["ADMIN"],
      module: null, // always visible to admins
    },
  ];

  const filteredItems = menuItems.filter((item) => {
    if (!user) return false;

    // Check role permission
    if (!item.roles.includes(user.role)) return false;

    // Check feature module is enabled (null = always enabled)
    if (item.module !== null && !isModuleEnabled(item.module)) return false;

    return true;
  });

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[#0F172A] text-slate-100 transition-all duration-300 ease-in-out shrink-0 border-r border-slate-800",
        isCollapsed ? "w-[72px]" : "w-[280px]"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
        <Link href="/genba" className="flex items-center gap-2 overflow-hidden">
          <LayoutDashboard className="h-6 w-6 text-blue-500 shrink-0" />
          {!isCollapsed && (
            <span className="font-bold text-lg tracking-wider text-white whitespace-nowrap">
              現場管理システム
            </span>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-all group relative",
                isActive
                  ? "bg-[#1E293B] text-white"
                  : "text-slate-300 hover:bg-[#1E293B]/50 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive
                    ? "text-blue-500"
                    : "text-slate-400 group-hover:text-slate-100"
                )}
              />
              {!isCollapsed && (
                <span className="whitespace-nowrap">{item.title}</span>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-16 z-50 rounded bg-slate-950 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap shadow-md border border-slate-800">
                  {item.title}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle Button */}
      <div className="p-3 border-t border-slate-800 flex justify-end">
        <button
          onClick={toggleCollapse}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-[#1E293B] hover:text-white transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
    </aside>
  );
};
