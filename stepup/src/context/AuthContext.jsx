// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState("");
  const [plan, setPlan] = useState("free"); // 🔹 무료/유료
  const [role, setRole] = useState("user"); // 🔹 일반/관리자/트레이너
  const [difficulty, setDifficulty] = useState("easy"); // 🔹 운동 난이도 (easy/medium/hard)

  // 🔹 Firebase가 로그인 상태 확인을 끝냈는지 여부
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        // 🔻 로그아웃 상태일 때 기본값들 초기화
        if (!fbUser) {
          setUser(null);
          setNickname("");
          setPlan("free");
          setRole("user");
          setDifficulty("easy"); // 설문 전 기본값
          setAuthReady(true); // ✅ 준비 완료 표시
          return;
        }

        // 🔥 로그인된 상태
        const ref = doc(db, "users", fbUser.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          // Firestore 문서가 없으면 기본값으로 생성
          await setDoc(ref, {
            email: fbUser.email || "",
            nick: fbUser.displayName || "익명",
            plan: "free", // 기본 무료
            role: "user", // 기본 일반회원
            createdAt: Date.now(),
            // 아직 설문 전이라 initialDifficulty 는 없음
          });

          setNickname(fbUser.displayName || "익명");
          setPlan("free");
          setRole("user");
          setDifficulty("easy"); // 설문 전에는 일단 easy
        } else {
          const data = snap.data();
          setNickname(data.nick || "익명");
          setPlan(data.plan || "free");
          setRole(data.role || "user");
          // 🔻 설문에서 저장한 initialDifficulty 사용, 없으면 easy
          setDifficulty(data.initialDifficulty || "easy");
        }

        setUser(fbUser);
      } catch (err) {
        console.error("AuthContext Firestore 에러:", err);
      } finally {
        // 🔚 로그인 여부 체크는 끝났다
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{
        user,
        nickname,
        plan,
        role,
        difficulty, // 🔹 난이도
        authReady,  // 🔹 로그인 상태 확인 완료 여부
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
