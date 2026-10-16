import SignIn from "./SignIn";

/** One person's own sign-in link. The user ID is in the path, not a secret. */
export default async function PersonalSignInPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <SignIn username={username} />;
}
