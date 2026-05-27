import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Format tanggal ISO ke format lengkap Indonesia.
 * Contoh: "2026-05-27" -> "Rabu, 27 Mei 2026"
 */
export function formatTanggalLengkap(dateString) {
  if (!dateString) return '-';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'EEEE, d MMMM yyyy', { locale: id });
  } catch (e) {
    return dateString;
  }
}

/**
 * Format tanggal ISO ke format pendek (hari dan tanggal).
 * Contoh: "Rabu, 27 Mei"
 */
export function formatTanggalPendek(dateString) {
  if (!dateString) return '-';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'EEEE, d MMM', { locale: id });
  } catch (e) {
    return dateString;
  }
}

/**
 * Format jam menit detik.
 * Contoh: "2026-05-27T08:30:15Z" -> "08:30" atau dengan detik "08:30:15"
 */
export function formatJamMenit(timeString, includeSeconds = false) {
  if (!timeString) return '-';
  try {
    // Jika format HH:MM:SS saja
    if (timeString.length === 8 && timeString.includes(':')) {
      return includeSeconds ? timeString : timeString.substring(0, 5);
    }
    const date = parseISO(timeString);
    return format(date, includeSeconds ? 'HH:mm:ss' : 'HH:mm', { locale: id });
  } catch (e) {
    return timeString;
  }
}

/**
 * Mengubah selang waktu ke representasi "X menit/jam yang lalu".
 */
export function formatJarakWaktu(dateString) {
  if (!dateString) return '-';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return formatDistanceToNow(date, { addSuffix: true, locale: id });
  } catch (e) {
    return dateString;
  }
}
