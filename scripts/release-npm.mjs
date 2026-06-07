#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { access, readFile, readdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmDir = path.join(rootDir, "npm");
const args = process.argv.slice(2);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function hasFlag(name) {
  return args.includes(name);
}

function readOption(name, fallback) {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith("--")) {
    return args[index + 1];
  }

  return fallback;
}

const publish = hasFlag("--publish");
const dryRun = !publish;
const npmAccess = readOption("--access", "public");
const tag = readOption("--tag", "latest");
const otp = readOption("--otp", undefined);
const provenance = publish && !hasFlag("--no-provenance");

if (publish && hasFlag("--dry-run")) {
  throw new Error("Use either --publish or --dry-run, not both.");
}

function run(command, commandArgs, options = {}) {
  console.log(`$ ${[command, ...commandArgs].join(" ")}`);
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    stdio: "inherit",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isNativePackageManifest(value) {
  return value && typeof value.name === "string" && value.name.startsWith("nono-ts-");
}

async function nativePackageDirs() {
  const dirs = [];

  for (const entry of await readdir(npmDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packageDir = path.join(npmDir, entry.name);
    const packageJsonPath = path.join(packageDir, "package.json");
    if (!(await exists(packageJsonPath))) {
      continue;
    }

    let packageJson;
    try {
      packageJson = await readJson(packageJsonPath);
    } catch (error) {
      console.warn(`Skipping unreadable native package manifest: ${path.relative(rootDir, packageJsonPath)}`);
      continue;
    }

    if (!isNativePackageManifest(packageJson)) {
      console.warn(`Skipping invalid native package manifest: ${path.relative(rootDir, packageJsonPath)}`);
      continue;
    }

    dirs.push({ name: packageJson.name, path: packageDir });
  }

  dirs.sort((a, b) => a.name.localeCompare(b.name));
  return dirs;
}

async function snapshotFiles(files) {
  const snapshots = new Map();
  for (const file of files) {
    snapshots.set(file, await readFile(file, "utf8"));
  }
  return snapshots;
}

async function restoreFiles(snapshots) {
  for (const [file, contents] of snapshots.entries()) {
    await writeFile(file, contents);
  }
}

const packageDirs = await nativePackageDirs();
if (packageDirs.length === 0) {
  throw new Error("No native package manifests found under npm/");
}

const rootPackage = await readJson(path.join(rootDir, "package.json"));
const mutableManifestFiles = [
  path.join(rootDir, "package.json"),
  ...packageDirs.map(({ path: packageDir }) => path.join(packageDir, "package.json")),
];
const snapshots = dryRun ? await snapshotFiles(mutableManifestFiles) : undefined;

const publishArgs = ["--access", npmAccess, "--tag", tag];
if (dryRun) {
  publishArgs.push("--dry-run");
}
if (provenance) {
  publishArgs.push("--provenance");
}
if (otp) {
  publishArgs.push("--otp", otp);
}

try {
  console.log(
    `${dryRun ? "Dry-running" : "Publishing"} nono-ts@${rootPackage.version} with ${packageDirs.length} native package(s)`,
  );
  run("node", ["scripts/prepare-npm-publish.mjs", "--check-artifacts"]);

  for (const { name, path: packageDir } of packageDirs) {
    console.log(`\nPublishing native package ${name}`);
    run(npmCommand, ["publish", packageDir, ...publishArgs]);
  }

  console.log("\nPublishing root package nono-ts");
  run(npmCommand, ["publish", "--ignore-scripts", ...publishArgs]);
} finally {
  if (snapshots) {
    await restoreFiles(snapshots);
    console.log("Restored package manifests after dry-run.");
  }
}
