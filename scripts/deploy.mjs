/**
 * One command to put the current code live:  npm run deploy
 *
 * Vercel builds whatever lands on main, so pushing is the deploy. This exists
 * because the shell-specific ways of chaining git commands differ — Windows
 * PowerShell has no `&&` — and because npm scripts always run from the project
 * root, which rules out committing into the wrong repository by accident.
 */
import { execFileSync, execSync } from "node:child_process";

const run = (args, quiet = false) =>
  execFileSync("git", args, { encoding: "utf8", stdio: quiet ? "pipe" : "inherit" });

const capture = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();

try {
  // Guard against the stray repository in the home folder: this must be the
  // app's own checkout, not whatever encloses it.
  const root = capture(["rev-parse", "--show-toplevel"]);
  const remote = capture(["remote", "get-url", "origin"]);
  if (!remote.includes("Manpower-Implement")) {
    console.error(
      `\nRefusing to push.\n\n  This folder is ${root}\n  whose origin is ${remote}\n\n` +
        "  Expected the Manpower-Implement repository. Run this from the project folder.\n",
    );
    process.exit(1);
  }

  const message = process.argv.slice(2).join(" ").trim() || "Update";

  run(["add", "-A"]);

  // Nothing staged is not a failure: the point may be to redeploy what is
  // already committed.
  const staged = execSync("git diff --cached --name-only", { encoding: "utf8" }).trim();
  if (staged) {
    run(["commit", "-m", message]);
    console.log(`\nCommitted: ${message}`);
  } else {
    console.log("\nNothing changed — pushing what is already committed.");
  }

  run(["push"]);

  console.log(
    "\nPushed. Vercel is building now — your site updates in about a minute.\n" +
      "  https://vercel.com/dashboard\n",
  );
} catch (err) {
  console.error(`\nDeploy stopped: ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
}
