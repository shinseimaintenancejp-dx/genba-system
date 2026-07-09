/**
 * Genba Management System — Feature Module Utilities.
 *
 * Controls which modules are visible/accessible based on the
 * NEXT_PUBLIC_ENABLED_MODULES environment variable.
 *
 * Usage in .env:
 *   NEXT_PUBLIC_ENABLED_MODULES=all            (development — no restrictions)
 *   NEXT_PUBLIC_ENABLED_MODULES=genba          (production, initial release)
 *   NEXT_PUBLIC_ENABLED_MODULES=genba,customers (production, after sprint 2)
 */

const raw = process.env.NEXT_PUBLIC_ENABLED_MODULES ?? "all";
const isAll = raw.trim().toLowerCase() === "all";

/** Set of enabled module names. Null means "all" (no restrictions). */
export const ENABLED_MODULES: Set<string> | null = isAll
  ? null
  : new Set(raw.split(",").map((m) => m.trim()).filter(Boolean));

/**
 * Returns true if the given module is currently enabled.
 *
 * @param moduleName - e.g., "genba", "customers", "contracts"
 */
export function isModuleEnabled(moduleName: string): boolean {
  if (ENABLED_MODULES === null) return true; // "all" → always enabled
  return ENABLED_MODULES.has(moduleName);
}
