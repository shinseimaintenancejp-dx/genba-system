"use client";

import React, { useState, useEffect } from "react";
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
  Briefcase,
  ChevronDown,
  ChevronUp,
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
  children?: Omit<MenuItem, 'icon' | 'children'>[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed: externalCollapsed,
  onToggle,
}) => {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [openMenuTitle, setOpenMenuTitle] = useState<string | null>(null);

  const toggleMenu = (title: string) => {
    setOpenMenuTitle((prev) => (prev === title ? null : title));
  };

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
      children: [
        {
          title: "全現場",
          path: "/genba",
          roles: ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"],
          module: null,
        },
        {
          title: "定期現場",
          path: "/genba/periodic",
          roles: ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"],
          module: null,
        }
      ]
    },
    {
      title: "契約管理",
      path: "/contracts",
      icon: FileText,
      roles: ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF", "PARTNER"],
      module: "contracts",
      children: [
        {
          title: "取引先契約(元請契約)",
          path: "/contracts/receiving",
          roles: ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"],
          module: "contracts",
        },
        {
          title: "協力会社契約(下請契約)",
          path: "/contracts/ordering",
          roles: ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF", "PARTNER"],
          module: "contracts",
        },
      ],
    },
    {
      title: "請求管理",
      path: "/invoices",
      icon: Receipt,
      roles: ["ADMIN", "SENIOR_STAFF"],
      module: "invoices",
    },
    {
      title: "取引先管理",
      path: "/customers",
      icon: Users,
      roles: ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"],
      module: "customers",
    },
    {
      title: "協力会社管理",
      path: "/partners",
      icon: Briefcase,
      roles: ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"],
      module: "partners",
    },
    {
      title: "承認ワークフロー",
      path: "/approvals",
      icon: CheckSquare,
      roles: ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"],
      module: "approvals",
    },
    {
      title: "組織・ユーザー管理",
      path: "",
      icon: ShieldCheck,
      roles: ["ADMIN"],
      module: null,
      children: [
        {
          title: "ユーザー管理",
          path: "/admin/users",
          roles: ["ADMIN"],
          module: null,
        },
        {
          title: "従業員管理",
          path: "/admin/staff",
          roles: ["ADMIN"],
          module: null,
        },
        {
          title: "役職管理",
          path: "/admin/positions",
          roles: ["ADMIN"],
          module: null,
        },
      ],
    },
  ];

  const filteredItems = menuItems
    .filter((item) => {
      if (!user) return false;
      if (!item.roles.includes(user.role)) return false;
      if (item.module !== null && !isModuleEnabled(item.module)) return false;
      return true;
    })
    .map((item) => {
      if (!item.children) return item;
      // Filter children by role and module as well
      const filteredChildren = item.children.filter((child) => {
        if (!user) return false;
        if (!child.roles.includes(user.role)) return false;
        if (child.module !== null && !isModuleEnabled(child.module)) return false;
        return true;
      });
      return { ...item, children: filteredChildren };
    });

  // Auto-expand parent menu corresponding to the active pathname on mount/route change
  useEffect(() => {
    const activeItem = filteredItems.find((item) =>
      item.children?.some((child) =>
        child.path === "/genba"
          ? pathname === "/genba"
          : pathname.startsWith(child.path)
      )
    );
    if (activeItem) {
      setOpenMenuTitle(activeItem.title);
    }
  }, [pathname]);

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
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = openMenuTitle === item.title;
          const isChildActive = hasChildren && item.children!.some(child => pathname.startsWith(child.path));
          const isActive = hasChildren ? isChildActive : pathname.startsWith(item.path);

          return (
            <div key={item.title} className="flex flex-col">
              {hasChildren ? (
                <button
                  onClick={() => {
                    if (isCollapsed) toggleCollapse();
                    toggleMenu(item.title);
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-3 rounded-lg text-base font-medium transition-all group relative",
                    isActive
                      ? "bg-[#1E293B] text-white"
                      : "text-slate-300 hover:bg-[#1E293B]/50 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        isActive ? "text-blue-500" : "text-slate-400 group-hover:text-slate-100"
                      )}
                    />
                    {!isCollapsed && <span className="whitespace-nowrap">{item.title}</span>}
                  </div>
                  {!isCollapsed && (
                    isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                  {isCollapsed && (
                    <div className="absolute left-16 z-50 rounded bg-slate-950 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap shadow-md border border-slate-800">
                      {item.title}
                    </div>
                  )}
                </button>
              ) : (
                <Link
                  href={item.path}
                  onClick={() => {
                    setOpenMenuTitle(null);
                  }}
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
                      isActive ? "text-blue-500" : "text-slate-400 group-hover:text-slate-100"
                    )}
                  />
                  {!isCollapsed && <span className="whitespace-nowrap">{item.title}</span>}

                  {isCollapsed && (
                    <div className="absolute left-16 z-50 rounded bg-slate-950 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap shadow-md border border-slate-800">
                      {item.title}
                    </div>
                  )}
                </Link>
              )}

              {/* Submenu rendering */}
              {hasChildren && !isCollapsed && isExpanded && (
                <div className="ml-9 mt-1 flex flex-col space-y-1">
                  {item.children!.map((child) => {
                    const isChildPathActive = child.path === "/genba" 
                      ? pathname === "/genba" 
                      : pathname.startsWith(child.path);
                    return (
                      <Link
                        key={child.path}
                        href={child.path}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                          isChildPathActive
                            ? "bg-[#1E293B]/80 text-blue-400"
                            : "text-slate-400 hover:bg-[#1E293B]/30 hover:text-slate-200"
                        )}
                      >
                        {child.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
