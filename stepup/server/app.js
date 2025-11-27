// server/app.js

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const workoutsRouter = require("./workoutsRouter");

// .env 읽어오기
dotenv.config();

const app = express();

// 프론트에서 보내는 JSON 읽기
app.use(express.json());

// CORS 설정 (Vite 기본 포트 5173 기준)
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

// 🔹 MySQL 연결 (학교 .env 정보 사용)
const pool = mysql.createPool({
  host: process.env.DB_HOST,         // project-db-campus.smhrd.com
  port: process.env.DB_PORT,         // 3307
  user: process.env.DB_USER,         // campus_25KDT_HC1_p2_1
  password: process.env.DB_PASSWORD, // smhrd1
  database: process.env.DB_NAME,     // campus_25KDT_HC1_p2_1
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// [POST] /api/workouts/log : 운동 기록 저장 (시작/종료시간 포함)
app.post('/api/workouts/log', async (req, res) => {
  const {
    userUid,
    exercise,
    difficulty,
    reps,
    score,
    startedAt, // 프론트에서 ISO 문자열로 보냄
    endedAt,
  } = req.body;

  if (!userUid || !exercise || !difficulty) {
    return res
      .status(400)
      .json({ message: 'userUid, exercise, difficulty 는 필수입니다.' });
  }

  const sql = `
    INSERT INTO workout_logs
      (user_uid, exercise, difficulty, reps, score, started_at, ended_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    userUid,
    exercise,
    difficulty,
    reps ?? 0,
    score ?? null,
    startedAt ? new Date(startedAt) : null,
    endedAt ? new Date(endedAt) : null,
  ];

  try {
    const [result] = await pool.query(sql, params);
    res.json({ message: '운동 로그 저장 완료', id: result.insertId });
  } catch (err) {
    console.error('운동 로그 저장 오류:', err);
    res.status(500).json({ message: '서버 오류(로그 저장 실패)' });
  }
});

// [GET] /api/workouts/logs?userUid=... : 내 운동 기록 조회
app.get('/api/workouts/logs', async (req, res) => {
  const { userUid } = req.query;
  if (!userUid) {
    return res
      .status(400)
      .json({ message: 'userUid 쿼리스트링이 필요합니다.' });
  }

  const sql = `
    SELECT
      id,
      exercise,
      difficulty,
      reps,
      score,
      started_at,
      ended_at,
      created_at
    FROM workout_logs
    WHERE user_uid = ?
    ORDER BY started_at DESC, created_at DESC
    LIMIT 100
  `;

  try {
    const [rows] = await pool.query(sql, [userUid]);
    res.json(rows);
  } catch (err) {
    console.error('운동 로그 조회 오류:', err);
    res.status(500).json({ message: '서버 오류(로그 조회 실패)' });
  }
});

// 서버 실행
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ StepUp 서버 실행 중: http://localhost:${PORT}`);
});
