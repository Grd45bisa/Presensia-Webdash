import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Gabungkan class Tailwind dengan clsx + tailwind-merge agar tidak konflik.
 * Pakai fungsi ini setiap kali menyusun kelas secara kondisional.
 *
 * @example cn('px-4 py-2', isActive && 'bg-blue-600')
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
