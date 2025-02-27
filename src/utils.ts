import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const noop = () => {};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getAlpha = (index: number) => String.fromCharCode('A'.charCodeAt(0) + index);
