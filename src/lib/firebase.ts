
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// import { getAnalytics } from "firebase/analytics";

// IMPORTANT: Replace this with your actual Firebase project configuration.
// You can find this in your project's settings in the Firebase console.
// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "spade-of-three.firebaseapp.com",
  projectId: "spade-of-three",
  storageBucket: "spade-of-three.firebasestorage.app",
  messagingSenderId: "1001080196341",
  appId: "1:1001080196341:web:42c65930cc42e2106f09bc",
  measurementId: "G-X7GFQPXYCE",
  databaseURL: "https://spade-of-three-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const database = getDatabase(app);
//const analytics = getAnalytics(app);

export { app, database };
