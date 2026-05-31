export function getFullImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    try { const origin = new URL(apiUrl).origin; return `${origin}${url}`; } catch {}
  }
  return `${window.location.origin}${url}`;
}
