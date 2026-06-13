export function formatUnreadMessageBadge(count: number): string {
  if (count === 1) return '1 jauna ziņa';
  return `${count} jaunas ziņas`;
}
