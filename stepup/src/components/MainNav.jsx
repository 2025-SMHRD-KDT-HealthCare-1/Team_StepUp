// src/components/MainNav.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "../pages/home-hero.css";
import muscleIcon from '../icon/muscle.svg'
import optionIcon from '../icon/option.svg'
import boardIcon from '../icon/board.svg'
import recordIcon from '../icon/record.svg'

// 운동 썸네일 이미지
import plankImg from "../assets/exercise/plank.png";
import pushupImg from "../assets/exercise/pushup.png";
import situpImg from "../assets/exercise/situp.jpeg";
import squatImg from "../assets/exercise/squat.png";

export default function MainNav() {
  const nav = useNavigate();
  const { user, nickname, plan, role } = useAuth();

// 1순위: Firestore에 저장된 닉네임
// 2순위: Firebase auth displayName
// 3순위: 이메일 앞부분
// 4순위: "회원"
const displayName =
  (nickname && nickname.trim() !== "")
    ? nickname
    : user?.displayName || (user?.email ? user.email.split("@")[0] : "회원");

  const planLabel =
  role === "trainer"
    ? "트레이너"
    : role === "admin"
    ? "관리자"
    : plan === "premium"
    ? "유료 회원"
    : "무료 회원";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      nav("/login");
    } catch (err) {
      alert(err.message);
    }
  };

  // 🔹 운동 이미지(드롭다운) 눌렀을 때 -> 바로 /pose 로 이동 + 운동 정보 전달
  const goExercise = (id) => {
    nav("/pose", { state: { exercise: id } });
  };

  return (
    <header className="hero-nav">
      {/* 왼쪽 로고 */}
      <button
        className="nav-brand"
        onClick={() => nav("/home")}
        aria-label="StepUp 홈으로"
      >
        <img src="/logo.png" alt="" className="logo" />
        <span className="brand">StepUp</span>
      </button>

      {/* 가운데 메뉴 */}
      <nav className="nav-menu">
        {/* 운동 + 미리보기 드롭다운 */}
        <div className="nav-workouts">
           <button
            onClick={() => nav("/workouts")}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3em', fontSize: '20px' }}
          >
            <img src={muscleIcon} alt="Muscle" style={{ width: '30px', height: '30px' }} />
            운동
          </button>

          <div className="workouts-dropdown">
            {/* 플랭크 */}
            <button onClick={() => goExercise("plank")}>
              <div
                style={{
                  position: "relative",
                  width: 110,
                  height: 80,
                }}
              >
                <img
                  src={plankImg}
                  alt="플랭크"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 12,
                    pointerEvents: "none",
                    display: "block",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 6,
                    transform: "translateX(-50%)",
                    fontSize: 10,
                    color: "#fff",
                    background: "rgba(0,0,0,0.6)",
                    padding: "2px 6px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}
                >
                  플랭크 / Plank
                </div>
              </div>
            </button>

            {/* 푸쉬업 */}
            <button onClick={() => goExercise("pushup")}>
              <div
                style={{
                  position: "relative",
                  width: 110,
                  height: 80,
                }}
              >
                <img
                  src={pushupImg}
                  alt="푸쉬업"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 12,
                    pointerEvents: "none",
                    display: "block",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 6,
                    transform: "translateX(-50%)",
                    fontSize: 10,
                    color: "#fff",
                    background: "rgba(0,0,0,0.6)",
                    padding: "2px 6px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}
                >
                  푸쉬업 / Push-up
                </div>
              </div>
            </button>

            {/* 싯업 */}
            <button onClick={() => goExercise("situp")}>
              <div
                style={{
                  position: "relative",
                  width: 110,
                  height: 80,
                }}
              >
                <img
                  src={situpImg}
                  alt="싯업"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 12,
                    pointerEvents: "none",
                    display: "block",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 6,
                    transform: "translateX(-50%)",
                    fontSize: 10,
                    color: "#fff",
                    background: "rgba(0,0,0,0.6)",
                    padding: "2px 6px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}
                >
                  싯업 / Sit-up
                </div>
              </div>
            </button>

            {/* 스쿼트 */}
            <button onClick={() => goExercise("squat")}>
              <div
                style={{
                  position: "relative",
                  width: 110,
                  height: 80,
                }}
              >
                <img
                  src={squatImg}
                  alt="스쿼트"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 12,
                    pointerEvents: "none",
                    display: "block",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 6,
                    transform: "translateX(-50%)",
                    fontSize: 10,
                    color: "#fff",
                    background: "rgba(0,0,0,0.6)",
                    padding: "2px 6px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}
                >
                  스쿼트 / Squat
                </div>
              </div>
            </button>
          </div>
        </div>

        <button
          onClick={() => nav("/logs")}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3em', fontSize: '20px' }}
        >
          <img src={recordIcon} alt="record" style={{ width: '25px', height: '25px' }} />
          기록
        </button>

        
        <button
          onClick={() => nav("/board")}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3em', fontSize: '20px' }}
        >
          <img src={boardIcon} alt="board" style={{ width: '20px', height: '20px' }} />
          게시판
        </button>

        <button
          onClick={() => nav("/settings")}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3em', fontSize: '20px' }}
        >
          <img src={optionIcon} alt="option" style={{ width: '25px', height: '25px' }} />
          설정
        </button>
      </nav>

      {/* 오른쪽 로그인 / 로그아웃 버튼 */}
      <button
        style={{
          padding: "8px 16px",
          borderRadius: "9999px",
          backgroundColor: "#111",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          whiteSpace: "nowrap",
          writingMode: "horizontal-tb",
        }}
        onClick={user ? handleLogout : () => nav("/login")}
      >
        {user ? `${displayName}(${planLabel}) 님 로그아웃` : "로그인"}
      </button>
    </header>
  );
}
