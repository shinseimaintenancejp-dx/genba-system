"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { RoleGuard } from "@/components/layout/RoleGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Office roles allowed to access desktop admin panel
  const allowedRoles = ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"];

  return (
    <RoleGuard allowedRoles={allowedRoles}>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans antialiased text-[#0F172A]">
        {/* Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Content Wrapper */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <Header />

          {/* Main Content Area */}
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
