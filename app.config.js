import { readFileSync } from "node:fs";

const baseConfig = JSON.parse(readFileSync(new URL("./app.json", import.meta.url), "utf8")).expo;

export default {
  ...baseConfig,
  android: {
    ...baseConfig.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
  },
};
