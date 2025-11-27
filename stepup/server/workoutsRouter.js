// server/workoutsRouter.js
const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const workoutsRouter = require("./workoutsRouter");

// 🔹 여기 DB 접속 정보는 너희 학교 DB 정보에 맞게 수정
const pool = mysql.createPool({
  host: process.env.DB_HOST,         // .env에서 DB 주소를 가져옵니다.
    port: process.env.DB_PORT,         // 반드시 있어야할 코드
    user: process.env.DB_USER,         // .env에서 사용자 이름을 가져옵니다.
    password: process.env.DB_PASSWORD, // .env에서 비밀번호를 가져옵니다.
    database: process.env.DB_NAME,     // .env에서 DB 이름을 가져옵니다.
    waitForConnections: true,          // 연결이 없으면 기다립니다.
    connectionLimit: 10,               // 연결을 최대 10개까지만 만듭니다.
    queueLimit: 0,
});

// [POST] /api/workouts/log  : 운동 한 번 끝날 때 기록 저장
router.post("/log", async (req, res) => {
  const {
    userUid,
    exercise,
    difficulty,
    reps,
    score,
    startedAt,
    endedAt,
  } = req.body;

  if (!userUid || !exercise || !difficulty) {
    return res.status(400).json({ message: "필수 데이터가 없습니다." });
  }

  try {
    const sql = `
      INSERT INTO workouts
        (user_uid, exercise, difficulty, reps, score, started_at, ended_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(sql, [
      userUid,
      exercise,
      difficulty,
      reps ?? null,
      score ?? null,
      startedAt ? new Date(startedAt) : null,
      endedAt ? new Date(endedAt) : null,
    ]);

    res.json({ message: "ok" });
  } catch (err) {
    console.error("workouts 로그 저장 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

// [GET] /api/workouts/history/:userUid  : 특정 회원 운동 기록 조회
router.get("/history/:userUid", async (req, res) => {
  const { userUid } = req.params;

  try {
    const sql = `
      SELECT *
      FROM workouts
      WHERE user_uid = ?
      ORDER BY started_at DESC, created_at DESC
    `;
    const [rows] = await pool.execute(sql, [userUid]);
    res.json(rows);
  } catch (err) {
    console.error("workouts 조회 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
