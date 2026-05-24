import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteObject,
  getBytes,
  ref,
  uploadBytes,
} from "firebase/storage";

const PROJECT_ID = "demo-med-organizer-rules";
const TEN_MB = 10 * 1024 * 1024;
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: readFileSync("storage.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearStorage();
  }
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

describe("Storage attachment rules", () => {
  test("owner can upload and delete an image attachment under the medication path", async () => {
    const storage = ownerStorage("owner-a");
    const attachmentRef = ref(storage, "users/owner-a/medications/med-1/label.png");

    await assertSucceeds(uploadBytes(attachmentRef, bytes(128), { contentType: "image/png" }));
    await assertSucceeds(deleteObject(attachmentRef));
  });

  test("owner can upload a PDF attachment under the medication path", async () => {
    const storage = ownerStorage("owner-a");
    const attachmentRef = ref(storage, "users/owner-a/medications/med-1/instructions.pdf");

    await assertSucceeds(uploadBytes(attachmentRef, bytes(128), { contentType: "application/pdf" }));
  });

  test("anonymous authenticated preview users can upload their own attachment", async () => {
    const storage = anonymousStorageFor("anon-preview");
    const attachmentRef = ref(storage, "users/anon-preview/medications/med-1/label.png");

    await assertSucceeds(uploadBytes(attachmentRef, bytes(128), { contentType: "image/png" }));
  });

  test("cross-user attachment access is blocked", async () => {
    const owner = ownerStorage("owner-a");
    const other = ownerStorage("owner-b");
    const path = "users/owner-a/medications/med-1/label.png";

    await assertSucceeds(uploadBytes(ref(owner, path), bytes(128), { contentType: "image/png" }));
    await assertFails(getBytes(ref(other, path)));
    await assertFails(deleteObject(ref(other, path)));
    await assertFails(uploadBytes(ref(other, path), bytes(128), { contentType: "image/png" }));
  });

  test("unsupported file types are rejected", async () => {
    const storage = ownerStorage("owner-a");
    const attachmentRef = ref(storage, "users/owner-a/medications/med-1/notes.txt");

    await assertFails(uploadBytes(attachmentRef, bytes(128), { contentType: "text/plain" }));
  });

  test("files over 10 MB are rejected", async () => {
    const storage = ownerStorage("owner-a");
    const attachmentRef = ref(storage, "users/owner-a/medications/med-1/too-large.png");

    await assertFails(uploadBytes(attachmentRef, bytes(TEN_MB + 1), { contentType: "image/png" }));
  });

  test("valid files outside the medication attachment path are rejected", async () => {
    const storage = ownerStorage("owner-a");

    await assertFails(uploadBytes(ref(storage, "users/owner-a/profile/label.png"), bytes(128), { contentType: "image/png" }));
  });
});

function ownerStorage(uid) {
  return testEnv.authenticatedContext(uid).storage();
}

function anonymousStorageFor(uid) {
  return testEnv.authenticatedContext(uid, {
    firebase: {
      sign_in_provider: "anonymous",
    },
  }).storage();
}

function bytes(size) {
  return new Uint8Array(size);
}
