// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ↓↓↓ 여기는 네 파이어베이스 콘솔에서 복사해온 걸로 바꿔야 해요
const firebaseConfig = {
  apiKey: "AIzaSyDbl6OT_5vK243qoQh8OC_CZb2ff2yA0NE",
  authDomain: "stepup-ac525.firebaseapp.com",
  projectId: "stepup-ac525",
  storageBucket: "stepup-ac525.firebasestorage.app",
  messagingSenderId: "44577190800",
  appId: "1:44577190800:web:2c0d88eae56467917af915",
  measurementId: "G-FZ0R1WX91M"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
