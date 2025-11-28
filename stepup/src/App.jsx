// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Home from "./pages/Home.jsx";
import Exercise from "./pages/Exercise.jsx";
// Room은 안 쓰면 주석 또는 삭제
// import Room from "./pages/Room.jsx";
import Workouts from "./pages/Workouts.jsx";
import Pose from "./pages/Pose.jsx";
import Videos from "./pages/Videos.jsx";
import Logs from "./pages/Logs.jsx";
import Settings from "./pages/Settings.jsx";
import Survey from "./pages/Survey.jsx";
import Board from "./pages/Board.jsx";
import Payment from "./pages/PayMent.jsx";   // 🔹 결제 페이지 추가

import PageError from "./PageError.jsx";

function PrivateRoute({ children }) {
  const { user, authReady } = useAuth();

  if (!authReady) return null;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export default function App() {
  const { user, authReady } = useAuth();

  if (!authReady) {
    return <div style={{ padding: 40 }}>로딩 중...</div>;
  }

  return (
    <Routes>
      {/* 기본 진입 */}
      <Route
        path="/"
        element={
          user ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />
        }
      />

      {/* 비로그인 가능 페이지 */}
      <Route
        path="/login"
        element={user ? <Navigate to="/home" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/home" replace /> : <Signup />}
      />

      {/* 로그인 필요 페이지들 */}
      <Route
        path="/home"
        element={
          <PrivateRoute>
            <PageError>
              <Home />
            </PageError>
          </PrivateRoute>
        }
      />
      <Route
        path="/exercise/:exId"
        element={
          <PrivateRoute>
            <PageError>
              <Exercise />
            </PageError>
          </PrivateRoute>
        }
      />
      <Route
        path="/board"
        element={
          <PrivateRoute>
            <Board />
          </PrivateRoute>
        }
      />
      {/* Room은 잠깐 막기
      <Route
        path="/room"
        element={
          <PrivateRoute>
            <PageError>
              <Room />
            </PageError>
          </PrivateRoute>
        }
      />
      */}
      <Route
        path="/workouts"
        element={
          <PrivateRoute>
            <PageError>
              <Workouts />
            </PageError>
          </PrivateRoute>
        }
      />
      <Route
        path="/pose"
        element={
          <PrivateRoute>
            <PageError>
              <Pose />
            </PageError>
          </PrivateRoute>
        }
      />
      <Route
        path="/videos"
        element={
          <PrivateRoute>
            <PageError>
              <Videos />
            </PageError>
          </PrivateRoute>
        }
      />
      <Route
        path="/logs"
        element={
          <PrivateRoute>
            <PageError>
              <Logs />
            </PageError>
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <PageError>
              <Settings />
            </PageError>
          </PrivateRoute>
        }
      />
      <Route
        path="/survey"
        element={
          <PrivateRoute>
            <Survey />
          </PrivateRoute>
        }
      />

      {/* 🔹 결제 페이지 라우트 추가 */}
      <Route
        path="/payment"
        element={
          <PrivateRoute>
            <PageError>
              <Payment />
            </PageError>
          </PrivateRoute>
        }
      />

      {/* 나머지 */}
      <Route path="*" element={<PageError />} />
    </Routes>
  );
}
