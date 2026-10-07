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
 * What the current session may see and do.
 *
 * Nobody signed in is the site office — full access, no password, because one
 * nobody can enforce would be theatre. An admin login is the same minus the
 * login list, and confined to its category. A contractor gets its own row.
 */
export type Access = {
  /** Nobody signed in. */
  isOffice: boolean;
  /** Office or an admin login. */
  canManageRoster: boolean;
  /** Office only. */
  canManageLogins: boolean;
  /** Null means every category. */
  category: string | null;
  /** Set only for a contractor login. */
  contractorId: string | null;
};

export function useAccess(): Access {
  const session = useSession();
  if (!session) {
    return {
      isOffice: true,
      canManageRoster: true,
      canManageLogins: true,
      category: null,
      contractorId: null,
    };
  }
  if (session.role === "admin") {
    return {
      isOffice: false,
      canManageRoster: true,
      canManageLogins: false,
      category: session.category ?? null,
      contractorId: null,
    };
  }
  return {
    isOffice: false,
    canManageRoster: false,
    canManageLogins: false,
    category: null,
    contractorId: session.contractorId ?? null,
  };
}
