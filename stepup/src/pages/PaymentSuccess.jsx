// src/pages/PaymentSuccess.jsx
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://localhost:5000";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { upgradeToPremium, refreshUser } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!sessionId) {
      alert("결제 정보가 올바르지 않습니다.");
      nav("/");
      return;
    }

    const flagKey = `payment_done_${sessionId}`;
    const alreadyDone = sessionStorage.getItem(flagKey);

    // ✅ 이미 처리한 session_id면 다시 안 함
    if (alreadyDone === "done") {
      nav("/");
      return;
    }

    const confirm = async () => {
      try {
        // ✅ 중복 방지 플래그
        sessionStorage.setItem(flagKey, "done");

        // 1) 서버에 결제 확인 요청
        await axios.get(`${API_BASE}/api/pay/confirm`, {
          params: { session_id: sessionId },
        });

        // 2) 프리미엄 반영
        if (typeof upgradeToPremium === "function") {
          await upgradeToPremium();
        } else if (typeof refreshUser === "function") {
          await refreshUser();
        }

        alert("프리미엄 결제가 완료되었습니다! 🎉");
        nav("/");
      } catch (err) {
        console.error("결제 확인 실패:", err);
        // 실패하면 플래그 제거 (다시 시도 가능)
        sessionStorage.removeItem(flagKey);
        alert("결제 확인 중 오류가 발생했습니다.");
        nav("/");
      }
    };

    confirm();
  }, [sessionId, nav, upgradeToPremium, refreshUser]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>
        결제를 확인하는 중입니다...
      </h1>
      <p style={{ fontSize: 12, opacity: 0.7 }}>
        잠시만 기다려 주세요. 프리미엄 플랜이 적용됩니다.
      </p>
    </div>
  );
}
