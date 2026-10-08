import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// يدمج أصناف Tailwind بدون تعارض (الدالة المعتمدة في shadcn)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
