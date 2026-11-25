/**
 * Regression: npm prepares a Git dependency before packing it when its
 * package.json has a build/prepare-style script. OpenCode 2.4.1's bundled npm
 * cannot spawn itself for that step (it re-enters the OpenCode CLI), so a
 * `build` script makes `opencode plugin add github:...#main` fail with
 * "git dep preparation failed". The repo builds with `compile` instead, and
 * dist/ must stay in the published file list so a Git install needs no build.
 *
 * Run: bun test/packaging-regression.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assert } from "./helpers.ts";

// pacote's GitFetcher prepares the clone when package.json has one of these.
const PREPARATION_SCRIPTS = [
  "postinstall",
  "build",
  "preinstall",
  "install",
  "prepack",
  "prepare",
];

const root = join(import.meta.dir, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

for (const name of PREPARATION_SCRIPTS) {
  assert.equal(
    pkg.scripts?.[name],
    undefined,
    `package.json must not define scripts.${name}: npm prepares Git dependencies that have one, which OpenCode 2.4.1 cannot do (use "compile")`,
  );
}

assert.ok(
  Array.isArray(pkg.files) && pkg.files.includes("dist"),
  "dist/ must ship in the package so Git installs need no build",
);
assert.ok(
  Array.isArray(pkg.files) && pkg.files.includes("opencode-claude.js"),
  "opencode-claude.js must ship in the package",
);
assert.ok(existsSync(join(root, "dist/index.js")), "dist/index.js must exist");
assert.ok(existsSync(join(root, pkg.main)), `${pkg.main} must exist`);

console.log("ok — packaging regression passed");
