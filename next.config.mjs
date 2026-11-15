import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";

const revision = randomUUID();
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  scope: "/",
  register: true,
  // Reconnecting must not discard an unsaved pattern or interrupt navigation.
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  exclude: [/\.map$/, /^manifest.*\.js$/, /middleware-manifest\.json$/],
  manifestTransforms: [
    async (entries) => ({
      manifest: [
        // Exclude generated files left by next-pwa when upgrading an existing checkout.
        ...entries.filter(({ url }) => !/(?:^|\/)(?:workbox|worker|fallback)-[^/]+\.js(?:\.map)?$/.test(url)),
        // Version the static start page on each build while retaining public asset precaching.
        { url: "/", revision, size: 0 },
      ],
      warnings: [],
    }),
  ],
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  /* config options here */
};

export default withSerwist(nextConfig);
