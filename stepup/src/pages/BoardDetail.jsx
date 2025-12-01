// src/pages/BoardDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import MainNav from "../components/MainNav";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://localhost:5000";

export default function BoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, nickname, role } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needPassword, setNeedPassword] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  // 게시글 불러오기 함수
  const loadPost = async (extraPw) => {
    if (!id) return;
    setLoading(true);
    setError("");

    try {
      const res = await axios.get(`${API_BASE}/api/board/${id}`, {
        params: {
          userUid: user?.uid || "",
          role: role || "",
          pw: extraPw || "",
        },
      });
      setPost(res.data);
      setNeedPassword(false);
    } catch (err) {
      if (err.response?.status === 403) {
        // 비밀글 + 비밀번호 필요
        setNeedPassword(true);
        setPost(null);
      } else if (err.response?.status === 404) {
        setError("게시글을 찾을 수 없습니다.");
      } else {
        setError("게시글을 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmitPassword = (e) => {
    e.preventDefault();
    loadPost(pw);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <MainNav />
        <div style={{ paddingTop: 100, textAlign: "center" }}>불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <MainNav />
        <div style={{ paddingTop: 100, textAlign: "center" }}>{error}</div>
      </div>
    );
  }

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
        <button
          onClick={() => navigate(-1)}
          style={{
            marginBottom: 16,
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          ← 목록으로
        </button>

        {needPassword ? (
          // 🔐 비밀글 비밀번호 입력 화면
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ marginBottom: 8, fontWeight: 600 }}>
              비밀글 비밀번호를 입력해 주세요.
            </div>
            <form onSubmit={handleSubmitPassword}>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="비밀번호"
                style={{
                  width: "100%",
                  marginBottom: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  fontSize: 14,
                }}
              />
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
                확인
              </button>
            </form>
          </div>
        ) : (
          // 📄 일반 상세 화면
          post && (
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 20,
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                {post.title}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#777",
                  marginBottom: 16,
                }}
              >
                {post.nickname} ·{" "}
                {post.role === "trainer"
                  ? "트레이너"
                  : post.role === "admin"
                  ? "관리자"
                  : "일반회원"}{" "}
                ·{" "}
                {post.created_at &&
                  new Date(post.created_at).toLocaleString()}
              </div>

              <div
                style={{
                  fontSize: 14,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}
              >
                {post.content}
              </div>

              {post.type === "trainer" && post.video_url && (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: "1px solid #eee",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      marginBottom: 6,
                      fontWeight: 500,
                    }}
                  >
                    홍보 영상
                  </div>
                  <a
                    href={post.video_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13, color: "#1976d2" }}
                  >
                    {post.video_url}
                  </a>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
