import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

if (!admin.apps.length) {
  let credential;

  if (process.env.NODE_ENV !== "production") {
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const serviceAccountPath = path.join(
      __dirname,
      "..",
      "serviceAccountKey.json"
    );

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error("serviceAccountKey.json is missing in server/");
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf8")
    );

    credential = admin.credential.cert(serviceAccount);
  } else {
    const privateKey = Buffer.from(
      process.env.FIREBASE_PRIVATE_KEY_B64,
      "base64"
    ).toString("utf8");

    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey
    });
  }

  admin.initializeApp({
    credential
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export { admin };