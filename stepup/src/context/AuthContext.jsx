// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // Firestore 전체 데이터
  const [nickname, setNickname] = useState("");
  const [plan, setPlan] = useState("free");
  const [role, setRole] = useState("user");
  const [difficulty, setDifficulty] = useState("easy");
  const [freeCount, setFreeCount] = useState(3); // 무료 사용 가능 횟수
  const [authReady, setAuthReady] = useState(false);

  // 공통: Firestore users 문서 읽어서 상태 세팅
  const applyUserDoc = (fbUser, data) => {
    if (!fbUser) {
      setUser(null);
      setUserData(null);
      setNickname("");
      setPlan("free");
      setRole("user");
      setDifficulty("easy");
      setFreeCount(3);
      return;
    }

    const nextNickname =
      data?.nick ||
      data?.nickname ||
      fbUser.displayName ||
      "익명";

    const nextPlan = data?.plan || "free";
    const nextRole = data?.role || "user";
    const nextDifficulty =
      data?.initialDifficulty ||
      data?.difficulty ||
      data?.level ||
      "easy";

    const nextFreeCount =
      nextPlan === "free"
        ? typeof data?.freeCount === "number"
          ? data.freeCount
          : 3
        : typeof data?.freeCount === "number"
        ? data.freeCount
        : 0;

    setUser(fbUser);
    setUserData(data || null);
    setNickname(nextNickname);
    setPlan(nextPlan);
    setRole(nextRole);
    setDifficulty(nextDifficulty);
    setFreeCount(nextFreeCount);
  };

  const loadUserFromFirestore = async (fbUser) => {
    if (!fbUser) {
      applyUserDoc(null, null);
      return;
    }

    const ref = doc(db, "users", fbUser.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const baseData = {
        email: fbUser.email || "",
        nick: fbUser.displayName || "익명",
        plan: "free",
        role: "user",
        createdAt: Date.now(),
        freeCount: 3,
      };

      await setDoc(ref, baseData);
      applyUserDoc(fbUser, baseData);
    } else {
      const data = snap.data();
      applyUserDoc(fbUser, data);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          applyUserDoc(null, null);
          return;
        }
        await loadUserFromFirestore(fbUser);
      } catch (err) {
        console.error("AuthContext Firestore 에러:", err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // 무료 사용 가능 횟수 1 감소
  const decrementFreeCount = async () => {
    if (!user) return false;
    if (freeCount == null || freeCount <= 0) return false;

    try {
      const newCount = freeCount - 1;
      setFreeCount(newCount);

      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { freeCount: newCount });

      setUserData((prev) =>
        prev ? { ...prev, freeCount: newCount } : prev
      );

      return true;
    } catch (err) {
      console.error("freeCount 차감 실패:", err);
      return false;
    }
  };

  // 회원가입 + Firestore 문서 생성 + Context 반영
  const signUp = async (email, password, nick) => {
    try {
      const res = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(res.user, { displayName: nick });

      const baseData = {
        email,
        nick,
        plan: "free",
        role: "user",
        createdAt: Date.now(),
        freeCount: 3,
      };

      const ref = doc(db, "users", res.user.uid);
      await setDoc(ref, baseData);

      applyUserDoc(res.user, baseData);
      return res.user;
    } catch (err) {
      console.error("회원가입 실패:", err);
      throw err;
    }
  };

  // PaymentSuccess 등에서 다시 유저 정보를 새로 읽고 싶을 때
  const refreshUser = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) {
      applyUserDoc(null, null);
      return;
    }

    try {
      await loadUserFromFirestore(fbUser);
    } catch (err) {
      console.error("refreshUser 중 오류:", err);
    }
  };

  // 결제 성공 후 클라이언트에서 plan: 'premium' 반영
  const upgradeToPremium = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return;

    try {
      const ref = doc(db, "users", fbUser.uid);
      await setDoc(
        ref,
        { plan: "premium" },
        { merge: true }
      );

      setPlan("premium");
      setUserData((prev) =>
        prev ? { ...prev, plan: "premium" } : prev
      );
    } catch (err) {
      console.error("upgradeToPremium 오류:", err);
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        nickname,
        setNickname,
        plan,
        role,
        difficulty,
        freeCount,
        setFreeCount,
        decrementFreeCount,
        authReady,
        logout,
        signUp,
        refreshUser,
        upgradeToPremium,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
