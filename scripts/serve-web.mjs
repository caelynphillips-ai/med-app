import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 5173);
const localEnv = loadLocalEnv();
const expectedFirebaseProjectId = "azur-well";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf"
};

function resolveRequestPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const safePath = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const target = resolve(root, safePath === "/" ? "index.html" : safePath.slice(1));

  if (!target.startsWith(root)) {
    return null;
  }

  if (existsSync(target) && statSync(target).isDirectory()) {
    return join(target, "index.html");
  }

  return target;
}

function envValue(name, fallbackName = name.replace(/^EXPO_PUBLIC_/, "")) {
  return process.env[name] || localEnv[name] || process.env[fallbackName] || localEnv[fallbackName] || "";
}

function firebaseConfigFromEnv() {
  const config = {
    apiKey: envValue("EXPO_PUBLIC_FIREBASE_API_KEY", "FIREBASE_API_KEY"),
    authDomain: envValue("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN", "FIREBASE_AUTH_DOMAIN"),
    databaseURL: envValue("EXPO_PUBLIC_FIREBASE_DATABASE_URL", "FIREBASE_DATABASE_URL"),
    projectId: envValue("EXPO_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_PROJECT_ID"),
    storageBucket: envValue("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET", "FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: envValue("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "FIREBASE_MESSAGING_SENDER_ID"),
    appId: envValue("EXPO_PUBLIC_FIREBASE_APP_ID", "FIREBASE_APP_ID"),
  };
  const requiredFields = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
  const missingFields = requiredFields.filter((field) => !config[field]);

  if (missingFields.length) {
    throw new Error(
      `Firebase configuration is incomplete. Missing: ${missingFields.join(", ")}. Add the required EXPO_PUBLIC_FIREBASE_* values to .env.local.`,
    );
  }

  if (config.projectId !== expectedFirebaseProjectId) {
    throw new Error(
      `Azur Well must use Firebase project "${expectedFirebaseProjectId}", but "${config.projectId}" was configured.`,
    );
  }

  return config;
}

function loadLocalEnv() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) {
    return {};
  }
  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...valueParts] = line.split("=");
        return [key.trim(), valueParts.join("=").trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

function renderFirebaseConfigModule(config) {
  return `import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";

const firebaseConfig = ${JSON.stringify(config, null, 2)};

const app = initializeApp(firebaseConfig);

export { app, firebaseConfig };
`;
}

const server = createServer((request, response) => {
  if ((request.url || "").split("?")[0] === "/firebaseConfig.js") {
    try {
      const envFirebaseConfig = firebaseConfigFromEnv();
      response.writeHead(200, {
        "Content-Type": mimeTypes[".js"],
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
      });
      response.end(renderFirebaseConfigModule(envFirebaseConfig));
      return;
    } catch (error) {
      response.writeHead(500, {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
      });
      response.end(`throw new Error(${JSON.stringify(error.message)});`);
      return;
    }
  }

  const filePath = resolveRequestPath(request.url || "/");

  if (!filePath || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Azur Well web app: http://${host}:${port}`);
});
