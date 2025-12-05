// src/pages/Survey.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

export default function Survey() {
  const { user } = useAuth(); // 로그인 된 유저 정보
  const nav = useNavigate();

  // 🔹 설문 입력값 상태
  const [activity, setActivity] = useState("none"); // 최근 운동 빈도
  const [intensity, setIntensity] = useState("easy"); // 선호 강도
  const [goalMinutes, setGoalMinutes] = useState("20"); // 목표 운동 시간(분)
  const [pushupLevel, setPushupLevel] = useState("0"); // 푸쉬업 가능 개수
  const [saving, setSaving] = useState(false);

  // 🔹 난이도 계산 (아주 간단한 규칙)
  const calcDifficulty = () => {
    let score = 0;

    // 운동 빈도
    if (activity === "none") score += 0;
    else if (activity === "sometimes") score += 1;
    else if (activity === "often") score += 2;

    // 선호 강도
    if (intensity === "easy") score += 0;
    else if (intensity === "normal") score += 1;
    else if (intensity === "hard") score += 2;

    // 푸쉬업 개수
    const pu = Number(pushupLevel);
    if (pu >= 0 && pu <= 5) score += 0;
    else if (pu <= 15) score += 1;
    else score += 2;

    // 점수에 따라 난이도 구간 나누기
    if (score <= 2) return "easy";      // 초보
    if (score <= 4) return "medium";    // 중간
    return "hard";                      // 상급
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("로그인 상태가 아닙니다. 다시 로그인 해주세요.");
      nav("/login");
      return;
    }

    setSaving(true);

    try {
      const difficulty = calcDifficulty();

      const ref = doc(db, "users", user.uid);

      await setDoc(
        ref,
        {
          hasCompletedSurvey: true, // ✅ 설문 완료 표시
          initialDifficulty: difficulty, // ✅ 계산된 난이도
          survey: {
            activity,      // 최근 운동 빈도
            intensity,     // 선호 강도
            goalMinutes,   // 하루 목표 운동 시간
            pushupLevel,   // 푸쉬업 개수
          },
        },
        { merge: true }
      );

      alert("초기 설문이 저장되었습니다.\n홈 화면으로 이동합니다.");
      nav("/home")
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("설문 저장 중 오류가 발생했습니다.\n다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#f5f5f5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 600,
          maxWidth: "100%",
          background: "white",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          padding: 32,
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            fontSize: 24,
            marginBottom: 8,
          }}
        >
          StepUp 초기 설문
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#555",
            marginBottom: 24,
          }}
        >
          지금 상태를 알려주시면, AI 코치가{" "}
          <strong>초기 난이도</strong>를 자동으로 설정해 드립니다.
        </p>

        {/* 1. 최근 1주일 운동 빈도 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 8 }}>
            1. 최근 1주일 동안 운동을 얼마나 하셨나요?
          </label>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
            }}
          >
            <option value="none">거의 운동을 안 했다</option>
            <option value="sometimes">주 1~2회 가볍게 했다</option>
            <option value="often">주 3회 이상 규칙적으로 했다</option>
          </select>
        </div>

        {/* 2. 선호 강도 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 8 }}>
            2. 운동 강도는 어떻게 하고 싶으세요?
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 14 }}>
              <input
                type="radio"
                name="intensity"
                value="easy"
                checked={intensity === "easy"}
                onChange={(e) => setIntensity(e.target.value)}
                style={{ marginRight: 4 }}
              />
              편안하게 (무리 없이)
            </label>
            <label style={{ fontSize: 14 }}>
              <input
                type="radio"
                name="intensity"
                value="normal"
                checked={intensity === "normal"}
                onChange={(e) => setIntensity(e.target.value)}
                style={{ marginRight: 4 }}
              />
              적당히 땀 나게
            </label>
            <label style={{ fontSize: 14 }}>
              <input
                type="radio"
                name="intensity"
                value="hard"
                checked={intensity === "hard"}
                onChange={(e) => setIntensity(e.target.value)}
                style={{ marginRight: 4 }}
              />
              빡세게 도전하고 싶다
            </label>
          </div>
        </div>

        {/* 3. 푸쉬업 가능 개수 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 8 }}>
            3. 현재 푸쉬업은 연속으로 몇 개 정도 가능하신가요?
          </label>
          <select
            value={pushupLevel}
            onChange={(e) => setPushupLevel(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
            }}
          >
            <option value="0">못 하거나 1~5개 정도</option>
            <option value="10">6~15개 정도</option>
            <option value="20">16개 이상</option>
          </select>
        </div>

        {/* 4. 하루 목표 운동 시간 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 8 }}>
            4. 하루 목표 운동 시간은 어느 정도로 할까요?
          </label>
          <select
            value={goalMinutes}
            onChange={(e) => setGoalMinutes(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
            }}
          >
            <option value="10">10분</option>
            <option value="20">20분</option>
            <option value="30">30분</option>
            <option value="40">40분 이상</option>
          </select>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={saving}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 8,
            border: "none",
            backgroundColor: "#111",
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          {saving ? "저장 중..." : "설문 완료하고 시작하기"}
        </button>
      </form>
    </div>
  );
}
