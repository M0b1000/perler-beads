import { ExpirationPlugin, NetworkFirst, Serwist } from "serwist";
import type { PrecacheEntry } from "serwist";

// This declaration is local to the worker module, so worker globals do not alter app types.
declare const self: {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const networkFirst = (cacheName: string) =>
  new NetworkFirst({
    cacheName,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  });

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    // Match Serwist's Next.js rules: prefetch, RSC, and HTML responses need separate caches.
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin &&
        !url.pathname.startsWith("/api/") &&
        request.headers.get("RSC") === "1" &&
        request.headers.get("Next-Router-Prefetch") === "1",
      handler: networkFirst("offlineCache-rsc-prefetch"),
    },
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin && !url.pathname.startsWith("/api/") && request.headers.get("RSC") === "1",
      handler: networkFirst("offlineCache-rsc"),
    },
    {
      matcher: /^https?:\/\//,
      handler: networkFirst("offlineCache"),
    },
  ],
});

serwist.addEventListeners();
