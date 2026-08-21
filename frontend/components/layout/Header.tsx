"use client";

import React from "react";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { getRoleLabel } from "@/lib/auth";
import { LogOut, User as UserIcon, Loader2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useHeaderStore } from "@/store/useHeaderStore";

export const Header: React.FC = () => {
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const { title, description } = useHeaderStore();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="flex h-auto min-h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shrink-0 py-3">
      {/* Search Bar Placeholder or Title */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">オフィス管理パネル</span>
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

      {/* User Actions */}
      <div className="flex items-center gap-4">
        {user ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button 
                className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 transition-colors focus:outline-none"
                aria-label="User menu"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-xs font-semibold text-slate-800 leading-tight">
                    {user.full_name}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {getRoleLabel(user.role)}
                  </p>
                </div>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[180px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg z-50 text-sm focus:outline-none animate-in fade-in-50 slide-in-from-top-1"
                align="end"
                sideOffset={5}
              >
                <DropdownMenu.Label className="px-2 py-1.5 text-xs text-slate-500 font-semibold border-b border-slate-100">
                  マイアカウント
                </DropdownMenu.Label>
                
                <DropdownMenu.Item className="px-2 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-100 rounded cursor-default focus:outline-none">
                  <span className="text-xs font-medium truncate block max-w-[150px]">
                    ID: {user.username}
                  </span>
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  onClick={handleLogout}
                  className="px-2 py-2 flex items-center gap-2 text-destructive hover:bg-destructive/10 rounded cursor-pointer focus:outline-none"
                >
                  {logoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                  ) : (
                    <LogOut className="h-4 w-4 text-destructive" />
                  )}
                  <span>{logoutMutation.isPending ? "ログアウト中..." : "ログアウト"}</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : (
          <div className="flex h-8 w-20 items-center justify-center bg-slate-100 rounded-full animate-pulse" />
        )}
      </div>
    </header>
  );
};
