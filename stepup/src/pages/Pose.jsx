// src/pages/Pose.jsx
import { useRef, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import MainNav from "../components/MainNav";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";



// 🔹 백엔드 서버 주소
const API_BASE = "http://localhost:5000";

// 🔹 난이도별 세트/횟수
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

// 🔹 유튜브 URL → embed용 URL 변환
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
  const { user, plan, role, freeCount, decrementFreeCount } = useAuth();
  const startedAtRef = { current: null };

  // 🔊 한국어 TTS
  const speakKorean = (text) => {
    if (!text) return;
    if (typeof window === "undefined") return;
    if (!window.speechSynthesis) return;

    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ko-KR";
      utter.rate = 1.0;
      utter.pitch = 1.0;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn("TTS error:", e);
    }
  };

  const [difficulty, setDifficulty] = useState("easy");
  const [cameraStarting, setCameraStarting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [guideInfo, setGuideInfo] = useState(false);

  const [feedback, setFeedback] = useState({
    score: null,
    mainMessage: "",
    detailMessage: "",
  });

  const [realtimeMsg, setRealtimeMsg] = useState("");
  const [showRealtime, setShowRealtime] = useState(false);
  const realtimeTimeoutRef = useRef(null);

  const [bestLog, setBestLog] = useState(null);
  const [battleResult, setBattleResult] = useState(null);

  const lastSetInfoRef = useRef({
    reps: null,
    score: null,
    mainMessage: "",
    detailMessage: "",
  });

  // 🔹 난이도 불러오기
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

  const levelInfo = WORKOUT_LEVELS[difficulty] || WORKOUT_LEVELS["easy"];
  const difficultyLabel = levelInfo.label;
  const setsPerDay = levelInfo.setsPerDay;
  const repsPerSet = levelInfo.repsPerSet;
  const totalReps = setsPerDay * repsPerSet;
  const targetMinutes = 10;

  const isPremium = plan === "premium" || role === "trainer";

  const exercise = location.state?.exercise || "pushup";

  const exerciseNameMap = {
    pushup: "푸쉬업",
    plank: "플랭크",
    situp: "싯업",
    squat: "스쿼트",
  };

  const youtubeMap = {
    pushup: "https://youtube.com/shorts/IGA9a1RVScU?si=-Er3sSk408DiTpBs",
    plank: "https://youtube.com/shorts/cH3J2mHHD1o?si=Uu3wPwiXE1DHT2W2",
    situp: "https://youtube.com/shorts/4oKjx7dpm6c?si=m8zq9DC7_Ch_JCtX",
    squat: "https://youtube.com/shorts/Bs5kzRPvYxs?si=WmsF455suvCGqiJn",
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

  // 🔹 최고 기록 불러오기
  useEffect(() => {
    if (!user) return;

    const fetchBestLog = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/workouts/logs`, {
          params: { userUid: user.uid },
        });
        const rows = res.data || [];

        const candidates = rows.filter(
          (r) =>
            r.exercise === exercise &&
            r.difficulty === difficulty &&
            r.score !== null &&
            r.score !== undefined
        );

        if (candidates.length === 0) {
          setBestLog(null);
          setBattleResult(null);
          return;
        }

        const best = candidates.reduce((acc, cur) =>
          cur.score > acc.score ? cur : acc
        );
        // ✅ 오타 수정: '최고' → best
        setBestLog(best);
        setBattleResult(null);
      } catch (e) {
        console.error("대결용 이전 기록 불러오기 오류:", e);
      }
    };

    fetchBestLog();
  }, [user, exercise, difficulty]);

  // 🔹 로그 저장
  const saveWorkoutLog = async ({
    reps,
    score,
    videoUrl,
    startedAt,
    endedAt,
    durationSec,
    feedbackMain,
    feedbackDetail,
  }) => {
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
      durationSec: durationSec ?? null,
      feedbackMain: feedbackMain || null,
      feedbackDetail: feedbackDetail || null,
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

  // 🔹 iframe → React 메시지 처리
  useEffect(() => {
    const handleMessage = (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      // 🎥 세트 영상 업로드 완료
      if (data.type === "STEPUP_VIDEO_UPLOADED") {
        console.log("🎥 STEPUP_VIDEO_UPLOADED 수신:", data);

        const {
          reps: storedReps,
          score: storedScore,
          mainMessage,
          detailMessage,
        } = lastSetInfoRef.current || {};

        const finalReps = storedReps ?? data.reps ?? null;
        const finalScore = storedScore ?? data.score ?? null;

        // ★ 시작/종료 시각 및 소요시간 계산
        const startedAt = startedAtRef.current || new Date().toISOString();
        const endedAt = new Date().toISOString();
        const durationSec = Math.max(
          1,
          Math.round((new Date(endedAt) - new Date(startedAt)) / 1000)
        );

        // ★ durationSec 포함해서 로그 저장
        saveWorkoutLog({
          reps: finalReps,
          score: finalScore,
          videoUrl: data.videoUrl,
          startedAt,
          endedAt,
          durationSec,
          feedbackMain: mainMessage,
          feedbackDetail: detailMessage,
        });

        startedAtRef.current = null;

        lastSetInfoRef.current = {
          reps: null,
          score: null,
          mainMessage: "",
          detailMessage: "",
        };

        return;
      }

      // 세트 요약 피드백
      if (data.type === "STEPUP_FEEDBACK") {
        const nextFeedback = {
          score: data.score ?? null,
          mainMessage: data.mainMessage ?? "",
          detailMessage: data.detailMessage ?? "",
        };

        setFeedback(nextFeedback);

        const speakText = [
          nextFeedback.mainMessage,
          nextFeedback.detailMessage,
        ]
          .filter(Boolean)
          .join(". ");

        if (speakText) {
          speakKorean(speakText);
        }

        if (data.score !== null && data.score !== undefined) {
          const nowScore = data.score;
          const prevBest = bestLog?.score ?? null;

          let result = null;
          if (!bestLog || prevBest === null) {
            result = "first";
          } else if (nowScore > prevBest) {
            result = "win";
          } else if (nowScore === prevBest) {
            result = "draw";
          } else {
            result = "lose";
          }

          setBattleResult(result);

          setBestLog((prev) => {
            if (!prev || nowScore > (prev.score ?? 0)) {
              return {
                ...(prev || {}),
                score: nowScore,
                reps: data.reps ?? totalReps,
              };
            }
            return prev;
          });

          if (result === "first") {
            alert(
              `첫 기록이 저장되었습니다!\n이제부터는 '최고 기록의 나'와 계속 대결하게 됩니다.`
            );
          } else if (result === "win") {
            alert(
              `최고 기록의 나를 이겼습니다!\n새 최고 점수: ${nowScore}점 (이전 최고: ${prevBest}점)`
            );
          } else if (result === "draw") {
            alert(
              `최고 기록의 나와 동점입니다.\n현재 점수: ${nowScore}점 (최고 기록: ${prevBest}점)`
            );
          } else if (result === "lose") {
            alert(
              `아쉽게도 최고 기록의 나에게 졌습니다.\n이번 점수: ${nowScore}점 / 최고 기록: ${prevBest}점\n다음 세트에 다시 도전해 보세요.`
            );
          }
        }

        lastSetInfoRef.current = {
          reps: data.reps ?? totalReps,
          score: data.score ?? null,
          mainMessage: nextFeedback.mainMessage,
          detailMessage: nextFeedback.detailMessage,
        };

        return;
      }

      // 실시간 피드백(상단 알약 + TTS)
      if (data.type === "STEPUP_REALTIME") {
        const text = data.mainMessage || data.detailMessage || "";

        if (text) {
          setRealtimeMsg(text);
          setShowRealtime(true);

          speakKorean(text);

          if (realtimeTimeoutRef.current) {
            clearTimeout(realtimeTimeoutRef.current);
          }
          realtimeTimeoutRef.current = setTimeout(() => {
            setShowRealtime(false);
            realtimeTimeoutRef.current = null;
          }, 2500);
        }

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
  }, [totalReps, difficulty, exercise, user, bestLog]);

  // 🔹 카메라 시작
  const handleStartCamera = async () => {
    if (cameraStarting || isAnalyzing) return;

    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!isPremium) {
      if (!freeCount || freeCount <= 0) {
        alert(
          "무료 분석 3회를 모두 사용하셨습니다.\n추가 분석을 이용하려면 업그레이드가 필요합니다."
        );
        return;
      }

      const ok = await decrementFreeCount();
      if (!ok) {
        alert(
          "무료 분석 횟수 차감 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요."
        );
        return;
      }
    }

    // ✅ 세트 시작 시각 기록 (duration 계산용)
    startedAtRef.current = new Date().toISOString();

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
    setIsAnalyzing(true);
    setTimeout(() => setCameraStarting(false), 2500);
  };

  // 🔹 분석 중지
  const handleStopAnalysis = () => {
    const iframeEl = iframeRef.current;
    if (!iframeEl) return;
    const iframeWindow = iframeEl.contentWindow;
    if (!iframeWindow) return;

    iframeWindow.postMessage(
      {
        type: "STEPUP_STOP_ANALYSIS",
      },
      "*"
    );

    setIsAnalyzing(false);
    setShowRealtime(false);

    // ✅ 여기서는 더 이상 고정 문구로 피드백을 덮어쓰지 않음
    //  → pushup.html에서 보내주는 STEPUP_FEEDBACK(세트 요약)이 그대로 표시되게 유지
    setBattleResult(null);
  };

  const buttonLabel = cameraStarting
    ? "카메라 준비 중..."
    : "실시간 분석 시작하기";

  return (
    <div
      style={{
        background: "#f3f4f6",
        minHeight: "100vh",
        paddingTop: 110, // 상단 고정 네비 높이만큼 확보
      }}
    >
      <MainNav />

      {/* 메인 레이아웃: 화면 높이에 맞춰 자동 확장 */}
      <div
        style={{
          height: "calc(100vh - 110px)", // 화면 높이 - 네비 높이
          padding: "0 24px 24px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 24,
            alignItems: "stretch",
            height: "100%",
          }}
        >
          {/* ===== 왼쪽 컬럼 (텍스트 카드들, 왼쪽에 붙이기) ===== */}
          <div
            style={{
              flex: "0 0 320px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              height: "100%",
            }}
          >
            {/* 1) 모드 설명 카드 */}
            <div
              style={{
                borderRadius: 20,
                background: "#ffffff",
                padding: 20,
                boxShadow: "0 14px 30px rgba(15,23,42,0.06)",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 4,
                  color: "#111827",
                }}
              >
                {exerciseLabel} · {difficultyLabel}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  lineHeight: 1.6,
                  marginBottom: 12,
                }}
              >
                {levelInfo.description}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#111827",
                  lineHeight: 1.5,
                }}
              >
                오늘 목표:&nbsp;
                <b>
                  {setsPerDay}세트 × {repsPerSet}회 (총 {totalReps}회)
                </b>
                <br />
                하루 약 {targetMinutes}분 안에서 위 루틴을 채워 보세요.
              </div>

              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: "1px solid #e5e7eb",
                  fontSize: 12,
                  color: "#6b7280",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>
                  이용권:&nbsp;
                  <b style={{ color: isPremium ? "#2563eb" : "#111827" }}>
                    {isPremium ? "프리미엄" : "무료 이용자"}
                  </b>
                </span>
                {!isPremium && user && (
                  <span>
                    남은 무료 분석{" "}
                    <b style={{ color: "#ef4444" }}>{freeCount ?? 0}</b>/3회
                  </span>
                )}
              </div>
            </div>

            {/* 2) Feedback 요약 카드 */}
            <div
              style={{
                borderRadius: 20,
                background: "#ffffff",
                padding: 20,
                boxShadow: "0 14px 30px rgba(15,23,42,0.06)",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 10,
                  color: "#111827",
                }}
              >
                Feedback 요약
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        borderBottom: "1px solid #e5e7eb",
                        color: "#6b7280",
                        fontWeight: 600,
                      }}
                    >
                      항목
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        borderBottom: "1px solid #e5e7eb",
                        color: "#6b7280",
                        fontWeight: 600,
                      }}
                    >
                      내용
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #f3f4f6",
                        color: "#4b5563",
                      }}
                    >
                      Score
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #f3f4f6",
                        color: "#111827",
                      }}
                    >
                      {feedback.score !== null ? `${feedback.score}점` : "-"}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #f3f4f6",
                        color: "#4b5563",
                      }}
                    >
                      Main Message
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #f3f4f6",
                        color: "#111827",
                      }}
                    >
                      {feedback.mainMessage || "-"}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "6px 8px",
                        color: "#4b5563",
                      }}
                    >
                      Detail Message
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        color: "#111827",
                      }}
                    >
                      {feedback.detailMessage || "-"}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div
                style={{
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: "1px dashed #e5e7eb",
                  fontSize: 12,
                  color: "#4b5563",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 4,
                    color: "#111827",
                  }}
                >
                  🏆 '최고 기록의 나'와 대결
                </div>
                {bestLog ? (
                  <>
                    <div>
                      나의 최고 점수:&nbsp;
                      <b style={{ color: "#2563eb" }}>{bestLog.score}</b>점
                      {typeof bestLog.reps === "number" && (
                        <> (횟수 {bestLog.reps}회)</>
                      )}
                    </div>
                    {feedback.score !== null && (
                      <div style={{ marginTop: 4 }}>
                        이번 세트:&nbsp;
                        <b style={{ color: "#111827" }}>
                          {feedback.score}점
                        </b>
                        {battleResult === "win" && (
                          <span style={{ color: "#16a34a" }}>
                            {" "}
                            · 최고 기록 갱신! 🎉
                          </span>
                        )}
                        {battleResult === "draw" && (
                          <span style={{ color: "#f59e0b" }}>
                            {" "}
                            · 최고 기록과 동점
                          </span>
                        )}
                        {battleResult === "lose" && (
                          <span style={{ color: "#ef4444" }}>
                            {" "}
                            · 다음 세트에 재도전!
                          </span>
                        )}
                        {battleResult === "first" && (
                          <span style={{ color: "#6b7280" }}>
                            {" "}
                            · 첫 기록이 저장되었습니다.
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div>아직 '최고 기록의 나'가 없습니다. 첫 기록을 만들어 보세요.</div>
                )}
              </div>
            </div>

            {/* 3) 자극 부위 카드 */}
            {exercise === "pushup" && (
              <div
                style={{
                  borderRadius: 20,
                  background: "#ffffff",
                  padding: 20,
                  boxShadow: "0 14px 30px rgba(15,23,42,0.06)",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 10,
                    color: "#111827",
                  }}
                >
                  자극 부위 분석
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <img
                      src="/public/pushup_muscle_up.png"
                      alt="푸쉬업 상단 자세 자극 부위"
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        objectFit: "contain",
                      }}
                    />
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      상단 자세: 대흉근(가슴), 삼두근, 전면 삼각근(어깨)
                    </div>
                  </div>
                  <div>
                    <img
                      src="/public/pushup_muscle_down.png"
                      alt="푸쉬업 하강 자세 자극 부위"
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        objectFit: "contain",
                      }}
                    />
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      하강 구간: 가슴 전체의 신장성 수축 및 어깨/팔꿈치 부하
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===== 오른쪽 컬럼 (실시간 + 유튜브, 화면 높이에 맞춰 자동 확장) ===== */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              height: "100%",
              minWidth: 0,
              minHeight: 0,
            }}
          >
            <div
              style={{
                borderRadius: 24,
                background: "#ffffff",
                padding: 20,
                boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
                border: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                flex: 1,
                minHeight: 0,
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#111827",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>🏋️ {exerciseLabel} 실시간 AI 자세 분석</span>
              </div>

              {/* ▶ 실시간 카메라 + 유튜브 2열 (부모 높이를 꽉 채움) */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "stretch",
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {/* 좌: 실시간 카메라 */}
                <div
                  style={{
                    flex: 3,
                    position: "relative",
                    borderRadius: 18,
                    border: "3px solid #2563eb",
                    background: "#000000",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "stretch",
                    justifyContent: "center",
                  }}
                >
                  {showRealtime && (
                    <div
                      role="status"
                      aria-live="polite"
                      style={{
                        position: "absolute",
                        top: 14,
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 10,
                        maxWidth: "90%",
                        padding: "8px 16px",
                        borderRadius: 9999,
                        background:
                          "linear-gradient(90deg,#2563eb,#22c55e)",
                        color: "#111827",
                        boxShadow: "0 0 20px rgba(37,99,235,0.6)",
                        fontSize: 14,
                        fontWeight: 700,
                        textAlign: "center",
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
                    }}
                  />
                </div>

                {/* 우: 유튜브 */}
                <div
                  style={{
                    flex: 2,
                    borderRadius: 18,
                    border: "1px solid #e5e7eb",
                    background: "#000000",
                    overflow: "hidden",
                    position: "relative",
                    display: "flex",
                    alignItems: "stretch",
                    justifyContent: "center",
                  }}
                >
                  {youtubeEmbedUrl && (
                    <iframe
                      src={youtubeEmbedUrl}
                      title="유튜브 운동 영상"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        border: "none",
                      }}
                    />
                  )}
                  {!youtubeEmbedUrl && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        color: "#9ca3af",
                      }}
                    >
                      참고 영상 URL을 불러올 수 없습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* 버튼/안내 */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  {!isAnalyzing ? (
                    <button
                      onClick={handleStartCamera}
                      disabled={cameraStarting}
                      style={{
                        padding: "10px 26px",
                        borderRadius: 9999,
                        border: "none",
                        background: "#2563eb",
                        color: "#ffffff",
                        cursor: cameraStarting ? "default" : "pointer",
                        opacity: cameraStarting ? 0.7 : 1,
                        fontSize: 14,
                        fontWeight: 700,
                        boxShadow:
                          "0 10px 18px rgba(37,99,235,0.35)",
                      }}
                    >
                      {buttonLabel}
                    </button>
                  ) : (
                    <button
                      onClick={handleStopAnalysis}
                      style={{
                        padding: "10px 26px",
                        borderRadius: 9999,
                        border: "none",
                        background: "#dc2626",
                        color: "#ffffff",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 700,
                        boxShadow:
                          "0 10px 18px rgba(220,38,38,0.35)",
                      }}
                    >
                      분석 중지
                    </button>
                  )}

                  <button
                    onClick={() => setShowInfo(true)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 9999,
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      color: "#4b5563",
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    루틴의 근거 & 기준
                  </button>

                  <button
                    onClick={() => setGuideInfo(true)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 9999,
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      color: "#4b5563",
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    사용 가이드
                  </button>
                </div>

                {!isPremium && user && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#f59e0b",
                      fontWeight: 600,
                    }}
                  >
                    남은 무료 분석: {freeCount ?? 0} / 3회
                  </div>
                )}
                {isPremium && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#16a34a",
                      fontWeight: 600,
                    }}
                  >
                    프리미엄 회원은 실시간 분석을 무제한 이용할 수 있습니다.
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "#6b7280",
                  lineHeight: 1.6,
                }}
              >
                실시간 분석으로 받은 피드백과 함께 오른쪽 영상의 동작을 참고해,
                정자세에 최대한 가깝게 유지해 주세요.
              </div>
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
            background: "rgba(0,0,0,0.7)",
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
              maxWidth: 500,
              borderRadius: 20,
              background: "#1F2937",
              color: "#F9FAFB",
              padding: 30,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              fontSize: 14,
              lineHeight: 1.8,
              border: "1px solid #374151",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 10,
                color: "#00A3FF",
              }}
            >
              루틴의 과학적 근거 & 정확도 기준
            </div>
            <div style={{ marginBottom: 12 }}>
              StepUp의 난이도별 루틴(초급 2×10회, 중급 3×12회, 고급 4×15회)은
              <br />
              ACSM(미국스포츠의학회)와 NSCA(국제체력협회)의 운동과학
              가이드라인에서 제시하는
              <br />
              <b>“세트당 8~15회, 1~4세트”</b> 범위를 기반으로 설계되었습니다.
            </div>
            <div style={{ marginBottom: 15 }}>
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
                  padding: "8px 16px",
                  borderRadius: 9999,
                  border: "none",
                  background: "#00A3FF",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                확인 및 닫기
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
            background: "rgba(0,0,0,0.7)",
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
              maxWidth: 500,
              borderRadius: 20,
              background: "#1F2937",
              color: "#F9FAFB",
              padding: 30,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              fontSize: 14,
              lineHeight: 1.8,
              border: "1px solid #374151",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 10,
                color: "#00A3FF",
              }}
            >
              사용 가이드
            </div>
            <div style={{ marginBottom: 12 }}>
              1. 웹캠의 연결 여부와 웹페이지의 카메라 권한을 확인해주세요.
              <br />
              2. <b>"실시간 분석 시작하기"</b> 버튼을 클릭 후 가이드라인에 맞게
              웹캠을 배치해주세요.
              <br />
              3. AI가 제안하는 난이도에 따라 운동 진행 후{" "}
              <b>"Feedback 요약"</b>과 오른쪽 영상 가이드를 함께 확인해주세요.
            </div>
            <div style={{ marginBottom: 15 }}>
              운동 후 제공되는 <b>"Feedback 요약"</b>은 <b>"기록"</b>{" "}
              페이지에서도 확인하실 수 있습니다.
            </div>
            <div style={{ textAlign: "right" }}>
              <button
                onClick={() => setGuideInfo(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 9999,
                  border: "none",
                  background: "#00A3FF",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
