// seed.js
// Uploads all questions from data/questions.json to the Firestore "questions" collection.
// Run with: node seed.js

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json"); // secret key - never commit!
const questions = require("./data/questions.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function seed() {
  const collection = db.collection("questions");

  // Remove old questions first, so running the script twice doesn't create duplicates
  const oldDocs = await collection.get();
  const batch = db.batch();

  oldDocs.forEach((doc) => batch.delete(doc.ref));
  questions.forEach((q) => batch.set(collection.doc(), q));

  await batch.commit();

  console.log(`✅ Uploaded ${questions.length} questions (removed ${oldDocs.size} old ones).`);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err.message);
  process.exit(1);
});