import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDuKBiSvRDZqZHKy6MdiM-XFdyGTifCayI",
  authDomain: "schoolcheck-3928a.firebaseapp.com",
  projectId: "schoolcheck-3928a",
  storageBucket: "schoolcheck-3928a.firebasestorage.app",
  messagingSenderId: "794461566219",
  appId: "1:794461566219:web:5bc02cee9ded5476a0de0e",
  measurementId: "G-D43W4TCN54"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };
