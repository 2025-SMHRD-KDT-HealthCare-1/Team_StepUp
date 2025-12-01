// src/pages/Login.jsx
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

export default function Login() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const nav = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, id, pw);
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const snapshot = await getDoc(userRef);

      let hasCompletedSurvey = false;
      if (snapshot.exists()) {
        const data = snapshot.data();
        hasCompletedSurvey = data.hasCompletedSurvey === true;
      }

      if (hasCompletedSurvey) {
        nav("/home");
      } else {
        nav("/survey");
      }
    } catch (err) {
      console.error(err);

      let message = "로그인에 실패했습니다.";

      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-email"
      ) {
        message = "이메일 또는 비밀번호가 올바르지 않습니다.";
      } else if (err.code === "auth/too-many-requests") {
        message = "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.";
      } else if (err.code === "auth/network-request-failed") {
        message = "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
      }

      alert(`${message}\n(${err.code})`);
    }
  };

  return (
    // 🔹 화면 크기와 상관없이 항상 가운데 오는 래퍼
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* 🔹 로그인 패널 (반응형, 최대폭 고정) */}
      <form
        onSubmit={handleLogin}
        style={{
          width: "90vw",         // 화면 90%까지만
          maxWidth: 420,         // 최대 420px
          padding: "32px 24px",
          boxSizing: "border-box",
          background: "white",
          borderRadius: 16,
          boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 24,
        }}
      >
        {/* 상단 Step Up 로고 텍스트 */}
        <div
          style={{
            textAlign: "center",
            color: "black",
            fontSize: 32,
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 600,
            lineHeight: "48px",
          }}
        >
          Step Up
        </div>

        {/* 제목 / 안내문 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              textAlign: "center",
              color: "black",
              fontSize: 24,
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 600,
              lineHeight: "36px",
            }}
          >
            로그인
          </div>
          <div
            style={{
              textAlign: "center",
              color: "#555",
              fontSize: 14,
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 400,
              lineHeight: "20px",
            }}
          >
            사용자 정보를 입력해 주세요.
          </div>
        </div>

        {/* ID 입력 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <label
            style={{
              fontSize: 14,
              color: "#333",
              fontWeight: 500,
            }}
          >
            이메일
          </label>
          <div
            style={{
              width: "100%",
              height: 44,
              padding: "0 12px",
              background: "white",
              borderRadius: 8,
              border: "1px solid #E0E0E0",
              display: "flex",
              alignItems: "center",
              boxSizing: "border-box",
            }}
          >
            <input
              type="email"
              placeholder="이메일을 입력하세요"
              value={id}
              onChange={(e) => setId(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                color: "#333",
                fontSize: 16,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            />
          </div>
        </div>

        {/* PW 입력 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <label
            style={{
              fontSize: 14,
              color: "#333",
              fontWeight: 500,
            }}
          >
            비밀번호
          </label>
          <div
            style={{
              width: "100%",
              height: 44,
              padding: "0 12px",
              background: "white",
              borderRadius: 8,
              border: "1px solid #E0E0E0",
              display: "flex",
              alignItems: "center",
              boxSizing: "border-box",
            }}
          >
            <input
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                color: "#333",
                fontSize: 16,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            />
          </div>
        </div>

        {/* 로그인 버튼 */}
        <button
          type="submit"
          style={{
            width: "100%",
            height: 44,
            background: "black",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: 16,
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 500,
            }}
          >
            로그인
          </span>
        </button>

        {/* 하단: 계정이 없으신가요? */}
        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
            color: "black",
            fontSize: 14,
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 500,
          }}
        >
          <span>계정이 없으신가요?</span>
          <Link
            to="/signup"
            style={{
              textDecoration: "none",
              color: "black",
              fontWeight: 600,
            }}
          >
            회원가입
          </Link>
        </div>
      </form>
    </div>
  );
}
