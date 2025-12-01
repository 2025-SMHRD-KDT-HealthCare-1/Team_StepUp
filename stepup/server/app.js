// server/app.js

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

// ✅ 업로드/파일 처리용
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;
const multer = require("multer");

dotenv.config();

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
// 업로드 폴더 / 정적 경로
// =======================
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Logs.jsx 에서 videoUrl 재생할 때 사용: http://localhost:5000/uploads/파일명
app.use("/uploads", express.static(uploadDir));

// multer 설정 (파일을 uploads 폴더에 저장)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".webm";
    const base = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, base + ext);
  },
});
const upload = multer({ storage });

// =======================
// MySQL 커넥션 풀
// =======================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
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

// [POST] /api/workouts/log : 운동 기록 + (옵션) 세트 영상 경로 → DB 저장
app.post("/api/workouts/log", async (req, res) => {
  const {
    userUid,
    exercise,
    difficulty,
    reps,
    score,
    startedAt, // ISO 문자열
    endedAt,
    videoUrl, // "/uploads/xxx.webm" 형태 (옵션)
  } = req.body;

  if (!userUid || !exercise || !difficulty) {
    return res
      .status(400)
      .json({ message: "userUid, exercise, difficulty 는 필수입니다." });
  }

  const sql = `
    INSERT INTO workout_logs
      (user_uid, exercise, difficulty, reps, score, video_url, started_at, ended_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    userUid,
    exercise,
    difficulty,
    reps ?? 0,
    score ?? null,
    videoUrl ?? null, // 문자열 경로
    startedAt ? new Date(startedAt) : null,
    endedAt ? new Date(endedAt) : null,
  ];

  try {
    const [result] = await pool.query(sql, params);
    const insertedId = result.insertId;

    // 🔹 videoUrl 이 있으면, 실제 파일을 읽어서 video_blob 컬럼에도 저장
    if (videoUrl) {
      try {
        // "/uploads/xxx.webm" → "./uploads/xxx.webm"
        const relativePath = videoUrl.startsWith("/")
          ? "." + videoUrl
          : videoUrl;
        const filePath = path.join(__dirname, relativePath);

        const fileData = await fsPromises.readFile(filePath);

        // ✅ 실제 DB 컬럼명(video_blob)에 맞게 업데이트
        await pool.query(
          "UPDATE workout_logs SET video_blob = ? WHERE id = ?",
          [fileData, insertedId]
        );

        console.log("✅ 영상 BLOB까지 저장 완료:", insertedId);
      } catch (blobErr) {
        console.error(
          "⚠️ 영상 BLOB 저장 실패(경로/파일 문제일 수 있음):",
          blobErr
        );
        // 여기서는 로그만 남기고 응답은 성공으로 보냄
      }
    }

    res.json({ message: "운동 로그 저장 완료", id: insertedId });
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
      video_url,   -- Logs.jsx 에서 써먹는 문자열 경로
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
// 1.5) 세트 영상 업로드 라우트
// =======================
// [POST] /api/upload-video  (pushup.html 에서 form-data "video" 로 호출)
app.post("/api/upload-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "영상 파일이 없습니다." });
    }

    const videoUrl = `/uploads/${req.file.filename}`; // 프론트에서 저장할 경로

    console.log("🎥 업로드된 세트 영상:", {
      filename: req.file.filename,
      size: req.file.size,
      videoUrl,
    });

    return res.json({
      message: "세트 영상 업로드 완료",
      videoUrl,
    });
  } catch (err) {
    console.error("세트 영상 업로드 오류:", err);
    return res.status(500).json({ message: "세트 영상 업로드 실패" });
  }
});

// =======================
// 2) 게시판 라우트 (팀원 기능 + 네 수정본)
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
        secret_password,  -- 팀원 버전에서 추가된 비밀번호 컬럼
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
    isSecret ? 1 : 0, // TINYINT(1)
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
  const { userUid, role } = req.body;

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
// (선택) Stripe 결제 라우트 - 팀원 버전 (현재는 전부 주석)
// =======================
/*
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.post("/api/pay/create-checkout-session", async (req, res) => {
  try {
    const { userId, email } = req.body || {};

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      metadata: {
        userId: userId || "",
      },
      success_url: "http://localhost:5173/settings?payment=success",
      cancel_url: "http://localhost:5173/settings?payment=cancel",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Error:", err);
    res.status(500).json({ error: err.message });
  }
});
*/

// =======================
// 서버 실행
// =======================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`✅ StepUp 서버 실행 중: http://localhost:${PORT}`);
});

server.on("error", (err) => {
  console.error("🛑 서버 실행 중 오류 발생:", err);
});