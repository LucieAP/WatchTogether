// Импорт Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

// Конфигурация Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Функция для входа через Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return {
      user: result.user,
      // Получаем токен для отправки на бэкенд
      token: await result.user.getIdToken(),
    };
  } catch (error) {
    // console.error("Ошибка при входе через Google:", error);

    // Проверяем, была ли это ошибка закрытия окна
    if (error.code === "auth/popup-closed-by-user") {
      // Добавляем код ошибки в объект, чтобы можно было проверить его в компоненте Auth
      throw { ...error, code: "auth/popup-closed-by-user" };
    }

    throw error;
  }
};

// Функция для выхода из Firebase
export const signOutFromFirebase = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    // console.error("Ошибка при выходе из Firebase:", error);
    throw error;
  }
};

export { auth };
