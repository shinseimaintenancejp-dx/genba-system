import { useEffect } from "react";
import { useHeaderStore } from "@/store/useHeaderStore";
import React from "react";

export function usePageHeader(title: string | null, description?: string | React.ReactNode | null) {
  const setHeader = useHeaderStore((state) => state.setHeader);

  useEffect(() => {
    setHeader(title, description);
    return () => {
      // Clear header when component unmounts
      setHeader(null, null);
    };
  }, [title, description, setHeader]);
}
