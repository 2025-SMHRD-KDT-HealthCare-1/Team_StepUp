// server/app.js

// =======================
// 기본 설정 / 모듈
// =======================
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

// 1) .env 먼저 읽기
dotenv.config();

// 2) Stripe 불러오기 (.env 읽은 뒤!)
// const Stripe = require("stripe");
// const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// // 체크용 (필수는 아님)
// if (!process.env.STRIPE_SECRET_KEY) {
//   console.warn("⚠ STRIPE_SECRET_KEY가 .env에 없습니다.");
// }
// if (!process.env.STRIPE_PREMIUM_PRICE_ID) {
//   console.warn("⚠ STRIPE_PREMIUM_PRICE_ID가 .env에 없습니다.");
// }

const app = express();

// JSON 파싱
app.use(express.json());

// CORS (Vite 기본 포트 5173)
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// =======================
// MySQL 커넥션 풀
// =======================
const pool = mysql.createPool({
  host: process.env.DB_HOST, // project-db-campus.smhrd.com
  port: process.env.DB_PORT, // 3307
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// =======================
// 1) 운동 로그 라우트
// =======================

// [POST] /api/workouts/log : 운동 기록 저장
app.post("/api/workouts/log", async (req, res) => {
  const {
    userUid,
    exercise,
    difficulty,
    reps,
    score,
    startedAt, // ISO 문자열
    endedAt,
  } = req.body;

  if (!userUid || !exercise || !difficulty) {
    return res
      .status(400)
      .json({ message: "userUid, exercise, difficulty 는 필수입니다." });
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
    res.json({ message: "운동 로그 저장 완료", id: result.insertId });
  } catch (err) {
    console.error("운동 로그 저장 오류:", err);
    res.status(500).json({ message: "서버 오류(로그 저장 실패)" });
  }
});

// [GET] /api/workouts/logs?userUid=...
app.get("/api/workouts/logs", async (req, res) => {
  const { userUid } = req.query;
  if (!userUid) {
    return res
      .status(400)
      .json({ message: "userUid 쿼리스트링이 필요합니다." });
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
    console.error("운동 로그 조회 오류:", err);
    res.status(500).json({ message: "서버 오류(로그 조회 실패)" });
  }
});

// =======================
// 2) 게시판 라우트
// =======================

// [GET] /api/board/list?type=suggestion|trainer
app.get("/api/board/list", async (req, res) => {
  const { type } = req.query;

  try {
    let sql = `
      SELECT
        id,
        user_uid,
        nickname,
        role,
        type,
        title,
        content,
        is_secret,
        video_url,
        created_at
      FROM board
    `;
    const params = [];

    if (type) {
      sql += " WHERE type = ?";
      params.push(type);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("게시글 목록 불러오기 오류:", err);
    res.status(500).json({ message: "서버 오류(게시글 목록)" });
  }
});

// ✅ 게시글 상세 조회
app.get("/api/board/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const sql = `
      SELECT
        id,
        user_uid,
        nickname,
        role,
        type,
        title,
        content,
        is_secret,
        secret_password,
        video_url,
        created_at
      FROM board
      WHERE id = ?
    `;

    const [rows] = await pool.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("게시글 상세 조회 오류:", err);
    res.status(500).json({ message: "서버 오류(게시글 상세)" });
  }
});

// [POST] /api/board/write
app.post("/api/board/write", async (req, res) => {
  const {
    userUid,
    nickname,
    role,
    type, // suggestion | trainer
    title,
    content,
    isSecret,
    secretPassword,
    videoUrl,
  } = req.body;

  if (!userUid || !nickname || !role || !type || !title || !content) {
    return res
      .status(400)
      .json({ message: "필수 항목이 누락되었습니다." });
  }

  const sql = `
    INSERT INTO board
      (user_uid, nickname, role, type, title, content, is_secret, secret_password, video_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    userUid,
    nickname,
    role,
    type,
    title,
    content,
    isSecret ? 1 : 0,
    isSecret ? secretPassword || null : null,
    videoUrl || null,
  ];

  try {
    const [result] = await pool.query(sql, params);
    res.json({ message: "게시글 저장 완료", id: result.insertId });
  } catch (err) {
    console.error("게시글 저장 오류:", err);
    res.status(500).json({ message: "서버 오류(게시글 저장)" });
  }
});

// [DELETE] /api/board/:id
app.delete("/api/board/:id", async (req, res) => {
  const { id } = req.params;
  const { userUid, role } = req.body; // axios에서 data로 보냄

  if (!id || !userUid) {
    return res
      .status(400)
      .json({ message: "id, userUid 가 필요합니다." });
  }

  try {
    let sql = `
      DELETE FROM board
      WHERE id = ?
    `;
    const params = [id];

    // 관리자 아니면 본인 글만 삭제
    if (role !== "admin") {
      sql += " AND user_uid = ?";
      params.push(userUid);
    }

    const [result] = await pool.query(sql, params);

    if (result.affectedRows === 0) {
      return res
        .status(403)
        .json({ message: "삭제 권한이 없거나 존재하지 않는 글입니다." });
    }

    res.json({ message: "게시글 삭제 완료" });
  } catch (err) {
    console.error("게시글 삭제 오류:", err);
    res.status(500).json({ message: "서버 오류(게시글 삭제)" });
  }
});

// 댓글 목록 조회
app.get("/api/board/:id/comments", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM board_comments WHERE board_id = ? ORDER BY created_at ASC",
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error("댓글 조회 오류:", err);
    res.status(500).json({ message: "댓글 조회 실패" });
  }
});

// 댓글 작성
app.post("/api/board/:id/comment", async (req, res) => {
  const { id } = req.params;
  const { userUid, nickname, content } = req.body;

  if (!userUid || !content) {
    return res.status(400).json({ message: "댓글 내용이 필요합니다." });
  }

  try {
    await pool.query(
      "INSERT INTO board_comments (board_id, user_uid, nickname, content) VALUES (?, ?, ?, ?)",
      [id, userUid, nickname, content]
    );
    res.json({ message: "댓글 등록 완료" });
  } catch (err) {
    console.error("댓글 저장 오류:", err);
    res.status(500).json({ message: "댓글 저장 실패" });
  }
});

// =======================
// 3) Stripe 결제 라우트
// =======================
// app.post("/api/pay/create-checkout-session", async (req, res) => {
//   try {
//     const { userId, email } = req.body || {};

//     const session = await stripe.checkout.sessions.create({
//       mode: "subscription",
//       payment_method_types: ["card"],
//       line_items: [
//         {
//           price: process.env.STRIPE_PREMIUM_PRICE_ID, // .env에 있는 price ID
//           quantity: 1,
//         },
//       ],
//       customer_email: email || undefined,
//       metadata: {
//         userId: userId || "",
//       },
//       success_url: "http://localhost:5173/settings?payment=success",
//       cancel_url: "http://localhost:5173/settings?payment=cancel",
//     });

//     res.json({ url: session.url });
//   } catch (err) {
//     console.error("Stripe Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// =======================
// 서버 실행
// =======================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`StepUp 서버 실행 중: http://localhost:${PORT}`);
});

server.on("error", (err) => {
  console.error("서버 실행 중 오류 발생:", err);
});
