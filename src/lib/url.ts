// Prefixes root-relative asset paths ("/assets/x.webp") with the site base, so the site works
// both at the domain root and under a sub-path such as GitHub Pages.
export function asset(path: string): string {
  if (!path.startsWith('/')) return path;
  return import.meta.env.BASE_URL.replace(/\/$/, '') + path;
}
