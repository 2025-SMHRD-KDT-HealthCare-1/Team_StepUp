// src/pages/Payment.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Payment() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  // 🔹 이제는 프리미엄 플랜만 존재
  const PLAN = {
    label: "프리미엄",
    price: 4500,
    desc: "월 4,500원 · AI 코칭, 통계, 운동 영상 및 피드백 저장 기능 무제한 제공",
  };

  function handleSubmit(e) {
    e.preventDefault();

    if (!name || !cardNumber || !expiry || !cvc) {
      alert("이름과 카드 정보를 모두 입력해 주세요.");
      return;
    }

    alert(
      `결제가 완료되었습니다.\n\n요금제: ${PLAN.label}\n결제 금액: ${PLAN.price.toLocaleString()}원`
    );
    navigate("/");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
        color: "#fff",
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
          프리미엄 이용권을 결제하고 확장 기능을 이용해 보세요. (모의 결제 화면)
        </p>

        {/* 🔹 프리미엄 플랜 박스 */}
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

        {/* 결제 폼 */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "8px", fontSize: "12px" }}>
            <label>
              이름
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="카드 소유자 이름"
                style={{
                  marginTop: "4px",
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #4b5563",
                  background: "#020617",
                  color: "#e5e7eb",
                  fontSize: "12px",
                  boxSizing: "border-box",
                }}
              />
            </label>
          </div>

          <div style={{ marginBottom: "8px", fontSize: "12px" }}>
            <label>
              카드 번호
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="1234 5678 9012 3456"
                style={{
                  marginTop: "4px",
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #4b5563",
                  background: "#020617",
                  color: "#e5e7eb",
                  fontSize: "12px",
                  boxSizing: "border-box",
                }}
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "12px",
              fontSize: "12px",
            }}
          >
            <label style={{ flex: 1 }}>
              유효기간
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="MM/YY"
                style={{
                  marginTop: "4px",
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #4b5563",
                  background: "#020617",
                  color: "#e5e7eb",
                  fontSize: "12px",
                  boxSizing: "border-box",
                }}
              />
            </label>

            <label style={{ width: "90px" }}>
              CVC
              <input
                type="password"
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                placeholder="***"
                style={{
                  marginTop: "4px",
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #4b5563",
                  background: "#020617",
                  color: "#e5e7eb",
                  fontSize: "12px",
                  boxSizing: "border-box",
                }}
              />
            </label>
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: "999px",
              border: "none",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              background: "linear-gradient(135deg,#f97316,#facc15)",
              color: "#0f172a",
              marginBottom: "8px",
            }}
          >
            결제하기
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
            ※ 이 화면은 학습용 모의 결제 페이지입니다. 실제로 카드 결제가
            이루어지지 않습니다.
          </p>
        </form>
      </div>
    </div>
  );
}
