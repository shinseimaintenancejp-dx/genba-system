"use strict";

import React from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { getPostLoginRedirect } from "@/lib/auth";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
}) => {
  const router = useRouter();
  const { data: user, isLoading, error } = useCurrentUser();

  // If loading user data, show standard animated spinner conforming to ui-ux-genba-spec.md
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">読み込み中...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated or API returned error, redirect to login
  if (!user || error) {
    if (typeof window !== "undefined") {
      router.replace("/login");
    }
    return null;
  }

  // If role is not allowed, show unauthorized access screen in Japanese
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">
          アクセス権限エラー
        </h1>
        <p className="text-muted-foreground mb-6">
          このページにアクセスする権限がありません。
        </p>
        <button
          onClick={() => router.replace(getPostLoginRedirect(user.role))}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  // Return protected content if all checks pass
  return <>{children}</>;
};
