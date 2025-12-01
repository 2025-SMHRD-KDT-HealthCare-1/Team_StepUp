// src/pages/Signup.jsx
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export default function Signup() {
  const [id, setId] = useState("");
  const [nickname, setNickname] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ 이메일/닉네임 중복 체크 상태
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailDuplicated, setEmailDuplicated] = useState(false);

  const [nickChecked, setNickChecked] = useState(false);
  const [nickDuplicated, setNickDuplicated] = useState(false);

  // ✅ 이메일/비밀번호 UX 힌트
  const [emailHint, setEmailHint] = useState("");
  const [pwHint, setPwHint] = useState("");

  const nav = useNavigate();

  // =========================
  //  간단한 검사용 함수
  // =========================
  const isValidEmail = (value) => {
    return /\S+@\S+\.\S+/.test(value);
  };

  const getPwHint = (value) => {
    if (!value) return "";
    if (value.length < 6) return "비밀번호는 6자 이상이어야 합니다.";
    if (!/[0-9]/.test(value) || !/[A-Za-z]/.test(value)) {
      return "영문 + 숫자를 섞어서 사용하면 더 안전해요.";
    }
    return "좋아요! 비교적 안전한 비밀번호입니다.";
  };

  // =========================
  //  이메일 중복 확인
  // =========================
  const handleCheckEmail = async () => {
    const email = id.trim();
    if (!email) {
      alert("먼저 이메일(ID)을 입력해 주세요.");
      return;
    }

    try {
      // 상태 초기화
      setEmailChecked(false);
      setEmailDuplicated(false);

      // 1) Auth 쪽에 가입된 이메일인지 확인
      const methods = await fetchSignInMethodsForEmail(auth, email);
      const existsInAuth = methods.length > 0;

      // 2) Firestore users 에서도 이메일 중복 여부 확인
      const q = query(collection(db, "users"), where("email", "==", email));
      const snap = await getDocs(q);
      const existsInUsers = !snap.empty;

      if (existsInAuth || existsInUsers) {
        setEmailChecked(true);
        setEmailDuplicated(true);
        setEmailHint("이미 가입된 이메일입니다.");
        alert("이미 가입된 이메일입니다. 로그인 해 주세요.");
      } else {
        setEmailChecked(true);
        setEmailDuplicated(false);
        setEmailHint("사용 가능한 이메일입니다.");
        alert("사용 가능한 이메일입니다.");
      }
    } catch (err) {
      console.error("이메일 중복 확인 오류:", err);
      setEmailChecked(false);
      setEmailDuplicated(false);

      if (err.code === "auth/invalid-email") {
        setEmailHint("이메일 형식이 올바르지 않습니다.");
        alert("이메일 형식이 올바르지 않습니다.");
      } else {
        alert(
          `이메일 중복 확인 중 오류가 발생했습니다.\n(${err.code || err.message})`
        );
      }
    }
  };

  // =========================
  //  닉네임 중복 확인
  // =========================
  const handleCheckNickname = async () => {
    const nick = nickname.trim();
    if (!nick) {
      alert("먼저 닉네임을 입력해 주세요.");
      return;
    }

    try {
      setNickChecked(false);
      setNickDuplicated(false);

      const q = query(collection(db, "users"), where("nick", "==", nick));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setNickChecked(true);
        setNickDuplicated(true);
        alert("이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.");
      } else {
        setNickChecked(true);
        setNickDuplicated(false);
        alert("사용 가능한 닉네임입니다.");
      }
    } catch (err) {
      console.error("닉네임 중복 확인 오류:", err);
      setNickChecked(false);
      setNickDuplicated(false);
      alert("닉네임 중복 확인 중 오류가 발생했습니다.");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!id.trim()) {
      alert("이메일(ID)을 입력해 주세요.");
      return;
    }
    if (!nickname.trim()) {
      alert("닉네임을 입력해 주세요.");
      return;
    }
    if (!pw || !pw2) {
      alert("비밀번호와 비밀번호 확인을 입력해 주세요.");
      return;
    }
    if (pw !== pw2) {
      alert("비밀번호가 서로 다릅니다.");
      return;
    }

    // ✅ 이메일/닉네임 중복 확인 강제
    if (!emailChecked) {
      alert("이메일 중복확인을 먼저 해 주세요.");
      return;
    }
    if (emailDuplicated) {
      alert("이미 가입된 이메일입니다. 다른 이메일을 사용해 주세요.");
      return;
    }
    if (!nickChecked) {
      alert("닉네임 중복확인을 먼저 해 주세요.");
      return;
    }
    if (nickDuplicated) {
      alert("이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.");
      return;
    }

    try {
      setLoading(true);

      // 1) Firebase Auth 회원가입
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        id.trim(),
        pw
      );
      const user = userCredential.user;

      // 2) 프로필에 닉네임 저장
      await updateProfile(user, {
        displayName: nickname,
      });

      // 3) Firestore users/{uid} 문서 생성
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          email: user.email,
          nick: nickname,
          plan: "free",
          role: "user",
          createdAt: Date.now(),
          hasCompletedSurvey: false,
        },
        { merge: true }
      );

      alert("회원가입이 완료되었습니다.\n초기 설문으로 이동합니다.");
      nav("/survey");
    } catch (err) {
      console.error(err);

      let message = "회원가입 중 오류가 발생했습니다.";

      if (err.code === "auth/email-already-in-use") {
        message = "이미 사용 중인 이메일입니다. 로그인 해 주세요.";
        setEmailChecked(true);
        setEmailDuplicated(true);
        setEmailHint("이미 가입된 이메일입니다.");
      } else if (err.code === "auth/invalid-email") {
        message = "이메일 형식이 올바르지 않습니다.";
        setEmailHint("이메일 형식이 올바르지 않습니다.");
      } else if (err.code === "auth/weak-password") {
        message = "비밀번호는 6자 이상이어야 합니다.";
      }

      alert(`${message}\n(${err.code || err.message})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        background: "#f6f6f6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      {/* 가운데 카드 */}
      <form
        onSubmit={handleSignup}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "white",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          padding: 24,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* 제목 */}
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
            Step Up
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
            회원가입
          </div>
          <div style={{ fontSize: 14, color: "#666" }}>
            새로운 계정 정보를 입력해 주세요.
          </div>
        </div>

        {/* 이메일 + 중복확인 버튼 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 14, fontWeight: 500, color: "#333" }}>
            이메일(ID)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              placeholder="example@email.com"
              value={id}
              onChange={(e) => {
                const v = e.target.value;
                setId(v);
                // 이메일 수정하면 다시 확인 필요
                setEmailChecked(false);
                setEmailDuplicated(false);

                if (!v) {
                  setEmailHint("");
                } else if (!isValidEmail(v)) {
                  setEmailHint("이메일 형식이 올바르지 않습니다.");
                } else {
                  setEmailHint("사용 가능한 형식의 이메일입니다.");
                }
              }}
              style={{
                flex: 1,
                height: 40,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #E0E0E0",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={handleCheckEmail}
              style={{
                whiteSpace: "nowrap",
                padding: "0 12px",
                borderRadius: 8,
                border: "1px solid #000",
                background: "#fff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              중복확인
            </button>
          </div>

          {/* 이메일 형식/중복 안내 */}
          {emailHint && (
            <span
              style={{
                fontSize: 12,
                marginTop: 2,
                color: emailHint.includes("올바르지") ? "#d32f2f" : "#388e3c",
              }}
            >
              {emailHint}
            </span>
          )}

          {emailChecked && emailDuplicated && (
            <span style={{ fontSize: 12, color: "red" }}>
              이미 가입된 이메일입니다.
            </span>
          )}
        </div>

        {/* 닉네임 + 중복확인 버튼 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 14, fontWeight: 500, color: "#333" }}>
            닉네임
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="닉네임을 입력해 주세요"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setNickChecked(false);
                setNickDuplicated(false);
              }}
              style={{
                flex: 1,
                height: 40,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #E0E0E0",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={handleCheckNickname}
              style={{
                whiteSpace: "nowrap",
                padding: "0 12px",
                borderRadius: 8,
                border: "1px solid #000",
                background: "#fff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              중복확인
            </button>
          </div>
          {nickChecked && !nickDuplicated && (
            <span style={{ fontSize: 12, color: "green" }}>
              사용 가능한 닉네임입니다.
            </span>
          )}
          {nickChecked && nickDuplicated && (
            <span style={{ fontSize: 12, color: "red" }}>
              이미 사용 중인 닉네임입니다.
            </span>
          )}
        </div>

        {/* 비밀번호 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 14, fontWeight: 500, color: "#333" }}>
            비밀번호
          </label>
          <input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={pw}
            onChange={(e) => {
              const v = e.target.value;
              setPw(v);
              setPwHint(getPwHint(v));
            }}
            style={{
              height: 40,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #E0E0E0",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
          {pwHint && (
            <span
              style={{
                fontSize: 12,
                color: pwHint.includes("좋아요") ? "#388e3c" : "#d32f2f",
              }}
            >
              {pwHint}
            </span>
          )}
        </div>

        {/* 비밀번호 확인 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 14, fontWeight: 500, color: "#333" }}>
            비밀번호 확인
          </label>
          <input
            type="password"
            placeholder="비밀번호를 다시 입력해 주세요"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            style={{
              height: 40,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #E0E0E0",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* 회원가입 버튼 */}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 4,
            height: 44,
            background: "#000",
            borderRadius: 8,
            border: "none",
            color: "white",
            fontSize: 16,
            fontWeight: 500,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>

        {/* 로그인 링크 */}
        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "center",
            gap: 6,
            fontSize: 14,
            color: "#333",
          }}
        >
          <span>이미 계정이 있으신가요?</span>
          <Link
            to="/login"
            style={{
              textDecoration: "none",
              color: "black",
              fontWeight: 600,
            }}
          >
            로그인
          </Link>
        </div>
      </form>
    </div>
  );
}
