// src/pages/Board.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import MainNav from "../components/MainNav";
// import { useNavigate } from "react-router-dom";

// 댓글 이미지
import comment from "../icon/comment.svg";
import lockIcon from "../icon/lock.svg"
const API_BASE = "http://localhost:5000";

// media_url이 S3 전체 URL인지, 예전 /uploads 인지 구분해서 src 만들기
const buildMediaSrc = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url; // S3 전체 URL 그대로 사용
  }
  return `${API_BASE}${url}`; // 예전처럼 /uploads/... 인 경우만 서버 주소 붙이기
};

export default function Board() {
  const { user, nickname, role } = useAuth();

  // 탭: suggestion | trainer
  const [tab, setTab] = useState("suggestion");

  // 글 목록
  const [posts, setPosts] = useState([]);

  // 글쓰기/수정 폼
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // 업로드할 사진/영상 파일
  const [mediaFile, setMediaFile] = useState(null);

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
  // 댓글 입력값 (게시글별)
  const [commentInputs, setCommentInputs] = useState({});

  // 현재 수정 중인 댓글 ID
  const [editingCommentId, setEditingCommentId] = useState(null);

  // 수정 중인 댓글 내용
  const [editingCommentText, setEditingCommentText] = useState("");


  // 비밀글 비밀번호 입력값(게시글별)
  const [secretInputs, setSecretInputs] = useState({});
  // 비밀글 잠금 해제 여부(게시글별)
  const [unlockedPosts, setUnlockedPosts] = useState({});

  // 수정 모드
  const [editMode, setEditMode] = useState(false);
  const [editPost, setEditPost] = useState(null);

  const [deleteMediaFlag, setDeleteMediaFlag] = useState(false);

  const [editPreviewMedia, setEditPreviewMedia] = useState(null);



  // 탭이 바뀔 때마다 목록 불러오기
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

  // 작성자 / 관리자는 비밀번호 없이 비밀글 열 수 있게
  const canBypassSecret = (post) =>
    user && (user.uid === post.user_uid || role === "admin");

  // 수정 버튼 눌렀을 때 기존 글 데이터를 폼에 채우기
  const openEditForm = (post) => {
    setEditMode(true);
    setEditPost(post);
    setShowForm(true);

    setTitle(post.board_title || post.title);
    setContent(post.board_content || post.content);
    setVideoUrl(post.video_url || "");
    setIsSecret(post.is_secret === 1);
    setSecretPassword(post.secret_password || "");
    setMediaFile(null);
    setEditPreviewMedia(post.media_url || null);

  };

// 글 등록 / 수정 (폼 전송)
const handleSubmit = async (e) => {
  e.preventDefault();

  // ✅ 수정 모드일 경우 → PUT + FormData로 전송
  if (editMode && editPost) {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("board_title", title.trim());
      formData.append("board_content", content.trim());
      formData.append("is_secret", isSecret ? "1" : "0");
      formData.append("secret_password", secretPassword || "");
      formData.append("video_url", videoUrl.trim());

      if (deleteMediaFlag) formData.append("deleteMedia", "1");
      else formData.append("deleteMedia", "0");


      // 🔥 사진/영상 파일을 새로 선택한 경우에만 서버로 보냄
      if (mediaFile) {
        formData.append("media", mediaFile); // 백엔드 upload.single("media")랑 이름 맞추기
      }

      await axios.put(`${API_BASE}/api/board/${editPost.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("게시글이 수정되었습니다.");

      // 초기화
      setEditMode(false);
      setEditPost(null);
      setShowForm(false);
      setTitle("");
      setContent("");
      setVideoUrl("");
      setIsSecret(false);
      setSecretPassword("");
      setMediaFile(null);

      const res = await axios.get(`${API_BASE}/api/board/list`, {
        params: { type: tab },
      });
      setPosts(Array.isArray(res.data) ? res.data : []);

      return; // 아래 신규 작성 로직 실행 안 하도록
    } catch (err) {
      console.error("수정 오류:", err);
      alert("게시글 수정 중 오류가 발생했습니다.");
      return;
    }
  }

  // 🔽 여기서부터는 "신규 작성" 로직

  // 로그인 체크
  if (!user) {
    alert("로그인이 필요합니다.");
    return;
  }

  // 트레이너 게시판 권한 체크
  if (tab === "trainer" && role !== "trainer" && role !== "admin") {
    alert("트레이너 회원만 홍보 글을 작성할 수 있습니다.");
    return;
  }

  if (!title.trim() || !content.trim()) {
    alert("제목과 내용을 입력해주세요.");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("userUid", user.uid);
    formData.append("nickname", nickname || user.email || "익명");
    formData.append("role", role || "user");
    formData.append("type", tab); // suggestion | trainer
    formData.append("title", title.trim());
    formData.append("content", content.trim());
    formData.append("isSecret", isSecret ? "1" : "0");
    formData.append("secretPassword", secretPassword || "");
    formData.append("videoUrl", tab === "trainer" ? videoUrl.trim() : "");

    if (mediaFile) {
      // 서버 app.js 의 upload.single("media") 와 이름 맞추기
      formData.append("media", mediaFile);
    }

    await axios.post(`${API_BASE}/api/board/write`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // 폼 초기화
    setTitle("");
    setContent("");
    setVideoUrl("");
    setIsSecret(false);
    setSecretPassword("");
    setMediaFile(null);
    setShowForm(false);

    // 목록 다시 불러오기
    const res = await axios.get(`${API_BASE}/api/board/list`, {
      params: { type: tab },
    });
    setPosts(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error("게시글 저장 오류:", err);
    alert("게시글 저장 중 오류가 발생했습니다.");
  }};

  // 게시글 토글 (열기/닫기) + 댓글 불러오기
  const togglePost = async (postId) => {
    if (openPostId === postId) {
      setOpenPostId(null);
      return;
    }

    setOpenPostId(postId);

    try {
      const res = await axios.get(`${API_BASE}/api/board/${postId}/comments`);
      setComments((prev) => ({ ...prev, [postId]: res.data }));
    } catch (err) {
      console.error("댓글 불러오기 오류:", err);
    }
  };

  // 댓글 등록 (게시글별 입력값 사용)
  const submitComment = async (postId) => {
    const text = (commentInputs[postId] || "").trim();
    if (!text) return;

    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/board/${postId}/comment`, {
        userUid: user.uid,
        nickname,
        role,
        content: text,
      });

      // 해당 게시글 댓글 입력값만 비우기
      setCommentInputs((prev) => ({
        ...prev,
        [postId]: "",
      }));

      const res = await axios.get(`${API_BASE}/api/board/${postId}/comments`);
      setComments((prev) => ({ ...prev, [postId]: res.data }));
    } catch (err) {
      console.error("댓글 등록 오류:", err);
      alert("댓글 등록 중 오류가 발생했습니다.");
    }
  };
// 댓글 수정 기능

// 댓글 수정 시작
const startEditComment = (comment) => {
  setEditingCommentId(comment.id);
  setEditingCommentText(comment.content);
};

// 댓글 수정 취소
const cancelEditComment = () => {
  setEditingCommentId(null);
  setEditingCommentText("");
};

// 댓글 수정 저장
const saveEditComment = async (postId) => {
  if (!editingCommentId) return;
  const text = editingCommentText.trim();
  if (!text) {
    alert("댓글 내용을 입력해주세요.");
    return;
  }

  if (!user) {
    alert("로그인이 필요합니다.");
    return;
  }

  try {
    await axios.put(
      `${API_BASE}/api/board/${postId}/comment/${editingCommentId}`,
      {
        userUid: user.uid,
        role: role || "user",
        content: text,
      }
    );

    const res = await axios.get(
      `${API_BASE}/api/board/${postId}/comments`
    );
    setComments((prev) => ({ ...prev, [postId]: res.data }));

    setEditingCommentId(null);
    setEditingCommentText("");
  } catch (err) {
    console.error("댓글 수정 오류:", err);
    alert("댓글 수정 중 오류가 발생했습니다.");
  }
};

// 댓글 삭제
const deleteComment = async (postId, commentId) => {
  if (!user) {
    alert("로그인이 필요합니다.");
    return;
  }

  const ok = window.confirm("이 댓글을 삭제하시겠습니까?");
  if (!ok) return;

  try {
    await axios.delete(
      `${API_BASE}/api/board/${postId}/comment/${commentId}`,
      {
        data: {
          userUid: user.uid,
          role: role || "user",
        },
      }
    );

    const res = await axios.get(
      `${API_BASE}/api/board/${postId}/comments`
    );
    setComments((prev) => ({ ...prev, [postId]: res.data }));

    if (editingCommentId === commentId) {
      setEditingCommentId(null);
      setEditingCommentText("");
    }
  } catch (err) {
    console.error("댓글 삭제 오류:", err);
    alert("댓글 삭제 중 오류가 발생했습니다.");
  }
};

  // 비밀글 잠금 해제 (비밀번호 비교)
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

  // 날짜 포맷
  const formatDate = (val) => {
    if (!val) return "";
    try {
      return new Date(val).toLocaleString();
    } catch {
      return "";
    }
  };

  // 삭제 버튼 클릭
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

  // 삭제 취소
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setTargetPost(null);
  };

  // 삭제 확정
  const handleConfirmDelete = async () => {
    if (!targetPost || !user) return;

    try {
      await axios.delete(`${API_BASE}/api/board/${targetPost.id}`, {
        data: {
          userUid: user.uid,
          role: role || "user",
        },
      });

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
              onClick={() => {
                setTab("suggestion");
                setOpenPostId(null);
              }}
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
              자유게시판
            </button>
            <button
              onClick={() => {
                setTab("trainer");
                setOpenPostId(null);
              }}
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
              onClick={() => {
                // 작성 취소 시 수정 모드도 초기화
                if (showForm) {
                  setEditMode(false);
                  setEditPost(null);
                  setTitle("");
                  setContent("");
                  setVideoUrl("");
                  setIsSecret(false);
                  setSecretPassword("");
                  setMediaFile(null);
                }
                setShowForm((prev) => !prev);
              }}
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

        {/* 글쓰기 / 수정 폼 */}
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
                : "트레이너 홍보 글을 작성해주세요. (영상 URL 또는 파일을 함께 등록할 수 있습니다.)"}
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

            {/* 사진/동영상 파일 업로드 (선택) */}
            <div
              style={{
                marginBottom: 8,
                fontSize: 12,
                color: "#555",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span>사진 또는 동영상 파일 (선택)</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setMediaFile(file || null);
                }}
              />
              {editMode && editPost?.media_url && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteMediaFlag(true);
                    setMediaFile(null);
                    alert("기존 이미지를 삭제합니다.");
                  }}
                  style={{
                    marginTop: 4,
                    padding: "4px 10px",
                    background: "#e53935",
                    color: "#fff",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    width: "fit-content",
                  }}
                >
                  기존 이미지 삭제하기
                </button>
              )}
              {/* 수정 모드 + 기존 이미지가 있는 경우 → 미리보기 */}
{editMode && editPreviewMedia && (
  <div style={{ marginBottom: 10 }}>
    {/\.(mp4|webm|ogg|mov)$/i.test(editPreviewMedia) ? (
      <video
        controls
        style={{ maxWidth: "100%", borderRadius: 8 }}
        src={buildMediaSrc(editPreviewMedia)}
      />
    ) : (
      <img
        alt="기존 첨부 이미지"
        style={{ maxWidth: "100%", borderRadius: 8 }}
        src={buildMediaSrc(editPreviewMedia)}
      />
    )}
  </div>
)}


            </div>

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
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                {editMode ? "게시글 수정" : "게시글 등록"}
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
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      <img
                      src={lockIcon}
                      alt="lock"
                      style={{ width: "18px", height: "15px" }}
                      />
                      비밀
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

                  {/* 영상 포함 배지 (URL 기준) */}
                  {post.type === "trainer" &&
                    (post.video_url || post.media_url) && (
                      <span
                        style={{
                          fontSize: 12,
                          padding: "2px 6px",
                          borderRadius: 999,
                          background: "#ff7043",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        영상/미디어 포함
                      </span>
                    )}

                  {/* 삭제/수정 버튼 */}
                  {user &&
                    (user.uid === post.user_uid || role === "admin") && (
                      <>
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

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(post);
                          }}
                          style={{
                            marginLeft: 6,
                            padding: "3px 8px",
                            borderRadius: 999,
                            border: "none",
                            background: "#1976d2",
                            color: "#fff",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          수정
                        </button>
                      </>
                    )}
                </div>

                {/* 작성자/역할/시간 */}
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#020024",
                    display: "flex",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <span>{post.nickname}</span>
                  <span>|</span>
                  <span style={{ color:
                            post.role === "admin"
                              ? "red"           
                              : post.role === "trainer"
                              ? "green"     
                              : "blue",       
                        }}>
                    {post.role === "trainer"
                      ? "트레이너"
                      : post.role === "admin"
                      ? "관리자"
                      : "회원"}
                  </span>
                  {post.created_at && (
                    <>
                      <span>|</span>
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
                    {/* 비밀글 + 잠금 안 풀림 + 작성자/관리자 아님 → 비밀번호 입력창 */}
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
                          비밀글입니다.
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
                        {/* 잠금 해제된 비밀글 / 비밀글 아님 / 작성자·관리자 → 내용/댓글 보임 */}

                        {/* 업로드된 사진/영상 */}
                        {post.media_url && (
                          <div style={{ marginBottom: 10, textAlign: "center" }}>
                            {/\.(mp4|webm|ogg|mov)$/i.test(post.media_url) ? (
                              <video
                                controls
                                style={{
                                  width: "400px",
                                  height: "auto",
                                  borderRadius: 8,
                                }}
                                src={buildMediaSrc(post.media_url)}
                              />
                            ) : (
                              <img
                                alt="첨부 미디어"
                                style={{
                                  width: "400px",
                                  height: "auto",
                                  borderRadius: 8,
                                }}
                                src={buildMediaSrc(post.media_url)}
                              />
                            )}
                          </div>
                        )}

                        {/* 외부 영상 URL(트레이너 게시판) */}
                        {post.video_url && (
                          <div style={{ marginBottom: 10 }}>
                            <a
                              href={post.video_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              외부 영상 보러가기
                            </a>
                          </div>
                        )}

                        {/* 본문 */}
                        <div
                          style={{
                            marginBottom: 12,
                            fontSize: 16,
                            fontWeight: 600,
                            whiteSpace: "pre-line",
                            textAlign: "center"
                          }}
                        >
                          {post.content}
                        </div>

                        {/* 댓글 목록 */}
                        <div
                          style={{
                            fontWeight: 600,
                            marginBottom: 6,
                            fontSize: 16,
                            display: "flex",
                            alignItems: "center"
                          }}
                        >
                          <img
                            src={comment}
                            alt="댓글"
                            style={{ width: "18px", height: "16px" }}
                          />
                          &nbsp;댓글
                        </div>

                        {(comments[post.id] || []).map((c) => {
                          const isOwnerOrAdmin =
                            user &&
                            (user.uid === c.user_uid || role === "admin");

                          const isEditing = editingCommentId === c.id;
                          return (
                            <div
                              key={c.id}
                              style={{
                                fontSize: 15,
                                marginBottom: 6,
                                padding: "4px 6px",
                                borderRadius: 6,
                                background: "#f3f3f3",
                              }}
                            >
                              {/* 닉네임 + 버튼 라인 */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  marginBottom: 2,
                                }}
                              >
                                <b style={{ fontWeight: 600,
                                  color:
                                    c.role === "admin"
                                      ? "red"
                                      : c.role === "trainer"
                                      ? "green"
                                      : "blue",
                                 }}>
                                  {c.nickname}({c.role === "trainer"
                                                            ? "트레이너"
                                                            : c.role === "admin"
                                                            ? "관리자"
                                                            : "회원"})
                                </b>

                                {/* 본인 댓글 또는 관리자만 수정/삭제 버튼 */}
                                {isOwnerOrAdmin && !isEditing && (
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 4,
                                      fontSize: 11,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditComment(c);
                                      }}
                                      style={{
                                        padding: "2px 8px",
                                        borderRadius: 999,
                                        border: "none",
                                        cursor: "pointer",
                                        background: "#1976d2",
                                        color: "#fff",
                                        fontSize: 11,
                                      }}
                                    >
                                      수정
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteComment(post.id, c.id);
                                      }}
                                      style={{
                                        padding: "2px 8px",
                                        borderRadius: 999,
                                        border: "none",
                                        cursor: "pointer",
                                        background: "#e53935",
                                        color: "#fff",
                                        fontSize: 11,
                                      }}
                                    >
                                      삭제
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* 내용 영역 */}
                              {!isEditing ? (
                                <div>{c.content}</div>
                              ) : (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    marginTop: 2,
                                  }}
                                >
                                  <input
                                    value={editingCommentText}
                                    onChange={(e) =>
                                      setEditingCommentText(e.target.value)
                                    }
                                    style={{
                                      flex: 1,
                                      padding: "4px 6px",
                                      borderRadius: 6,
                                      border: "1px solid #ccc",
                                      fontSize: 12,
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveEditComment(post.id);
                                    }}
                                    style={{
                                      padding: "3px 8px",
                                      borderRadius: 999,
                                      border: "none",
                                      cursor: "pointer",
                                      background: "#000",
                                      color: "#fff",
                                      fontSize: 11,
                                    }}
                                  >
                                    저장
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      cancelEditComment();
                                    }}
                                    style={{
                                      padding: "3px 8px",
                                      borderRadius: 999,
                                      border: "1px solid #ccc",
                                      cursor: "pointer",
                                      background: "#fff",
                                      color: "#333",
                                      fontSize: 11,
                                    }}
                                  >
                                    취소
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}


                        {/* 댓글 입력 */}
                        {user && (
                          <div
                            style={{
                              display: "flex",
                              marginTop: 8,
                            }}
                          >
                            <input
                              value={commentInputs[post.id] || ""}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({
                                  ...prev,
                                  [post.id]: e.target.value,
                                }))
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
                                fontSize: 15,
                                fontWeight: 400,
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