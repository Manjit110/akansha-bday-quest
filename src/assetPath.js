// friends.js / player.js store asset paths as root-absolute (e.g. "/friends/x.jpg"),
// but the site is deployed under a sub-path (see `base` in vite.config.js), so
// they need that prefix at runtime -- both in dev and in the built site.
export function assetUrl(path) {
  if (!path) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path}`;
}
