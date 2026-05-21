const { app, BrowserWindow, shell } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const APP_NAME = "Med Organizer";
const rendererRoot = path.join(__dirname, "..", "renderer");
const userDataRoot = path.join(__dirname, "..", ".user-data");
let localServer;
let localOrigin;

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

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' https://www.gstatic.com https://apis.google.com https://accounts.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.firebasestorage.app https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebasestorage.googleapis.com https://clinicaltables.nlm.nih.gov",
  "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
  "form-action 'self' https://accounts.google.com"
].join("; ");

function resolveRendererPath(urlPath) {
  const requestPath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const normalized = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const relativePath = normalized === path.sep ? "index.html" : normalized.replace(/^[/\\]/, "");
  const target = path.resolve(rendererRoot, relativePath);

  if (!target.startsWith(rendererRoot)) {
    return null;
  }

  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    return path.join(target, "index.html");
  }

  return target;
}

function startRendererServer() {
  if (localServer && localOrigin) {
    return Promise.resolve(localOrigin);
  }

  return new Promise((resolve, reject) => {
    localServer = http.createServer((request, response) => {
      const filePath = resolveRendererPath(request.url);

      if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        response.writeHead(404, {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Security-Policy": contentSecurityPolicy,
          "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
        });
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Content-Security-Policy": contentSecurityPolicy,
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
      });
      fs.createReadStream(filePath).pipe(response);
    });

    localServer.once("error", reject);
    localServer.listen(0, "127.0.0.1", () => {
      const address = localServer.address();
      localOrigin = `http://127.0.0.1:${address.port}`;
      resolve(localOrigin);
    });
  });
}

function isAllowedAuthUrl(url) {
  try {
    const parsed = new URL(url);
    return [
      "accounts.google.com",
      "apis.google.com",
      "med-test-7a252.firebaseapp.com"
    ].some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

async function createWindow() {
  const origin = await startRendererServer();
  const window = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 960,
    minHeight: 700,
    title: APP_NAME,
    backgroundColor: "#EAF7F6",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedAuthUrl(url)) {
      return { action: "allow" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin) && !isAllowedAuthUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  await window.loadURL(`${origin}/index.html?client=desktop`);
}

app.setName(APP_NAME);
app.setPath("userData", userDataRoot);
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (localServer) {
    localServer.close();
  }
});
