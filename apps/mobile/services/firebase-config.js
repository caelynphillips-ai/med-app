const EXPECTED_FIREBASE_PROJECT_ID = "azur-well";

const configuredValues = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const requiredFields = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];
const missingFields = requiredFields.filter((field) => !configuredValues[field]);

if (missingFields.length) {
  throw new Error(
    `Azur Well Firebase configuration is incomplete. Set the required EXPO_PUBLIC_FIREBASE_* values. Missing: ${missingFields.join(", ")}.`,
  );
}

if (configuredValues.projectId !== EXPECTED_FIREBASE_PROJECT_ID) {
  throw new Error(
    `Azur Well must use Firebase project "${EXPECTED_FIREBASE_PROJECT_ID}", but "${configuredValues.projectId}" was configured.`,
  );
}

export const firebaseConfig = Object.fromEntries(
  Object.entries(configuredValues).filter(([, value]) => Boolean(value)),
);
