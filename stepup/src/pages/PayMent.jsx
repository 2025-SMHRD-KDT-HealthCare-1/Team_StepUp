// src/pages/Payment.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import MainNav from "../components/MainNav";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://localhost:5000";

export default function Payment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // 프리미엄 플랜 정보 (UI용)
  const PLAN = {
    label: "프리미엄",
    price: 4500,
    desc: "월 4,500원 · AI 코칭, 통계, 운동 영상 및 피드백 저장 기능 무제한 제공",
  };

  // Stripe Checkout 세션 만들기 → Stripe 결제 페이지로 이동
  const handlePay = async () => {
    // 1. 로그인 체크
    if (!user) {
      alert("로그인 후 이용할 수 있습니다.");
      return;
    }

    if (!user.email) {
      alert("이메일 정보가 없는 계정입니다. 다시 로그인해주세요.");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(
        `${API_BASE}/api/pay/create-checkout-session`,
        {
          userId: user.uid,
          email: user.email,
        }
      );

      // 정상일 때만 Stripe로 이동
      window.location.href = res.data.url;
    } catch (err) {
      console.error(
        "결제 세션 생성 오류:",
        err.response?.status,
        err.response?.data || err.message || err
      );

      alert(
        err.response?.data?.message ||
          "결제 페이지로 이동하는 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#fff" }}>
      <MainNav />

      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "rgba(15, 23, 42, 0.95)",
            borderRadius: "16px",
            padding: "20px 20px 24px",
            boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
          }}
        >
          <h2 style={{ fontSize: "20px", marginBottom: "4px" }}>
            StepUp 결제 페이지
          </h2>
          <p style={{ fontSize: "12px", opacity: 0.8, marginBottom: "16px" }}>
            프리미엄 이용권을 결제하면 확장 기능을 이용할 수 있습니다.
            <br />
            결제 버튼을 누르면 Stripe 결제 페이지로 이동합니다.
          </p>

          {/* 프리미엄 플랜 박스 */}
          <div
            style={{
              marginBottom: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "12px",
                background: "linear-gradient(135deg,#f97316,#facc15)",
                color: "#0f172a",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <div>프리미엄 이용권</div>
              <div style={{ fontSize: "11px", marginTop: 4 }}>
                월 {PLAN.price.toLocaleString()}원
              </div>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: "12px",
                background: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.4)",
                fontSize: "12px",
              }}
            >
              <div style={{ marginBottom: "4px", fontWeight: 600 }}>
                선택한 요금제: {PLAN.label}
              </div>
              <div style={{ opacity: 0.8, marginBottom: "4px" }}>
                {PLAN.desc}
              </div>
              <div style={{ fontWeight: 700, marginTop: "4px" }}>
                결제 예정 금액: {PLAN.price.toLocaleString()}원 / 월
              </div>
            </div>
          </div>

          {/* 버튼 영역 */}
          <button
            type="button"
            onClick={handlePay}
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: "999px",
              border: "none",
              fontWeight: 700,
              fontSize: "13px",
              cursor: loading ? "default" : "pointer",
              background: "linear-gradient(135deg,#f97316,#facc15)",
              color: "#0f172a",
              marginBottom: "8px",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "결제 페이지로 이동 중..." : "Stripe로 결제하기"}
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              width: "100%",
              padding: "8px 0",
              borderRadius: "999px",
              border: "1px solid #4b5563",
              fontSize: "12px",
              cursor: "pointer",
              background: "transparent",
              color: "#e5e7eb",
            }}
          >
            뒤로가기
          </button>

          <p
            style={{
              marginTop: "8px",
              fontSize: "10px",
              opacity: 0.6,
              lineHeight: 1.4,
            }}
          >
            * 현재 Stripe Sandbox(테스트 모드)에서만 결제가 이루어지며,
            실제 카드 청구는 발생하지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
