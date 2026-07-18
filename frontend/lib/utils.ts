import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Global utility class merger.
 * Combines `clsx` (conditional classes) and `tailwind-merge` (overrides duplicate Tailwind classes)
 * to safely handle dynamic styling inputs without layout conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
