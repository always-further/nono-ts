#!/usr/bin/env node
import { access, readFile, readdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const checkArtifacts = args.has("--check-artifacts");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmDir = path.join(rootDir, "npm");
const rootPackagePath = path.join(rootDir, "package.json");

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (dryRun) {
    return;
  }
  await writeFile(filePath, serialized);
}

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const rootPackage = await readJson(rootPackagePath);
const nativePackages = [];

for (const entry of await readdir(npmDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }

  const packageDir = path.join(npmDir, entry.name);
  const packageJsonPath = path.join(packageDir, "package.json");
  if (!(await exists(packageJsonPath))) {
    continue;
  }

  const nativePackage = await readJson(packageJsonPath);
  nativePackage.version = rootPackage.version;
  await writeJson(packageJsonPath, nativePackage);

  nativePackages.push({
    name: nativePackage.name,
    main: nativePackage.main,
  });

  if (checkArtifacts && nativePackage.main) {
    const artifactPath = path.join(packageDir, nativePackage.main);
    if (!(await exists(artifactPath))) {
      throw new Error(`Missing native artifact: ${path.relative(rootDir, artifactPath)}`);
    }
  }
}

if (nativePackages.length === 0) {
  throw new Error("No native package manifests found under npm/");
}

nativePackages.sort((a, b) => a.name.localeCompare(b.name));

rootPackage.optionalDependencies = Object.fromEntries(
  nativePackages.map(({ name }) => [name, rootPackage.version]),
);

await writeJson(rootPackagePath, rootPackage);

const mode = dryRun ? "would prepare" : "prepared";
console.log(
  `${mode} ${nativePackages.length} native package(s) for nono-ts@${rootPackage.version}`,
);
