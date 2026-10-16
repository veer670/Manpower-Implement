"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * The address this page is being served from — "https://…vercel.app" live,
 * "http://localhost:4300" in dev.
 *
 * Read through useSyncExternalStore rather than an effect: the server has no
 * origin to render, so it returns "" there and the real value on the client,
 * without a state write during render.
 */
export function useOrigin(): string {
  return useSyncExternalStore(noop, () => window.location.origin, () => "");
}
