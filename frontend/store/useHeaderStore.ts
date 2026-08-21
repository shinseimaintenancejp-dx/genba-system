import { create } from "zustand";
import React from "react";

interface HeaderState {
  title: string | null;
  icon: React.ElementType | null;
  description: string | React.ReactNode | null;
  setHeader: (title: string | null, description?: string | React.ReactNode | null, icon?: React.ElementType | null) => void;
}

export const useHeaderStore = create<HeaderState>((set) => ({
  title: null,
  description: null,
  icon: null,
  setHeader: (title, description = null, icon = null) => set({ title, description, icon }),
}));
