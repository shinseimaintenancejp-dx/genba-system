"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { PREVIEW_MODE } from "@/lib/preview";

export const PreviewBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if we are in preview mode and haven't dismissed it
    if (PREVIEW_MODE) {
      const isDismissed = localStorage.getItem("genba_preview_banner_dismissed");
      if (!isDismissed) {
        setIsVisible(true);
      }
    }
  }, []);

  if (!isVisible) return null;

  const handleDismiss = () => {
    localStorage.setItem("genba_preview_banner_dismissed", "true");
    setIsVisible(false);
  };

  return (
    <div className="bg-amber-100 border-b border-amber-200 text-amber-800 px-4 py-2 flex items-center justify-center relative">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4" />
        プレビューモード — 現場管理機能のみ利用可能です。
      </div>
      <button 
        onClick={handleDismiss}
        className="absolute right-4 text-amber-600 hover:text-amber-800 transition-colors"
        aria-label="閉じる"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
