/** The screens that sign someone in: /login, and each person's own /u/<id>. */
export const isSignInPath = (pathname: string): boolean =>
  pathname === "/login" || pathname.startsWith("/u/");
