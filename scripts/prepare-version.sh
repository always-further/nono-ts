#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/prepare-version.sh <version> [--no-build]

Examples:
  scripts/prepare-version.sh 0.4.2
  scripts/prepare-version.sh v0.4.2 --no-build

Updates package.json, package-lock.json, Cargo.toml, Cargo.lock, and
npm/*/package.json to the same version. By default it then runs
`npm run build:debug` to regenerate checked-in napi output.
USAGE
}

version="${1:-}"
run_build=1

if [[ -z "$version" || "$version" == "-h" || "$version" == "--help" ]]; then
  usage
  exit 0
fi

shift
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-build)
      run_build=0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

version="${version#v}"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$ ]]; then
  echo "Invalid semver version: $version" >&2
  exit 2
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required" >&2
  exit 1
fi

if [[ "$run_build" -eq 1 ]] && ! command -v npm >/dev/null 2>&1; then
  echo "npm is required when build is enabled" >&2
  exit 1
fi

VERSION="$version" node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const version = process.env.VERSION;
const root = process.cwd();
const nativeOptionalDependency = /^nono-ts-/;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function updatePackageJson(file, update) {
  const json = readJson(file);
  update(json);
  writeJson(file, json);
}

updatePackageJson(path.join(root, "package.json"), (json) => {
  json.version = version;
  if (json.optionalDependencies) {
    for (const name of Object.keys(json.optionalDependencies)) {
      if (nativeOptionalDependency.test(name)) {
        delete json.optionalDependencies[name];
      }
    }
    if (Object.keys(json.optionalDependencies).length === 0) {
      delete json.optionalDependencies;
    }
  }
});

updatePackageJson(path.join(root, "package-lock.json"), (json) => {
  json.version = version;
  if (json.packages && json.packages[""]) {
    json.packages[""].version = version;
    const optionalDeps = json.packages[""].optionalDependencies;
    if (optionalDeps) {
      for (const name of Object.keys(optionalDeps)) {
        if (nativeOptionalDependency.test(name)) {
          delete optionalDeps[name];
        }
      }
      if (Object.keys(optionalDeps).length === 0) {
        delete json.packages[""].optionalDependencies;
      }
    }
  }

  if (json.packages) {
    for (const key of Object.keys(json.packages)) {
      if (key.startsWith("node_modules/nono-ts-")) {
        delete json.packages[key];
      }
    }
  }
});

const npmDir = path.join(root, "npm");
for (const entry of fs.readdirSync(npmDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }

  const packageJsonPath = path.join(npmDir, entry.name, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    continue;
  }

  updatePackageJson(packageJsonPath, (json) => {
    json.version = version;
  });
}

function replaceVersion(file, pattern, replacement, { optional = false } = {}) {
  if (!fs.existsSync(file)) {
    if (optional) {
      console.warn(`Skipping missing file: ${path.relative(root, file)}`);
      return;
    }
    throw new Error(`Missing required file: ${path.relative(root, file)}`);
  }

  const original = fs.readFileSync(file, "utf8");
  let matched = false;
  const updated = original.replace(pattern, (...args) => {
    matched = true;
    return replacement(...args);
  });
  if (!matched) {
    throw new Error(`No version match found in ${path.relative(root, file)}`);
  }
  fs.writeFileSync(file, updated);
}

replaceVersion(
  path.join(root, "Cargo.toml"),
  /^(\[package\]\r?\n(?:[^\r\n]*\r?\n)*?\s*version\s*=\s*)"[^"]+"/m,
  (_match, prefix) => `${prefix}"${version}"`,
);

replaceVersion(
  path.join(root, "Cargo.lock"),
  /(\[\[package\]\]\r?\n\s*name\s*=\s*"nono-node"\r?\n\s*version\s*=\s*)"[^"]+"/,
  (_match, prefix) => `${prefix}"${version}"`,
  { optional: true },
);

console.log(`Updated release manifests to ${version}`);
NODE

if [[ "$run_build" -eq 1 ]]; then
  npm run build:debug
else
  echo "Skipped npm run build:debug"
fi
