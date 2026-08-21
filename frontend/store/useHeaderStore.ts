import { create } from "zustand";
import React from "react";

interface HeaderState {
  title: string | null;
  description: string | React.ReactNode | null;
  setHeader: (title: string | null, description?: string | React.ReactNode | null) => void;
}

export const useHeaderStore = create<HeaderState>((set) => ({
  title: null,
  description: null,
  setHeader: (title, description = null) => set({ title, description }),
}));
