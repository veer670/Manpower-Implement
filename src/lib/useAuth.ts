"use client";

import { useSyncExternalStore } from "react";
import * as auth from "./auth";

/** The signed-in contractor, or null when nobody is signed in (admin view). */
export function useSession(): auth.Session | null {
  return useSyncExternalStore(auth.subscribe, auth.getSession, auth.getServerSession);
}

export function useUsers(): auth.User[] {
  return useSyncExternalStore(auth.subscribe, auth.getUsers, auth.getServerUsers);
}

/**
 * Nobody signed in means the admin view. There is no admin password: this runs
 * on the site office's own machine, and a password nobody can enforce would be
 * theatre.
 */
export function useIsAdmin(): boolean {
  return useSession() === null;
}
