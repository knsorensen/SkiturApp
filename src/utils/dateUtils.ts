import { format, formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

export function formatDate(date: Date): string {
  return format(date, 'd. MMMM yyyy', { locale: nb });
}

export function formatTime(date: Date): string {
  return format(date, 'HH:mm', { locale: nb });
}

export function formatRelative(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: nb });
}

export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}t ${minutes}m`;
  return `${minutes}m`;
}
