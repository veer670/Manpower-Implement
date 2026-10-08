"use client";

import { useEffect, useSyncExternalStore } from "react";
import * as auth from "./auth";

/**
 * Who is signed in, and what they may do.
 *
 * Everything here is the server's answer, re-fetched rather than inferred:
 * the client decides what to *render*, the server decides what is *allowed*.
 */
export function useAccess(): auth.Access {
  return useSyncExternalStore(auth.subscribe, auth.getAccess, auth.getServerAccess);
}

export function useSession(): auth.Session | null {
  return useAccess().session;
}

/** False until the first /api/auth/me has answered, so screens can wait. */
export function useAuthReady(): boolean {
  return useSyncExternalStore(auth.subscribe, auth.isReady, () => false);
}

/** The login list, loaded on demand by the screen that shows it. */
export function useUsers(): auth.User[] {
  const users = useSyncExternalStore(auth.subscribe, auth.getUsers, auth.getServerUsers);
  const canManage = useAccess().canManageLogins;

  useEffect(() => {
    if (canManage) void auth.loadUsers();
  }, [canManage]);

  return users;
}
