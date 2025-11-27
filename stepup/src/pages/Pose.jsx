import { useRef, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import MainNav from "../components/MainNav";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// 🔹 백엔드 서버 주소 (포트는 app.js 콘솔과 동일하게)
const API_BASE = "http://localhost:4000";

// 🔹 난이도별 세트/횟수 최종 확정표
const WORKOUT_LEVELS = {
  easy: {
    label: "초급 모드",
    setsPerDay: 2,
    repsPerSet: 10,
    description:
      "초급자는 하루 2세트(세트당 10회)로 기초 근지구력을 강화합니다. ACSM/NSCA의 초급 가이드라인(세트당 8–15회, 1–3세트)을 기반으로 설계되었습니다.",
  },
  medium: {
    label: "중급 모드",
    setsPerDay: 3,
    repsPerSet: 12,
    description:
      "중급자는 하루 3세트(세트당 12회)로 근지구력을 향상합니다. 국제 운동과학 기준(세트당 8–15회, 2–4세트)을 반영했습니다.",
  },
  hard: {
    label: "고급 모드",
    setsPerDay: 4,
    repsPerSet: 15,
    description:
      "고급자는 하루 4세트(세트당 15회)로 고강도 근지구력 자극을 목표합니다. ACSM/NSCA가 제시하는 상위 난이도 체중 트레이닝 범위를 따릅니다.",
  },
};

// 🔹 유튜브 URL → embed용 URL 변환 (shorts, watch 둘 다 처리)
function buildYoutubeEmbedUrl(url) {
  if (!url) return "";
  try {
    if (url.includes("shorts/")) {
      const id = url.split("shorts/")[1].split("?")[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes("watch?v=")) {
      const id = url.split("watch?v=")[1].split("&")[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  } catch {
    return url;
  }
}

export default function Pose() {
  const iframeRef = useRef(null);
  const location = useLocation();
  const { user } = useAuth();

  // 🔊 한국어 음성 피드백 (TTS)
  const speakKorean = (text) => {
    if (!text) return;
    if (typeof window === "undefined") return;
    if (!window.speechSynthesis) return;

    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ko-KR";
      utter.rate = 1.0;
      utter.pitch = 1.0;

      // 기존 발화 취소하고 새 발화
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn("TTS error:", e);
    }
  };

  // 🔹 Firebase에서 읽어온 난이도 (easy / medium / hard)
  const [difficulty, setDifficulty] = useState("easy");

  // 🔹 카메라 준비 중인지 여부
  const [cameraStarting, setCameraStarting] = useState(false);

  // 🔹 과학적 근거 팝업 열림 여부
  const [showInfo, setShowInfo] = useState(false);
  const [guideInfo, setGuideInfo] = useState(false);

  // 🔹 AI 피드백 상태 (2번 영역에 띄울 내용)
  const [feedback, setFeedback] = useState({
    score: null,
    mainMessage: "",
    detailMessage: "",
  });

  // 🔹 실시간 코칭 메시지 (카메라 위에 뜨는 floating box)
  const [realtimeMsg, setRealtimeMsg] = useState("");
  const [showRealtime, setShowRealtime] = useState(false);
  const realtimeTimeoutRef = useRef(null);

  // 🔹 Firebase에서 현재 회원 난이도 불러오기
  useEffect(() => {
    if (!user) return;

    const fetchDifficulty = async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        const data = snap.data() || {};

        const value =
          data.initialDifficulty ||
          data["ininialDifficulty di"] ||
          data.difficulty ||
          data.level ||
          "easy";

        console.log("🔥 Pose에서 불러온 난이도:", value);
        setDifficulty(value);
      } catch (err) {
        console.error("난이도 불러오기 오류:", err);
      }
    };

    fetchDifficulty();
  }, [user]);

  // 🔹 난이도별 세트/횟수 정보
  const levelInfo = WORKOUT_LEVELS[difficulty] || WORKOUT_LEVELS["easy"];
  const difficultyLabel = levelInfo.label;
  const setsPerDay = levelInfo.setsPerDay;
  const repsPerSet = levelInfo.repsPerSet;
  const totalReps = setsPerDay * repsPerSet;
  const targetMinutes = 10; // 하루 수행 시간 설명용

  // Workouts / MainNav에서 넘어온 운동 타입
  const exercise = location.state?.exercise || "pushup";

  const exerciseNameMap = {
    pushup: "푸쉬업",
    plank: "플랭크",
    situp: "싯업",
    squat: "스쿼트",
  };

  const youtubeMap = {
    pushup: "https://youtube.com/shorts/tLP4k0JKI8Q?si=T0AVHdkJMx9oXabq",
    plank: "https://youtube.com/shorts/cH3J2mHHD1o?si=Uu3wPwiXE1DHT2W2",
    situp: "https://youtube.com/shorts/4oKjx7dpm6c?si=m8zq9DC7_Ch_JCtX",
    squat: "https://youtube.com/shorts/JzfEeZ-WYKE?si=A0oXPzWIvsIvJ6iX",
  };

  const htmlMap = {
    pushup: "/pushup.html",
    plank: "/plank.html",
    situp: "/situp.html",
    squat: "/squat.html",
  };

  const youtubeUrl = youtubeMap[exercise] || youtubeMap["pushup"];
  const youtubeEmbedUrl = buildYoutubeEmbedUrl(youtubeUrl);

  const exerciseLabel = exerciseNameMap[exercise] || "푸쉬업";
  const iframeSrc = htmlMap[exercise] || "/pushup.html";

  // 🔹 운동 로그 MySQL 저장 (videoUrl / 시간 포함)
  const saveWorkoutLog = async ({ reps, score, videoUrl, startedAt, endedAt }) => {
    if (!user) {
      console.log("❌ saveWorkoutLog: user 없음");
      return;
    }

    const payload = {
      userUid: user.uid,
      exercise,
      difficulty,
      reps,
      score,
      videoUrl: videoUrl ?? null,
      startedAt: startedAt || new Date().toISOString(),
      endedAt: endedAt || null,
    };

    try {
      console.log("📤 운동 로그 저장 시도:", payload);
      const res = await axios.post(`${API_BASE}/api/workouts/log`, payload);
      console.log("✅ 운동 로그 저장 성공:", res.data);
    } catch (err) {
      console.error("❌ 운동 로그 저장 실패:", err.message);
      if (err.response) {
        console.log("🔻 서버 status:", err.response.status);
        console.log("🔻 서버 data:", err.response.data);
      } else {
        console.log("🔻 response 없음 (서버 미실행/네트워크 문제일 수 있음)");
      }
    }
  };

  // 🔹 iframe → React 로 오는 AI 피드백 / 실시간 코칭 / 영상 업로드 처리
  useEffect(() => {
    const handleMessage = (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      // 0) 세트 영상 업로드 완료 (pushup.html → Pose.jsx)
      if (data.type === "STEPUP_VIDEO_UPLOADED") {
        const { setIndex, videoUrl } = data;

        console.log("🎥 STEPUP_VIDEO_UPLOADED 수신:", data);

        // 세트 종료 시점 로그 (reps/score 없으면 null로 저장)
        saveWorkoutLog({
          reps: data.reps ?? null,
          score: data.score ?? null,
          videoUrl,
          endedAt: new Date().toISOString(),
        });

        return;
      }

      // 1) 세트 요약 피드백
      if (data.type === "STEPUP_FEEDBACK") {
        const nextFeedback = {
          score: data.score ?? null,
          mainMessage: data.mainMessage ?? "",
          detailMessage: data.detailMessage ?? "",
        };

        setFeedback(nextFeedback);

        // 세트 피드백(위+아래) 같이 읽기
        const speakText = [
          nextFeedback.mainMessage,
          nextFeedback.detailMessage,
        ]
          .filter(Boolean)
          .join(". ");

        if (speakText) {
          speakKorean(speakText);
        }

        // 세트 요약 로그(영상 없이 텍스트/점수만 저장)
        saveWorkoutLog({
          reps: data.reps ?? totalReps,
          score: data.score ?? null,
        });

        return;
      }

      // 2) 실시간 코칭 피드백
      if (data.type === "STEPUP_REALTIME") {
        const text = data.mainMessage || data.detailMessage || "";

        if (text) {
          setRealtimeMsg(text);
          setShowRealtime(true);

          // 음성으로 읽기
          speakKorean(text);

          // floating box 자동 숨김 타이머
          if (realtimeTimeoutRef.current) {
            clearTimeout(realtimeTimeoutRef.current);
          }
          realtimeTimeoutRef.current = setTimeout(() => {
            setShowRealtime(false);
            realtimeTimeoutRef.current = null;
          }, 2500);
        }

        // 카드에도 마지막 코칭 내용 반영
        setFeedback((prev) => ({
          ...prev,
          mainMessage: data.mainMessage || prev.mainMessage,
          detailMessage: data.detailMessage || prev.detailMessage,
        }));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (realtimeTimeoutRef.current) {
        clearTimeout(realtimeTimeoutRef.current);
        realtimeTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalReps, difficulty, exercise, user]);

  // 🔹 카메라 시작 (세트/횟수 전달)
  const handleStartCamera = () => {
    if (cameraStarting) return;

    const iframeEl = iframeRef.current;
    if (!iframeEl) return;

    const iframeWindow = iframeEl.contentWindow;
    if (!iframeWindow) return;

    iframeWindow.postMessage(
      {
        type: "STEPUP_SET_TARGET",
        difficulty,
        setsPerDay,
        repsPerSet,
        totalReps,
      },
      "*"
    );

    if (typeof iframeWindow.startCamera === "function") {
      iframeWindow.startCamera();
    } else {
      iframeWindow.postMessage({ type: "STEPUP_START_CAMERA" }, "*");
    }

    setCameraStarting(true);
    setTimeout(() => setCameraStarting(false), 2500);

    // 🔹 분석 시작 시점 로그 (원하면 유지 / 싫으면 이 줄만 주석 처리)
    saveWorkoutLog({
      reps: totalReps,
      score: null,
      startedAt: new Date().toISOString(),
    });
  };

  const buttonLabel = cameraStarting
    ? "카메라 준비 중..."
    : "실시간 분석 시작하기";

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", paddingTop: 110 }}>
      <MainNav />

      <div
        style={{
          display: "flex",
          gap: 12,
          width: "100vw",
          padding: "0",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        {/* 왼쪽 패널: AI 피드백 + 자극 부위 이미지 */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: 24, width: 300 }}
        >
          <div
            style={{
              borderRadius: 24,
              padding: 20,
              background: "#fff",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: 23, fontWeight: 600, marginBottom: 8, height: 40 }}
            >
              AI 분석 및 피드백
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#e53935",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {feedback.score !== null
                ? `현재 자세 점수 : ${feedback.score}점`
                : "아직 분석 결과가 없습니다."}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#666",
                lineHeight: 1.6,
                marginBottom: 8,
              }}
            >
              현재 난이도 : <b>{difficultyLabel}</b>
              <br />
              오늘 목표 :{" "}
              <b>
                {setsPerDay}세트 × {repsPerSet}회 (총 {totalReps}회)
              </b>
              <br />
              하루 약 {targetMinutes}분 안에서 위 루틴을 채워보세요.
            </div>
            {(feedback.mainMessage || feedback.detailMessage) && (
              <div
                style={{
                  marginTop: 4,
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "#fff3e0",
                  fontSize: 12,
                  color: "#5d4037",
                  lineHeight: 1.6,
                }}
              >
                {feedback.mainMessage && (
                  <div style={{ fontWeight: 600 }}>{feedback.mainMessage}</div>
                )}
                {feedback.detailMessage && <div>{feedback.detailMessage}</div>}
              </div>
            )}
          </div>

          <div
            style={{
              borderRadius: 24,
              background: "linear-gradient(90deg, #f8ff00 0%, #3ad59f 100%)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              height: 500,
              padding: 0,
              overflow: "hidden",
            }}
          >
            <div style={{ width: "90%" }}>
              <div
                style={{
                  fontSize: 23,
                  fontWeight: 600,
                  marginTop: 10,
                  height: 40,
                }}
              >
                자극 부위
              </div>
              <br />
              <img
                src="/public/pushup_muscle_up.png"
                style={{
                  width: "100%",
                  height: "160px",
                  objectFit: "fill",
                  borderRadius: 16,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
                alt="푸쉬업 상단 자세 자극 부위"
              />
              <div
                style={{
                  marginTop: 2,
                  fontSize: 15,
                  lineHeight: 1.4,
                  color: "black",
                }}
              >
                상단 자세에서는 대흉근(가슴), 삼두근, 전면 삼각근(어깨)에
                강하게 자극이 들어갑니다.
              </div>
            </div>

            {/* 하단 이미지 + 설명 */}
            <div style={{ width: "90%" }}>
              <img
                src="/public/pushup_muscle_down.png"
                style={{
                  width: "100%",
                  height: "160px",
                  objectFit: "fill",
                  borderRadius: 16,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  marginTop: 3,
                }}
                alt="푸쉬업 하강 자세 자극 부위"
              />
              <div
                style={{
                  marginTop: 2,
                  fontSize: 15,
                  lineHeight: 1.4,
                  color: "black",
                }}
              >
                하강 구간에서는 가슴이 충분히 늘어나면서 어깨와 팔꿈치에
                부하가 걸립니다.
              </div>
            </div>
          </div>
        </div>

        {/* 중앙 패널: 실시간 AI 자세분석 */}
        <div
          style={{
            flex: 0.8,
            borderRadius: 24,
            padding: 24,
            background: "linear-gradient(90deg, #00d2ff 0%, #3a47d5 100%)",
            color: "#fff",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignItems: "center",
            height: 700,
          }}
        >
          <div
            style={{ fontSize: 23, fontWeight: 600, color: "black" }}
          >
            실시간 AI 자세 분석
          </div>

          <div
            style={{
              fontSize: 13,
              opacity: 0.9,
              lineHeight: 1.7,
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            현재 선택된 운동 : <b>{exerciseLabel}</b>
            <br />
            현재 회원 난이도 : <b>{difficultyLabel}</b>
            <br />
            오늘 목표 :{" "}
            <b>
              {setsPerDay}세트 × {repsPerSet}회 (총 {totalReps}회)
            </b>
            <br />
            하루 약 {targetMinutes}분 안에서 위 루틴을 채워보세요.
          </div>

          {/* 카메라 컨테이너 */}
          <div
            style={{
              position: "relative",
              borderRadius: 18,
              background: "rgba(255,255,255,0.16)",
              width: "100%",
              height: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* 실시간 코칭 floating box (카메라 위) */}
            {showRealtime && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  position: "absolute",
                  top: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 2200,
                  maxWidth: "90%",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.92)",
                  color: "#111",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: "center",
                  transition: "opacity 300ms ease, transform 300ms ease",
                  opacity: showRealtime ? 1 : 0,
                }}
              >
                {realtimeMsg}
              </div>
            )}

            <iframe
              ref={iframeRef}
              src={iframeSrc}
              title="Exercise Pose Analyzer"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                borderRadius: 18,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <button
              onClick={() => setShowInfo(true)}
              style={{
                padding: "8px 14px",
                borderRadius: 9999,
                border: "none",
                background: "rgba(0,0,0,0.3)",
                color: "#fff",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              루틴의 근거 & 정확도 기준
            </button>

            <button
              onClick={handleStartCamera}
              disabled={cameraStarting}
              style={{
                padding: "10px 18px",
                borderRadius: 9999,
                border: "none",
                background: "#000",
                color: "#fff",
                cursor: cameraStarting ? "default" : "pointer",
                opacity: cameraStarting ? 0.7 : 1,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {buttonLabel}
            </button>

            <button
              onClick={() => setGuideInfo(true)}
              style={{
                padding: "8px 14px",
                borderRadius: 9999,
                border: "none",
                background: "rgba(0,0,0,0.3)",
                color: "#fff",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              사용 가이드
            </button>
          </div>
        </div>

        {/* 오른쪽 패널: 유튜브 영상 */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: 24, width: 400 }}
        >
          <div
            style={{
              borderRadius: 24,
              padding: 24,
              background: "linear-gradient(90deg, #d53369 0%, #daae51 100%)",
              color: "#fff",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              height: 700,
            }}
          >
            <div
              style={{
                fontSize: 23,
                fontWeight: 600,
                textAlign: "center",
                color: "black",
              }}
            >
              유튜브 참고 영상
            </div>
            <div
              style={{
                fontSize: 14,
                opacity: 0.9,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              현재 선택된 운동 : <b>{exerciseLabel}</b>
              <br />
              현재 난이도 : <b>{difficultyLabel}</b>
              <br />
              오늘 목표 :{" "}
              <b>
                {setsPerDay}세트 × {repsPerSet}회 (총 {totalReps}회)
              </b>
            </div>
            <div
              style={{
                borderRadius: 18,
                background: "rgba(0, 0, 0, 0.4)",
                height: 600,
                overflow: "hidden",
              }}
            >
              {youtubeEmbedUrl && (
                <iframe
                  width="100%"
                  height="100%"
                  src={youtubeEmbedUrl}
                  title="유튜브 운동 영상"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ border: "none" }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🔹 과학적 근거 팝업 */}
      {showInfo && (
        <div
          onClick={() => setShowInfo(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              maxWidth: 480,
              borderRadius: 20,
              background: "#fff",
              padding: 20,
              boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              루틴의 근거 & 정확도 기준
            </div>
            <div style={{ marginBottom: 10 }}>
              StepUp의 난이도별 루틴(초급 2×10회, 중급 3×12회, 고급 4×15회)은
              <br />
              ACSM(미국스포츠의학회)과 NSCA(국제체력협회)의 운동과학
              가이드라인에서 제시하는
              <br />
              <b>“세트당 8~15회, 1~4세트”</b> 범위를 기반으로 설계되었습니다.
            </div>
            <div style={{ marginBottom: 10 }}>
              StepUp의 정확도 기준은
              <br />
              NASM(미국스포츠의학회 자격증 발급/교육 기관)의
              <br />
              운동 자세 가이드 영상을 기반으로 설계되었습니다.
            </div>
            <div style={{ textAlign: "right" }}>
              <button
                onClick={() => setShowInfo(false)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 9999,
                  border: "none",
                  background: "#000",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 사용 가이드 팝업 */}
      {guideInfo && (
        <div
          onClick={() => setGuideInfo(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              maxWidth: 480,
              borderRadius: 20,
              background: "#fff",
              padding: 20,
              boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              사용 가이드
            </div>
            <div style={{ marginBottom: 10 }}>
              1. 웹캠의 연결 여부와 웹페이지의 카메라 권한을 확인해주세요.
              <br />
              2. <b>"실시간 분석 시작하기"</b> 버튼을 클릭 후 가이드라인에 맞게
              웹캠을 배치해주세요.
              <br />
              3. AI가 제안하는 난이도에 따라 운동 진행 후{" "}
              <b>"AI 분석 및 피드백"</b>을 확인해주세요.
            </div>
            <div style={{ marginBottom: 10 }}>
              운동 후 제공되는 <b>"AI 분석 및 피드백"</b>은 <b>"기록"</b>{" "}
              페이지에서도 확인하실 수 있습니다.
            </div>
            <div style={{ textAlign: "right" }}>
              <button
                onClick={() => setGuideInfo(false)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 9999,
                  border: "none",
                  background: "#000",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
