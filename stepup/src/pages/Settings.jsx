// src/pages/Settings.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainNav from "../components/MainNav";
import { useAuth } from "../context/AuthContext";

// 🔥 Firebase 삭제용
import { auth, db } from "../firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { deleteUser } from "firebase/auth";

export default function Settings() {
  const { user, nickname, plan, role } = useAuth();

  const [showConfirm, setShowConfirm] = useState(false); // 탈퇴 확인창
  const [loading, setLoading] = useState(false); // 버튼 중복 클릭 방지
  const navigate = useNavigate();

  // "회원 탈퇴" 버튼 눌렀을 때
  const handleClickDelete = () => {
    setShowConfirm(true);
  };

  // 확인창에서 "아니오"
  const handleCancel = () => {
    setShowConfirm(false);
  };

  // 확인창에서 "네" → 실제 회원정보 삭제
  const handleConfirmDelete = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 1) Firestore users 컬렉션에서 문서 삭제
      await deleteDoc(doc(db, "users", user.uid));

      // 2) Firebase Auth 계정 삭제
      await deleteUser(auth.currentUser);

      alert("회원 탈퇴가 완료되었습니다.");

      setShowConfirm(false);

      // 3) 메인 화면으로 보내고 새로고침 (auth 상태 초기화용)
      navigate("/");
      window.location.reload();
    } catch (error) {
      console.error("회원 탈퇴 오류:", error);
      alert("회원 탈퇴 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
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
        {/* ✅ 팀원 디자인 유지 */}
        <h1 style={{ textAlign: "center" }}>설정</h1>
        <h2 style={{ marginBottom: 16 }}>회원정보</h2>

        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            fontSize: 14,
          }}
        >
          <p>닉네임: {nickname}</p>
          <p>이메일: {user?.email}</p>
          <p>플랜: {plan}</p>
          <p>권한: {role}</p>

          {/* 🔹 이용권 결제 / 변경 버튼 */}
          <button
            type="button"
            onClick={() => navigate("/payment")}
            style={{
              marginTop: 12,
              marginRight: 8,
              padding: "8px 14px",
              borderRadius: 9999,
              border: "none",
              background: "#1976d2",
              color: "#fff",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            이용권 결제 / 변경하기
          </button>

          {/* 🔻 회원 탈퇴 버튼 */}
          <button
            onClick={handleClickDelete}
            style={{
              marginTop: 12,
              padding: "8px 14px",
              borderRadius: 9999,
              border: "none",
              background: "#e53935",
              color: "#fff",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            회원 탈퇴
          </button>
        </div>
      </div>

      {/* 🔻 "정말 탈퇴 하시겠습니까?" 확인창 */}
      {showConfirm && (
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
              정말 탈퇴 하시겠습니까?
            </div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
              탈퇴 후에는 운동 기록 및 계정 정보가 삭제되며,
              <br />
              해당 계정을 다시 복구할 수 없습니다.
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
                onClick={handleCancel}
                disabled={loading}
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
                disabled={loading}
                style={{
                  padding: "6px 14px",
                  borderRadius: 9999,
                  border: "none",
                  background: "#e53935",
                  color: "#fff",
                  fontSize: 13,
                  cursor: loading ? "default" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "탈퇴 처리 중..." : "네"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
