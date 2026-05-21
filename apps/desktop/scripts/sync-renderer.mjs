import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "..", "..", "..");
const rendererRoot = resolve(workspaceRoot, "apps", "desktop", "renderer");
const srcRoot = resolve(workspaceRoot, "src");

async function copyDirectory(source, destination) {
  await mkdir(destination, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const from = join(source, entry.name);
    const to = join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(from, to);
      continue;
    }

    if (entry.isFile()) {
      await copyFile(from, to);
    }
  }
}

async function pathExists(pathToCheck) {
  try {
    await stat(pathToCheck);
    return true;
  } catch {
    return false;
  }
}

await mkdir(rendererRoot, { recursive: true });

if (await pathExists(join(rendererRoot, "src"))) {
  await rm(join(rendererRoot, "src"), { recursive: true, force: true });
}

await copyFile(resolve(workspaceRoot, "index.html"), join(rendererRoot, "index.html"));
await copyFile(resolve(workspaceRoot, "firebaseConfig.js"), join(rendererRoot, "firebaseConfig.js"));
await copyDirectory(srcRoot, join(rendererRoot, "src"));

console.log(`Desktop renderer synced to ${rendererRoot}`);
