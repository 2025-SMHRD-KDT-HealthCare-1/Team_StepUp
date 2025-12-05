// src/pages/Logs.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import MainNav from "../components/MainNav";

// 회원 정보용 Firestore
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom"; // Pose 페이지로 이동용

// svg 이미지
import difficultyIcon from "../icon/difficulty.svg";
import exerciseLabelIcon from "../icon/exerciseLabel.svg";
import swordIcon from "../icon/sword.svg";
import replayIcon from "../icon/replay.svg";
import aiIcon from "../icon/ai.svg";

export default function Logs() {
  const { user, userData } = useAuth();
  const [logs, setLogs] = useState([]);
  const [msg, setMsg] = useState("불러오는 중...");
  const [profile, setProfile] = useState(null);

  // 영상 미리보기 상태
  const [previewVideo, setPreviewVideo] = useState(null);

  // 운동 필터 (all / pushup / squat / situp / plank)
  const [exerciseFilter, setExerciseFilter] = useState("all");

  // 오늘 기록만 보기 토글
  const [todayOnly, setTodayOnly] = useState(false);

  const nav = useNavigate();

  // 한국어 라벨 매핑
  const exerciseLabelMap = {
    pushup: "푸쉬업",
    squat: "스쿼트",
    situp: "싯업",
    plank: "플랭크",
  };

  // 초 → "MM분 SS초" 형식
  const formatDuration = (sec) => {
    if (sec === null || sec === undefined) return null;
    if (sec <= 0) return "0초";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `${m}분 ${s}초`;
    return `${s}초`;
  };

  // S3 URL / 기존 로컬 URL 모두 처리
  const buildVideoSrc = (url) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `http://localhost:5000${url}`;
  };

  // '최고 기록의 나'와의 대결 결과 계산
  const computeBattleResults = (rows) => {
    const items = rows.map((r) => ({ ...r }));
    const bestByKey = {}; // key = `${exercise}_${difficulty}`

    const sorted = [...items].sort((a, b) => {
      const aTime = new Date(a.started_at || a.created_at || 0).getTime();
      const bTime = new Date(b.started_at || b.created_at || 0).getTime();
      return aTime - bTime;
    });

    sorted.forEach((item) => {
      const score =
        item.score === null || item.score === undefined ? null : item.score;
      const ex = item.exercise || "";
      const diff = item.difficulty || "";
      const key = `${ex}_${diff}`;

      if (score === null) {
        item.battleResult = null;
        return;
      }

      const prevBest = bestByKey[key];

      if (prevBest === undefined || prevBest === null) {
        item.battleResult = "first";
        bestByKey[key] = score;
      } else if (score > prevBest) {
        item.battleResult = "win";
        bestByKey[key] = score;
      } else if (score === prevBest) {
        item.battleResult = "draw";
      } else {
        item.battleResult = "lose";
      }
    });

    return items;
  };

  // 화면에 보여줄 이름 (닉네임 > displayName > 이메일)
  const displayName =
    userData?.nickname ||
    userData?.nickName ||
    userData?.displayName ||
    userData?.name ||
    (profile &&
      (profile.nickname ||
        profile.displayName ||
        profile.nickName ||
        profile.username ||
        profile.userName ||
        profile.name)) ||
    user?.displayName ||
    user?.email ||
    "회원";

  // 1) Firestore 에서 회원 정보 가져오기
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        setProfile(snap.data() || null);
      } catch (e) {
        console.error("프로필 불러오기 실패:", e);
      }
    };

    loadProfile();
  }, [user]);

  // 2) MySQL 로그 가져오기
  useEffect(() => {
    if (!user) {
      setMsg("로그인이 필요합니다.");
      return;
    }

    const loadLogs = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/workouts/logs", {
          params: { userUid: user.uid },
        });
        console.log("user.uid =", user.uid);
        console.log("/api/workouts/logs 응답:", res.data);

        const arr = res.data || [];
        const withBattle = computeBattleResults(arr);
        setLogs(withBattle);

        if (arr.length === 0) setMsg("아직 기록이 없어요.");
        else setMsg("");
      } catch (e) {
        console.error("운동 기록 불러오기 실패:", e);
        setMsg("기록을 불러오지 못했어요.");
      }
    };

    loadLogs();
  }, [user]);

  const formatDateTime = (item) => {
    const base = item.started_at || item.created_at;
    if (!base) return "";
    return new Date(base).toLocaleString();
  };

  // 날짜 키 (YYYY-MM-DD)
  const getDateKey = (item) => {
    const base = item.started_at || item.created_at;
    if (!base) return "기타";
    const d = new Date(base);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // 날짜 라벨 (오늘 / 어제 / YYYY.MM.DD)
  const getDateLabel = (dateKey) => {
    if (dateKey === "기타") return "기타";

    const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
    const date = new Date(y, m - 1, d);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (isSameDay(date, today)) return "오늘";
    if (isSameDay(date, yesterday)) return "어제";

    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}.${mm}.${dd}`;
  };

  // 필터 적용된 배열
  const filteredLogs = logs.filter((item) => {
    const exerciseOk =
      exerciseFilter === "all" || item.exercise === exerciseFilter;

    let todayOk = true;
    if (todayOnly) {
      const base = item.started_at || item.created_at;
      if (!base) {
        todayOk = false;
      } else {
        const d = new Date(base);
        const now = new Date();
        todayOk =
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate();
      }
    }

    return exerciseOk && todayOk;
  });

  // 날짜별 그룹핑
  const grouped = filteredLogs.reduce((acc, log) => {
    const key = getDateKey(log);
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  // 날짜 그룹을 최신 날짜 순으로 정렬
  const groupedEntries = Object.entries(grouped).sort(
    ([aKey], [bKey]) => (aKey < bKey ? 1 : -1)
  );

  // 과거 나와 대결 시작 핸들러
  const handleRivalStart = (log) => {
    const params = new URLSearchParams({
      mode: "rival",
      logId: String(log.id),
      exercise: log.exercise || "",
      targetReps: String(log.reps ?? 0),
    });

    if (log.duration_sec !== null && log.duration_sec !== undefined) {
      params.append("targetDuration", String(log.duration_sec));
    }

    nav(`/pose?${params.toString()}`);
  };

  // 기록 삭제 핸들러
  const handleDelete = async (logId) => {
    if (!window.confirm("정말 이 운동 기록을 삭제할까요?")) return;

    try {
      await axios.post("http://localhost:5000/api/workouts/delete", {
        id: logId,
      });

      alert("삭제되었습니다.");
      window.location.reload();
    } catch (err) {
      console.error("삭제 실패:", err);
      setLogs((prev) => prev.filter((l) => l.id !== logId));
      alert("삭제 중 오류 발생");
    }
  };

  // battleResult → 문구 매핑
  const renderBattleLabel = (item) => {
    if (!item.battleResult) return null;

    if (item.battleResult === "first") {
      return "첫 기록입니다. 이 날이 '최고 기록의 나'의 시작점이에요.";
    }
    if (item.battleResult === "win") {
      return "이 세트에서 '최고 기록의 나'를 이기며 최고 기록을 갱신했습니다!";
    }
    if (item.battleResult === "draw") {
      return "이전 '최고 기록의 나'와 동점입니다. 폼을 잘 유지했어요.";
    }
    if (item.battleResult === "lose") {
      return "이전 '최고 기록의 나'에게 아쉽게 패배했습니다. 다음에 다시 도전해 보세요.";
    }
    return null;
  };

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", paddingTop: 110 }}>
      <MainNav />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        {/* 상단 타이틀 + 사용자 정보 */}
        <h1 style={{ marginBottom: 16, textAlign: "center" }}>운동 기록</h1>

        <div
          style={{
            marginBottom: 16,
            padding: "14px 16px",
            borderRadius: 12,
            background: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {/* 상단 사용자 정보 */}
          <div style={{ marginBottom: 10, fontSize: 18, fontWeight: 500 }}>
            <b>{displayName}</b>님의 운동 기록을 확인합니다.
            {(profile?.level || userData?.level) && (
              <span style={{ marginLeft: 8, fontSize: 13, color: "#555" }}>
                (현재 난이도: {profile?.level || userData?.level})
              </span>
            )}
          </div>

          {/* 검색 필터 영역 */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            <span style={{ color: "#555", fontSize: 15 }}>검색 필터 :</span>

            {[
              { key: "all", label: "전체" },
              { key: "pushup", label: "푸쉬업" },
              { key: "squat", label: "스쿼트" },
              { key: "situp", label: "싯업" },
              { key: "plank", label: "플랭크" },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => setExerciseFilter(btn.key)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border:
                    exerciseFilter === btn.key
                      ? "none"
                      : "1px solid rgba(0,0,0,0.15)",
                  background:
                    exerciseFilter === btn.key ? "#222" : "rgba(0,0,0,0.02)",
                  color: exerciseFilter === btn.key ? "#fff" : "#333",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {btn.label}
              </button>
            ))}

            {/* 오른쪽 정렬되는 '오늘 기록만 보기' */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginLeft: "auto",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={todayOnly}
                onChange={(e) => setTodayOnly(e.target.checked)}
              />
              <span>오늘 기록만 보기</span>
            </label>
          </div>
        </div>

        {msg && <p style={{ marginBottom: 12 }}>{msg}</p>}

        {/* 날짜별 그룹 렌더링 */}
        {groupedEntries.map(([dateKey, items]) => (
          <div key={dateKey} style={{ marginBottom: 18 }}>
            {/* 날짜 라벨 */}
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#555",
                marginBottom: 6,
              }}
            >
              {getDateLabel(dateKey)}
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  borderRadius: 12,
                  background: "#fff",
                  padding: "10px 14px",
                  marginBottom: 6,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                  fontSize: 18,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <img
                    src={exerciseLabelIcon}
                    alt="exerciseLabel"
                    style={{ width: "25px", height: "18px" }}
                  />
                  종목 : {exerciseLabelMap[item.exercise] || item.exercise}
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  <img
                    src={difficultyIcon}
                    alt="difficulty"
                    style={{ width: "25px", height: "18px" }}
                  />
                  난이도 : {item.difficulty}
                  {/* 최고/첫 기록 */}
                  {item.battleResult === "win" && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 12,
                        padding: "2px 6px",
                        borderRadius: 999,
                        background: "#ffe082",
                        color: "#5d4037",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      최고 기록 갱신
                    </span>
                  )}
                  {item.battleResult === "first" && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 12,
                        padding: "2px 6px",
                        borderRadius: 999,
                        background: "#b3e5fc",
                        color: "#01579b",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      첫 기록
                    </span>
                  )}
                </div>

                <div style={{ color: "#444", fontSize: 16, fontWeight: 500 }}>
                  | 횟수 :{" "}
                  <b style={{ color: "blue" }}>{item.reps}</b>회
                  {item.score !== null && item.score !== undefined && (
                    <>
                      {" "}
                      | 점수 :{" "}
                      <b style={{ color: "blue" }}>{item.score}</b>점
                    </>
                  )}
                  {item.duration_sec !== null &&
                    item.duration_sec !== undefined && (
                      <>
                        {" "}
                        | 소요 시간 :{" "}
                        <b style={{ color: "blue" }}>
                          {formatDuration(item.duration_sec)}
                        </b>{" "}
                        |
                      </>
                    )}
                </div>

                <div style={{ fontSize: 15, color: "#777", marginTop: 2 }}>
                  {formatDateTime(item)}
                </div>

                {item.battleResult && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 15,
                      fontWeight: 500,
                      color: "#3949ab",
                      background: "#e8eaf6",
                      borderRadius: 8,
                      padding: "6px 8px",
                      lineHeight: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <img
                      src={aiIcon}
                      alt="ai"
                      style={{ width: "30px", height: "25px" }}
                    />
                    : {renderBattleLabel(item)}
                  </div>
                )}

                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {/* 영상 버튼 */}
                  {item.video_url && (
                    <button
                      onClick={() => setPreviewVideo(item.video_url)}
                      style={{
                        border: "none",
                        background: "#222",
                        color: "#fff",
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <img
                        src={replayIcon}
                        alt="replay"
                        style={{ width: "20px", height: "20px" }}
                      />
                      영상 리플레이
                    </button>
                  )}

                  <button
                    onClick={() => handleRivalStart(item)}
                    style={{
                      border: "2px solid #222",
                      background: "#fff",
                      color: "#222",
                      padding: "6px 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <img
                      src={swordIcon}
                      alt="sword"
                      style={{ width: "25px", height: "22px" }}
                    />
                    과거의 나와 대결
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      border: "1px solid #fff",
                      background: "#e53935",
                      color: "#fff",
                      padding: "6px 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginLeft: "auto",
                    }}
                  >
                    기록 삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* 필터 결과 없음 */}
        {!msg && filteredLogs.length === 0 && logs.length > 0 && (
          <p style={{ marginTop: 8, fontSize: 13, color: "#777" }}>
            선택한 조건에 해당하는 기록이 없습니다.
          </p>
        )}
      </div>

      {/* 영상 미리보기 모달 */}
      {previewVideo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 16,
              borderRadius: 12,
              width: "95%",
              maxWidth: 1500,
            }}
          >
            <div style={{ display: "flex", gap: 16, width: "100%" }}>
              {/* 영상 영역 */}
              <div style={{ flex: 8 }}>
                <video
                  src={buildVideoSrc(previewVideo)}
                  controls
                  autoPlay
                  style={{
                    width: "100%",
                    height: "700px",
                    objectFit: "contain",
                    borderRadius: 10,
                    background: "#000",
                  }}
                />
              </div>

              {/* AI 분석 보고서 */}
              {logs.find((l) => l.video_url === previewVideo) && (
                <div
                  style={{
                    flex: 3,
                    background: "#f5f5f5",
                    borderRadius: 10,
                    padding: "12px 60px",
                    fontSize: 22,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={aiIcon}
                      alt="ai"
                      style={{ width: "30px", height: "30px" }}
                    />
                    AI 분석 보고서
                  </div>

                  {(() => {
                    const current = logs.find(
                      (l) => l.video_url === previewVideo
                    );
                    if (!current) return null;

                    const score =
                      current.score === null || current.score === undefined
                        ? "N/A"
                        : current.score;

                    return (
                      <>
                        <div
                          style={{
                            marginBottom: 6,
                            fontSize: 17,
                          }}
                        >
                          <br />
                          <b>{displayName}</b>님의 운동 영상입니다. <br />
                          점수 :{" "}
                          <b style={{ color: "blue" }}>{score}</b> 점
                        </div>

                        <div style={{ lineHeight: 1.5 }}>
                          {current.feedback_main || current.feedback_detail ? (
                            <>
                              {current.feedback_main && (
                                <div
                                  style={{
                                    fontWeight: 600,
                                    marginBottom: 4,
                                  }}
                                >
                                  {current.feedback_main}
                                </div>
                              )}
                              {current.feedback_detail && (
                                <div style={{ whiteSpace: "pre-line" }}>{current.feedback_detail}</div>
                              )}
                            </>
                          ) : (
                            (() => {
                              // 옛날 기록 등 feedback 컬럼이 없는 경우 점수 기준 기본 문구
                              if (
                                typeof current.score !== "number" ||
                                current.score < 0
                              ) {
                                return "분석 결과가 없습니다.";
                              }
                              const s = current.score;
                              if (s >= 80) {
                                return "매우 안정적인 자세입니다. 현재 폼을 유지하세요.";
                              }
                              if (s >= 60) {
                                return "자세는 좋지만 팔의 깊이를 조금 더 신경 써 주세요.";
                              }
                              return "상체가 충분히 내려가지 않았습니다. 가슴을 더 낮춰 주세요.";
                            })()
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <button
              onClick={() => setPreviewVideo(null)}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "8px 0",
                borderRadius: 6,
                border: "none",
                background: "#222",
                color: "#fff",
                cursor: "pointer",
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
