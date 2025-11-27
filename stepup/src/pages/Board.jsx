// src/pages/Board.jsx
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,   // ✅ 추가
  doc,         // ✅ 추가
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import MainNav from "../components/MainNav";

export default function Board() {
  const { user, nickname, role } = useAuth();

  // 🔹 현재 화면에 선택된 탭 (카테고리)
  const [tab, setTab] = useState("suggestion"); // "suggestion" | "trainer"

  // 🔹 현재 탭에 해당하는 글 목록
  const [posts, setPosts] = useState([]);

  // 🔹 글쓰기 폼 표시/숨기기
  const [showForm, setShowForm] = useState(false);

  // 🔹 글쓰기 폼 데이터
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // 🔹 비밀글
  const [isSecret, setIsSecret] = useState(false);
  const [secretPassword, setSecretPassword] = useState("");

  const DEFAULT_SECRET_PASSWORD = "123";

  // ✅ 삭제 확인창 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetPost, setTargetPost] = useState(null); // 어떤 글을 지울지 저장

  // ✅ 탭이 바뀔 때마다 해당 카테고리 글만 실시간 구독
  useEffect(() => {
    const ref = collection(db, "boardPosts");

    const q = query(
      ref,
      where("type", "==", tab),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPosts(list);
        console.log("현재 탭:", tab, "가져온 글:", list);
      },
      (err) => {
        console.error("Board onSnapshot 에러:", err);
      }
    );

    return () => unsub();
  }, [tab]);

  // ✅ 글 등록
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    // 트레이너 홍보 탭에서 일반 유저 글쓰기 제한
    if (tab === "trainer" && role !== "trainer") {
      alert("트레이너 회원만 홍보 글을 작성할 수 있습니다.");
      return;
    }

    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    let finalSecretPassword = "";
    if (isSecret) {
      const trimmed = secretPassword.trim();
      finalSecretPassword = trimmed || DEFAULT_SECRET_PASSWORD;
    }

    const baseData = {
      type: tab, // "suggestion" 또는 "trainer"
      title: title.trim(),
      content: content.trim(),
      authorUid: user.uid,
      authorName: nickname || user.email || "익명",
      authorRole: role || "user",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isSecret,
      secretPassword: finalSecretPassword,
    };

    const data =
      tab === "trainer"
        ? { ...baseData, videoUrl: videoUrl.trim() }
        : { ...baseData, videoUrl: "" };

    console.log("저장될 데이터:", data);

    await addDoc(collection(db, "boardPosts"), data);

    // 폼 초기화 + 폼 닫기
    setTitle("");
    setContent("");
    setVideoUrl("");
    setIsSecret(false);
    setSecretPassword("");
    setShowForm(false);
  };

  // ✅ 날짜 포맷
  const formatDate = (ts) => {
    if (!ts) return "";
    try {
      if (typeof ts.toDate === "function") {
        return ts.toDate().toLocaleString();
      }
      return new Date(ts).toLocaleString();
    } catch {
      return "";
    }
  };

  // ✅ 삭제 버튼 클릭 → 어떤 글을 지울지 저장 + 확인창 열기
  const handleClickDeletePost = (post) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    // 본인 글 또는 관리자만 삭제
    if (user.uid !== post.authorUid && role !== "admin") {
      alert("본인 글 또는 관리자만 삭제할 수 있습니다.");
      return;
    }

    setTargetPost(post);
    setShowDeleteConfirm(true);
  };

  // ✅ 삭제 "아니오"
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setTargetPost(null);
  };

  // ✅ 삭제 "예" → 실제 Firestore에서 삭제
  const handleConfirmDelete = async () => {
    if (!targetPost) return;

    try {
      await deleteDoc(doc(db, "boardPosts", targetPost.id));
      alert("게시글이 삭제되었습니다.");
    } catch (err) {
      console.error("게시글 삭제 오류:", err);
      alert("삭제 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setShowDeleteConfirm(false);
      setTargetPost(null);
    }
  };

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      <MainNav />

      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "100px 20px 40px",
        }}
      >
        <h1 style={{ marginBottom: 16, textAlign: "center" }}>커뮤니티 게시판</h1>

        {/* 🔹 상단 탭 + 글쓰기 버튼 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setTab("suggestion")}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: tab === "suggestion" ? "#000" : "#ddd",
                color: tab === "suggestion" ? "#fff" : "#333",
                fontSize: 13,
              }}
            >
              건의 · 요청
            </button>
            <button
              onClick={() => setTab("trainer")}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: tab === "trainer" ? "#000" : "#ddd",
                color: tab === "trainer" ? "#fff" : "#333",
                fontSize: 13,
              }}
            >
              트레이너 홍보
            </button>
          </div>

          {user && (
            <button
              onClick={() => setShowForm((prev) => !prev)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                background: showForm ? "#777" : "#000",
                color: "#fff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {showForm ? "글쓰기 닫기" : "글쓰기"}
            </button>
          )}
        </div>

        {!user && (
          <div
            style={{
              fontSize: 12,
              marginBottom: 12,
              color: "#666",
            }}
          >
            * 로그인 후 게시글을 작성할 수 있습니다.
          </div>
        )}

        {/* 🔹 글쓰기 폼 */}
        {user && showForm && (
          <form
            onSubmit={handleSubmit}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 16,
              marginBottom: 24,
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              {tab === "suggestion"
                ? "서비스에 대한 건의사항·요청사항을 남겨주세요."
                : "트레이너 홍보 글을 작성해주세요. (영상 URL을 함께 등록할 수 있습니다.)"}
            </div>

            <input
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                marginBottom: 8,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 13,
              }}
            />

            <textarea
              placeholder="내용을 입력하세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                marginBottom: 8,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 13,
                resize: "vertical",
              }}
            />

            {tab === "trainer" && (
              <input
                placeholder="홍보용 영상 URL (선택)"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                style={{
                  width: "100%",
                  marginBottom: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  fontSize: 13,
                }}
              />
            )}

            {/* 비밀글 설정 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: 8,
                fontSize: 12,
                color: "#555",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={(e) => setIsSecret(e.target.checked)}
                />
                비밀글로 등록
              </label>

              {isSecret && (
                <input
                  type="password"
                  placeholder="비밀번호를 입력하세요 (미입력 시 123)"
                  value={secretPassword}
                  onChange={(e) => setSecretPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    fontSize: 12,
                  }}
                />
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                type="submit"
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "none",
                  background: "#000",
                  color: "#fff",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                글 올리기
              </button>
            </div>
          </form>
        )}

        {/* 🔹 목록 */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            marginBottom: 16,
          }}
        >
          {posts.length === 0 ? (
            <div style={{ fontSize: 13, color: "#777", padding: 12 }}>
              아직 등록된 게시글이 없습니다.
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                style={{
                  padding: "10px 6px",
                  borderBottom: "1px solid #eee",
                  cursor: "default",
                }}
              >
                {/* 제목/뱃지/삭제 버튼 라인 */}
                <div
                  style={{
                    fontSize: 14,
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {/* type 표시 배지 */}
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "#eee",
                      color: "#333",
                    }}
                  >
                    {post.type}
                  </span>

                  {/* 비밀글 배지 */}
                  {post.isSecret && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 999,
                        background: "#9e9e9e",
                        color: "#fff",
                      }}
                    >
                      비밀글
                    </span>
                  )}

                  {/* 제목 */}
                  <span
                    style={{
                      fontWeight: 600,
                      flex: 1, // 남은 공간 채우기 → 삭제 버튼 오른쪽으로 밀기
                    }}
                  >
                    {post.title}
                  </span>

                  {/* 영상 포함 배지 */}
                  {post.type === "trainer" && post.videoUrl && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 999,
                        background: "#ff7043",
                        color: "#fff",
                      }}
                    >
                      영상 포함
                    </span>
                  )}

                  {/* 삭제 버튼 (작성자 또는 관리자에게만 보이게) */}
                  {user &&
                    (user.uid === post.authorUid || role === "admin") && (
                      <button
                        onClick={() => handleClickDeletePost(post)}
                        style={{
                          marginLeft: 8,
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: "none",
                          background: "#e53935",
                          color: "#fff",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        삭제
                      </button>
                    )}
                </div>

                {/* 작성자/역할/시간 */}
                <div
                  style={{
                    fontSize: 11,
                    color: "#888",
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <span>{post.authorName}</span>
                  <span>·</span>
                  <span>
                    {post.authorRole === "trainer"
                      ? "트레이너"
                      : post.authorRole === "admin"
                      ? "관리자"
                      : "일반회원"}
                  </span>
                  {post.createdAt && (
                    <>
                      <span>·</span>
                      <span>{formatDate(post.createdAt)}</span>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 🔻 게시글 삭제 확인창 */}
      {showDeleteConfirm && (
        <div
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
            style={{
              width: "90%",
              maxWidth: 360,
              borderRadius: 16,
              background: "#fff",
              padding: 20,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              게시글을 삭제 하시겠습니까?
            </div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
              삭제 후에는 이 게시글을 다시 복구할 수 없습니다.
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 8,
              }}
            >
              <button
                onClick={handleCancelDelete}
                style={{
                  padding: "6px 14px",
                  borderRadius: 9999,
                  border: "1px solid #ccc",
                  background: "#fff",
                  color: "#333",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                아니오
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: "6px 14px",
                  borderRadius: 9999,
                  border: "none",
                  background: "#e53935",
                  color: "#fff",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                예
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
