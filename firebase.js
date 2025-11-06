// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAyvpbR38jFmYCGpKMwVXwUoKM92FwkDXo",
  authDomain: "agenda-digital-927a6.firebaseapp.com",
  projectId: "agenda-digital-927a6",
  storageBucket: "agenda-digital-927a6.firebasestorage.app",
  messagingSenderId: "590150306135",
  appId: "1:590150306135:web:a1017c78130690c1611612",
  measurementId: "G-CZ98W1DPEB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
const auth = getAuth(app);

// Export for use in other files
export { app, analytics, database, auth };
