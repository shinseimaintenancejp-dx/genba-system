import { useEffect } from "react";
import { useHeaderStore } from "@/store/useHeaderStore";
import React from "react";

export function usePageHeader(title: string | null, description?: string | React.ReactNode | null, icon?: React.ElementType | null) {
  const setHeader = useHeaderStore((state) => state.setHeader);

  useEffect(() => {
    setHeader(title, description, icon);
    return () => {
      // Clear header when component unmounts
      setHeader(null, null, null);
    };
  }, [title, description, icon, setHeader]);
}
