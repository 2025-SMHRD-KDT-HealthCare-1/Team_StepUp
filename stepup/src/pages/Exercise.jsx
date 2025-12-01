// src/pages/Exercise.jsx
import MainNav from "../components/MainNav";
import { useNavigate } from "react-router-dom";

export default function Exercise() {
  const navigate = useNavigate();

  // 운동 이미지 클릭 시 바로 /pose 로 이동
  const goPose = () => {
    navigate("/pose");
  };

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      <MainNav />

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "110px 24px 40px",
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
          운동 선택
        </h2>

        {/* 4개 운동 이미지 그리드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
        >
          {/* 플랭크 */}
          <div
            onClick={() => navigate("/pose")}
            style={{
              borderRadius: 24,
              overflow: "hidden",
              background: "#fff",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <img
              src="/images/plank.jpg" // 네 프로젝트에 맞게 경로만 조정
              alt="플랭크"
              style={{ width: "100%", display: "block" }}
            />
            <div
              style={{
                padding: "10px 16px",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              플랭크
            </div>
          </div>

          {/* 푸쉬업 */}
          <div
            onClick={goPose}
            style={{
              borderRadius: 24,
              overflow: "hidden",
              background: "#fff",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <img
              src="/images/pushup.jpg"
              alt="푸쉬업"
              style={{ width: "100%", display: "block" }}
            />
            <div
              style={{
                padding: "10px 16px",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              푸쉬업
            </div>
          </div>

          {/* 싯업 */}
          <div
            onClick={goPose}
            style={{
              borderRadius: 24,
              overflow: "hidden",
              background: "#fff",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <img
              src="/images/situp.jpg"
              alt="싯업"
              style={{ width: "100%", display: "block" }}
            />
            <div
              style={{
                padding: "10px 16px",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              싯업
            </div>
          </div>

          {/* 스쿼트 */}
          <div
            onClick={goPose}
            style={{
              borderRadius: 24,
              overflow: "hidden",
              background: "#fff",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <img
              src="/images/squat.jpg"
              alt="스쿼트"
              style={{ width: "100%", display: "block" }}
            />
            <div
              style={{
                padding: "10px 16px",
                textAlign: "center",
              }}
            >
              스쿼트
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
