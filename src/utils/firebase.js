import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

let app, db, storage;

export function getFirebaseServices() {
  if (!app) {
    app     = initializeApp(firebaseConfig);
    db      = getFirestore(app);
    storage = getStorage(app);
  }
  return { db, storage };
}

/**
 * Uploads the canvas data URL to Firebase Storage and writes a
 * Firestore document with submission metadata.
 *
 * @param {string} dataUrl    - canvas.toDataURL() result
 * @param {object} meta       - { userName, note, layerCount, canvasSize }
 * @returns {Promise<string>} - the public download URL
 */
export async function submitDesign(dataUrl, meta) {
  const { db, storage } = getFirebaseServices();

  const timestamp = Date.now();
  const storageRef = ref(storage, `submissions/${timestamp}.png`);

  // Upload the base64 data URL (strip the prefix)
  const base64Data = dataUrl.split(',')[1];
  await uploadString(storageRef, base64Data, 'base64', { contentType: 'image/png' });

  const imageUrl = await getDownloadURL(storageRef);

  await addDoc(collection(db, 'submissions'), {
    userName:    meta.userName || 'Anonymous',
    note:        meta.note    || '',
    layerCount:  meta.layerCount  || 0,
    canvasSize:  meta.canvasSize  || 'a4',
    imageUrl,
    timestamp:   serverTimestamp(),
    createdAt:   timestamp,
  });

  return imageUrl;
}
