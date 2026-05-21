const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("medOrganizerDesktop", {
  platform: process.platform,
  client: "desktop"
});
