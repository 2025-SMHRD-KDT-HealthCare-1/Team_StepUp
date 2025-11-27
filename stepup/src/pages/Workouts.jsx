// src/pages/Workouts.jsx
import MainNav from "../components/MainNav";
import { useNavigate } from "react-router-dom";

import plankImg from "../assets/exercise/plank.png";
import pushupImg from "../assets/exercise/pushup.png";
import situpImg from "../assets/exercise/situp.jpeg";
import squatImg from "../assets/exercise/squat.png";

export default function Workouts() {
  const navigate = useNavigate();

  // 🔹 운동 카드 클릭 -> Pose 페이지로 + 운동 정보 전달
  const goPose = (exercise) => {
    navigate("/pose", { state: { exercise } });
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
        >
          {/* 플랭크 */}
          <div
            onClick={() => goPose("plank")}
            style={{
              borderRadius: 24,
              overflow: "hidden",
              background: "#fff",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <img
              src={plankImg}
              alt="플랭크"
              style={{
                width: "100%",
                height: 260,
                objectFit: "cover",
                display: "block",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                padding: "10px 16px",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              플랭크 / Plank
            </div>
          </div>

          {/* 푸쉬업 */}
          <div
            onClick={() => goPose("pushup")}
            style={{
              borderRadius: 24,
              overflow: "hidden",
              background: "#fff",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <img
              src={pushupImg}
              alt="푸쉬업"
              style={{
                width: "100%",
                height: 260,
                objectFit: "cover",
                display: "block",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                padding: "10px 16px",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              푸쉬업 / Push-up
            </div>
          </div>

          {/* 싯업 */}
          <div
            onClick={() => goPose("situp")}
            style={{
              borderRadius: 24,
              overflow: "hidden",
              background: "#fff",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <img
              src={situpImg}
              alt="싯업"
              style={{
                width: "100%",
                height: 260,
                objectFit: "cover",
                display: "block",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                padding: "10px 16px",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              싯업 / Sit-up
            </div>
          </div>

          {/* 스쿼트 */}
          <div
            onClick={() => goPose("squat")}
            style={{
              borderRadius: 24,
              overflow: "hidden",
              background: "#fff",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <img
              src={squatImg}
              alt="스쿼트"
              style={{
                width: "100%",
                height: 260,
                objectFit: "cover",
                display: "block",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                padding: "10px 16px",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              스쿼트 / Squat
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
