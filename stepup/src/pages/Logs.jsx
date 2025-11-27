// src/pages/Logs.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import MainNav from "../components/MainNav";

// 🔹 회원 정보용 Firestore
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Logs() {
  const { user,userData } = useAuth();
  const [logs, setLogs] = useState([]);
  const [msg, setMsg] = useState("불러오는 중...");
  const [profile, setProfile] = useState(null);

  // ✅ 영상 미리보기 상태
  const [previewVideo, setPreviewVideo] = useState(null);

  // ✅ 운동 필터 (all / pushup / squat / situp / plank)
  const [exerciseFilter, setExerciseFilter] = useState("all");

  // ✅ 오늘 기록만 보기 토글
  const [todayOnly, setTodayOnly] = useState(false);

  // 🔹 한국어 라벨 매핑
  const exerciseLabelMap = {
    pushup: "푸쉬업",
    squat: "스쿼트",
    situp: "싯업",
    plank: "플랭크",
  };

  // 🔹 화면에 보여줄 이름 (닉네임 > displayName > 이메일)
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

  // ✅ 1) Firestore 에서 회원 정보 가져오기
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

  // ✅ 2) MySQL 로그 가져오기
  useEffect(() => {
    if (!user) {
      setMsg("로그인이 필요합니다.");
      return;
    }

    const loadLogs = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/workouts/logs", {
          params: { userUid: user.uid },
        });
        console.log("👀 user.uid =", user.uid);
        console.log("📥 /api/workouts/logs 응답:", res.data);

        const arr = res.data || [];
        setLogs(arr);

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

  // 🔹 날짜 키 (YYYY-MM-DD)
  const getDateKey = (item) => {
    const base = item.started_at || item.created_at;
    if (!base) return "기타";
    const d = new Date(base);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // 🔹 날짜 라벨 (오늘 / 어제 / YYYY.MM.DD)
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

  // ✅ 필터 적용된 배열
  const filteredLogs = logs.filter((item) => {
    // 1) 운동종류 필터
    const exerciseOk =
      exerciseFilter === "all" || item.exercise === exerciseFilter;

    // 2) 오늘 기록만 보기
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

  // ✅ 날짜별 그룹핑
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

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", paddingTop: 110 }}>
      <MainNav />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        {/* 상단 타이틀 + 사용자 정보 */}
        <h2 style={{ marginBottom: 8 }}>운동 기록</h2>

        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 12,
            background: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            fontSize: 14,
          }}
        >
          <b>{displayName}</b>님의 운동 기록
          {(profile?.level || userData?.level) && (
            <span style={{ marginLeft: 8, fontSize: 13, color: "#555" }}>
              (현재 난이도: {profile?.level || userData?.level})
            </span>
          )}
        </div>

        {/* 🔹 필터 영역 */}
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 12,
            background: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            fontSize: 13,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
          }}
        >
          {/* 운동 필터 버튼들 */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: "#555" }}>운동 필터 :</span>
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
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* 오늘 기록만 보기 */}
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

        {msg && <p style={{ marginBottom: 12 }}>{msg}</p>}

        {/* 🔹 날짜별 그룹 렌더링 */}
        {groupedEntries.map(([dateKey, items]) => (
          <div key={dateKey} style={{ marginBottom: 18 }}>
            {/* 날짜 라벨 */}
            <div
              style={{
                fontSize: 13,
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
                  fontSize: 14,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {exerciseLabelMap[item.exercise] || item.exercise} (
                  {item.difficulty})
                </div>

                <div style={{ color: "#444" }}>
                  횟수: <b>{item.reps}</b>회
                  {item.score !== null && item.score !== undefined && (
                    <>
                      {" "}
                      · 점수: <b>{item.score}</b>점
                    </>
                  )}
                </div>

                <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>
                  {formatDateTime(item)}
                </div>

                {/* ✅ 세트 영상 보기 버튼 */}
                {item.video_url && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      onClick={() => setPreviewVideo(item.video_url)}
                      style={{
                        border: "none",
                        background: "#222",
                        color: "#fff",
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      🎥 세트 영상 보기
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* 필터 결과가 아무것도 없을 때 */}
        {!msg && filteredLogs.length === 0 && logs.length > 0 && (
          <p style={{ marginTop: 8, fontSize: 13, color: "#777" }}>
            선택한 조건에 해당하는 기록이 없습니다.
          </p>
        )}
      </div>

      {/* ✅ 영상 미리보기 모달 */}
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
              maxWidth: 900,
            }}
          >
            <div style={{ display: "flex", gap: 16, width: "100%" }}>
              {/* 🎥 영상 영역 */}
              <div style={{ flex: 6 }}>
                <video
                  src={`http://localhost:4000${previewVideo}`}
                  controls
                  autoPlay
                  style={{
                    width: "100%",
                    height: "420px",
                    objectFit: "contain",
                    borderRadius: 10,
                    background: "#000",
                  }}
                />
              </div>

              {/* 🧠 AI 피드백 영역 */}
              {logs.find((l) => l.video_url === previewVideo) && (
                <div
                  style={{
                    flex: 1,
                    background: "#f5f5f5",
                    borderRadius: 10,
                    padding: "12px 14px",
                    fontSize: 14,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>
                    🤖 AI 자세 분석
                  </div>

                  <div style={{ marginBottom: 6 }}>
                    점수 :{" "}
                    <b>
                      {logs.find((l) => l.video_url === previewVideo)?.score ??
                        "N/A"}
                      점
                    </b>
                  </div>

                  <div style={{ lineHeight: 1.5 }}>
                    {(() => {
                      const score =
                        logs.find((l) => l.video_url === previewVideo)
                          ?.score ?? 0;

                      if (score >= 80)
                        return "매우 안정적인 자세입니다. 현재 폼을 유지하세요.";
                      if (score >= 60)
                        return "자세는 좋지만 팔의 깊이를 조금 더 신경 써 주세요.";
                      return "상체가 충분히 내려가지 않았습니다. 가슴을 더 낮춰 주세요.";
                    })()}
                  </div>
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
                background: "#444",
                color: "#fff",
                cursor: "pointer",
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
