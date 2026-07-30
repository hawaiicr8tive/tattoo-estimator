import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Next 16.2.x dev-server hazard: turbo-tasks-fs invalidates a task from another
  // task's write to the same output path with no convergence check, so on a RESTORED
  // dev cache two writers can invalidate each other ~40x/sec, each turn spawning an
  // unkillable `node .next/dev/build/postcss.js` child (~80 MB). Measured elsewhere on
  // this machine: 4,804 children / 200.54 GB / three hard hangs. Vercel's fix
  // (a98213cbfa, #92300) is absent from all of 16.2.x. Dev-only -- `next start` and
  // `next build` do not use this cache. See
  // ~/dev/sean-apps/tattoo-flash-kiosk/docs/UPSTREAM-ISSUE-turbopack-postcss-storm.md
  experimental: { turbopackFileSystemCacheForDev: false },
  // Pin the workspace root: Next's find-root returns the highest lockfile's dirname
  // unfiltered, so a stray lockfile above this repo silently re-roots the project.
  turbopack: { root: path.join(__dirname) },

  allowedDevOrigins: ['192.168.1.72', '100.99.164.66'],
};

export default nextConfig;
