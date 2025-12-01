// src/pages/Board.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import MainNav from "../components/MainNav";
import { useNavigate } from "react-router-dom";

// 댓글 이미지
import comment from "../icon/comment.svg";
const API_BASE = "http://localhost:5000";

export default function Board() {
  const { user, nickname, role } = useAuth();

  // 탭: suggestion | trainer
  const [tab, setTab] = useState("suggestion");

  // 글 목록
  const [posts, setPosts] = useState([]);

  // 글쓰기 폼
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // 비밀글
  const [isSecret, setIsSecret] = useState(false);
  const [secretPassword, setSecretPassword] = useState("");

  // 삭제 확인
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetPost, setTargetPost] = useState(null);

  // 펼쳐진 게시글
  const [openPostId, setOpenPostId] = useState(null);

  // 댓글
  const [comments, setComments] = useState({});
  const [commentInput, setCommentInput] = useState("");

  // 비밀글 비밀번호 입력값(게시글별)
  const [secretInputs, setSecretInputs] = useState({});
  // 비밀글 잠금 해제 여부(게시글별)
  const [unlockedPosts, setUnlockedPosts] = useState({});

  // 🔹 탭이 바뀔 때마다 목록 불러오기
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/board/list`, {
          params: { type: tab },
        });
        const data = Array.isArray(res.data) ? res.data : [];
        setPosts(data);
        console.log("현재 탭:", tab, "가져온 글:", data);
      } catch (err) {
        console.error("게시글 목록 불러오기 오류:", err);
        setPosts([]);
        alert("게시글 목록을 불러오는 중 오류가 발생했습니다.");
      }
    };

    load();
  }, [tab]);

  // 🔹 작성자 / 관리자는 비밀번호 없이 비밀글 열 수 있게
  const canBypassSecret = (post) =>
    user && (user.uid === post.user_uid || role === "admin");

  // 🔹 글 등록
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (tab === "trainer" && role !== "trainer" && role !== "admin") {
      alert("트레이너 회원만 홍보 글을 작성할 수 있습니다.");
      return;
    }

    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    try {
      const body = {
        userUid: user.uid,
        nickname: nickname || user.email || "익명",
        role: role || "user",
        type: tab, // suggestion | trainer
        title: title.trim(),
        content: content.trim(),
        isSecret,
        secretPassword,
        videoUrl: tab === "trainer" ? videoUrl.trim() : "",
      };

      await axios.post(`${API_BASE}/api/board/write`, body);

      // 폼 초기화
      setTitle("");
      setContent("");
      setVideoUrl("");
      setIsSecret(false);
      setSecretPassword("");
      setShowForm(false);

      // 목록 다시 불러오기
      const res = await axios.get(`${API_BASE}/api/board/list`, {
        params: { type: tab },
      });
      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("게시글 저장 오류:", err);
      alert("게시글 저장 중 오류가 발생했습니다.");
    }
  };

  // 🔹 게시글 토글 (열기/닫기) + 댓글 불러오기
  const togglePost = async (postId) => {
    if (openPostId === postId) {
      setOpenPostId(null);
      return;
    }

    setOpenPostId(postId);

    try {
      const res = await axios.get(
        `${API_BASE}/api/board/${postId}/comments`
      );
      setComments((prev) => ({ ...prev, [postId]: res.data }));
    } catch (err) {
      console.error("댓글 불러오기 오류:", err);
    }
  };

  // 🔹 댓글 등록
  const submitComment = async (postId) => {
    if (!commentInput.trim()) return;

    try {
      await axios.post(`${API_BASE}/api/board/${postId}/comment`, {
        userUid: user.uid,
        nickname,
        content: commentInput,
      });

      setCommentInput("");

      const res = await axios.get(
        `${API_BASE}/api/board/${postId}/comments`
      );
      setComments((prev) => ({ ...prev, [postId]: res.data }));
    } catch (err) {
      console.error("댓글 등록 오류:", err);
      alert("댓글 등록 중 오류가 발생했습니다.");
    }
  };

  // 🔹 비밀글 잠금 해제 (비밀번호 비교)
  const handleUnlockPost = (post) => {
    const inputPw = (secretInputs[post.id] || "").trim();

    if (!inputPw) {
      alert("비밀번호를 입력해주세요.");
      return;
    }

    if (post.secret_password && inputPw === post.secret_password) {
      setUnlockedPosts((prev) => ({ ...prev, [post.id]: true }));
      alert("비밀글이 열렸습니다.");
    } else {
      alert("비밀번호가 일치하지 않습니다.");
    }
  };

  // 🔹 날짜 포맷
  const formatDate = (val) => {
    if (!val) return "";
    try {
      return new Date(val).toLocaleString();
    } catch {
      return "";
    }
  };

  // 🔹 삭제 버튼 클릭
  const handleClickDeletePost = (post) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (user.uid !== post.user_uid && role !== "admin") {
      alert("본인 글 또는 관리자만 삭제할 수 있습니다.");
      return;
    }

    setTargetPost(post);
    setShowDeleteConfirm(true);
  };

  // 🔹 삭제 취소
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setTargetPost(null);
  };

  // 🔹 삭제 확정
  const handleConfirmDelete = async () => {
    if (!targetPost || !user) return;

    try {
      await axios.delete(`${API_BASE}/api/board/${targetPost.id}`, {
        data: {
          userUid: user.uid,
          role: role || "user",
        },
      });

      // 목록 갱신
      const res = await axios.get(`${API_BASE}/api/board/list`, {
        params: { type: tab },
      });
      setPosts(Array.isArray(res.data) ? res.data : []);

      alert("게시글이 삭제되었습니다.");
    } catch (err) {
      console.error("게시글 삭제 오류:", err);
      alert("게시글 삭제 중 오류가 발생했습니다.");
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
        <h1 style={{ marginBottom: 16, textAlign: "center" }}>
          커뮤니티 게시판
        </h1>

        {/* 상단 탭 + 글쓰기 버튼 */}
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
                fontSize: 15,
                fontWeight: 500,
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
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              트레이너 홍보
            </button>
          </div>

          {user && (
            <button
              onClick={() => setShowForm((prev) => !prev)}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background: showForm ? "#777" : "#000",
                color: "#fff",
                fontSize: 15,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              {showForm ? "작성 취소" : "게시글 작성"}
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

        {/* 글쓰기 폼 */}
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
                  placeholder="비밀번호를 입력하세요"
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
                게시글 등록
              </button>
            </div>
          </form>
        )}

        {/* 목록 */}
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
                onClick={() => togglePost(post.id)}
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
                  {/* 비밀글 배지 */}
                  {post.is_secret === 1 && (
                    <span
                      style={{
                        fontSize: 12,
                        padding: "2px 6px",
                        borderRadius: 999,
                        background: "#020024",
                        color: "#fff",
                        fontWeight: 500,
                      }}
                    >
                      🔒비밀
                    </span>
                  )}

                  {/* 제목 */}
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 18,
                      flex: 1,
                      cursor: "pointer",
                    }}
                  >
                    {post.title}
                  </span>

                  {/* 영상 포함 배지 */}
                  {post.type === "trainer" && post.video_url && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 999,
                        background: "#ff7043",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      영상 포함
                    </span>
                  )}

                  {/* 삭제 버튼 */}
                  {user &&
                    (user.uid === post.user_uid || role === "admin") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClickDeletePost(post);
                        }}
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
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#020024",
                    display: "flex",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <span>{post.nickname}</span>
                  <span>·</span>
                  <span style={{ color: "#090979" }}>
                    {post.role === "trainer"
                      ? "트레이너"
                      : post.role === "admin"
                      ? "관리자"
                      : "회원"}
                  </span>
                  {post.created_at && (
                    <>
                      <span>·</span>
                      <span>{formatDate(post.created_at)}</span>
                    </>
                  )}
                </div>

                {/* 상세(본문/댓글/비밀글 비밀번호 입력) */}
                {openPostId === post.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      marginTop: 10,
                      padding: 12,
                      background: "#fafafa",
                      borderRadius: 10,
                      fontSize: 13,
                    }}
                  >
                    {/* 🔒 비밀글 + 잠금 안 풀림 + 작성자/관리자 아님 → 비밀번호 입력창 */}
                    {post.is_secret === 1 &&
                    !canBypassSecret(post) &&
                    !unlockedPosts[post.id] ? (
                      <div>
                        <div
                          style={{
                            marginBottom: 8,
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          🔒 비밀글입니다.
                        </div>
                        <div
                          style={{
                            marginBottom: 8,
                            fontSize: 12,
                            color: "#666",
                          }}
                        >
                          글 작성 시 설정한 비밀번호를 입력하면 내용을 볼 수
                          있습니다.
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            type="password"
                            placeholder="비밀번호를 입력하세요"
                            value={secretInputs[post.id] || ""}
                            onChange={(e) =>
                              setSecretInputs((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            style={{
                              flex: 1,
                              padding: 6,
                              borderRadius: 6,
                              border: "1px solid #ccc",
                              fontSize: 13,
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlockPost(post);
                            }}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 999,
                              border: "none",
                              background: "#000",
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            확인
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* ✅ 잠금 해제된 비밀글 / 비밀글 아님 / 작성자·관리자 → 내용/댓글 보임 */}

                        {/* 본문 */}
                        <div
                          style={{
                            marginBottom: 12,
                            fontSize: 16,
                            fontWeight: 600,
                          }}
                        >
                          {post.content}
                        </div>

                        {/* 영상(트레이너 게시판) */}
                        {post.video_url && (
                          <div style={{ marginBottom: 10 }}>
                            <a
                              href={post.video_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              🎥 영상 보러가기
                            </a>
                          </div>
                        )}

                        {/* 댓글 목록 */}
                        <div
                          style={{
                            fontWeight: 600,
                            marginBottom: 6,
                            fontSize: 16,
                          }}
                        >
                          <img
                            src={comment}
                            alt="댓글"
                            style={{ width: "18px", height: "16px" }}
                          />
                          &nbsp;댓글
                        </div>
                        {(comments[post.id] || []).map((c) => (
                          <div
                            key={c.id}
                            style={{ fontSize: 13, marginBottom: 4 }}
                          >
                            <b style={{ fontWeight: 600 }}>{c.nickname}</b> :{" "}
                            {c.content}
                          </div>
                        ))}

                        {/* 댓글 입력 */}
                        {user && (
                          <div
                            style={{
                              display: "flex",
                              marginTop: 8,
                            }}
                          >
                            <input
                              value={commentInput}
                              onChange={(e) =>
                                setCommentInput(e.target.value)
                              }
                              placeholder="댓글 작성..."
                              style={{
                                flex: 1,
                                padding: 6,
                                borderRadius: 6,
                                border: "1px solid #ccc",
                              }}
                            />
                            <button
                              style={{
                                marginLeft: 6,
                                padding: "5px 12px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 500,
                                border: "none",
                                cursor: "pointer",
                                color: "#FFF",
                                background: "black",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                submitComment(post.id);
                              }}
                            >
                              등록
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 삭제 확인 모달 */}
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
            <div
              style={{
                fontSize: 12,
                color: "#666",
                marginBottom: 16,
              }}
            >
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
