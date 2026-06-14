import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
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

function parseEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...valueParts] = line.split("=");
        return [key.trim(), valueParts.join("=").trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

async function createFirebaseConfigModule() {
  const envPath = resolve(workspaceRoot, ".env.local");
  const localEnv = await pathExists(envPath) ? parseEnv(await readFile(envPath, "utf8")) : {};
  const envValue = (name) => process.env[name] || localEnv[name] || "";
  const config = {
    apiKey: envValue("EXPO_PUBLIC_FIREBASE_API_KEY"),
    authDomain: envValue("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    databaseURL: envValue("EXPO_PUBLIC_FIREBASE_DATABASE_URL"),
    projectId: envValue("EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: envValue("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: envValue("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: envValue("EXPO_PUBLIC_FIREBASE_APP_ID"),
  };
  const requiredFields = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
  const missingFields = requiredFields.filter((field) => !config[field]);

  if (missingFields.length) {
    throw new Error(`Desktop Firebase configuration is incomplete. Missing: ${missingFields.join(", ")}.`);
  }

  if (config.projectId !== "azur-well") {
    throw new Error(`Desktop Firebase project must be "azur-well", but "${config.projectId}" was configured.`);
  }

  return `import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";

const firebaseConfig = ${JSON.stringify(config, null, 2)};
const app = initializeApp(firebaseConfig);

export { app, firebaseConfig };
`;
}

await mkdir(rendererRoot, { recursive: true });

if (await pathExists(join(rendererRoot, "src"))) {
  await rm(join(rendererRoot, "src"), { recursive: true, force: true });
}

await copyFile(resolve(workspaceRoot, "index.html"), join(rendererRoot, "index.html"));
await writeFile(join(rendererRoot, "firebaseConfig.js"), await createFirebaseConfigModule(), "utf8");
await copyDirectory(srcRoot, join(rendererRoot, "src"));

console.log(`Desktop renderer synced to ${rendererRoot}`);
