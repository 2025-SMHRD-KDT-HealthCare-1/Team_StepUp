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

// ✅ S3 사용을 위한 aws-sdk
//    터미널에서 한 번만 설치:
//    npm install aws-sdk
const AWS = require("aws-sdk");

dotenv.config();

const app = express();

// =======================
// AWS S3 설정
// =======================
// .env 에 아래 값이 있어야 함:
// AWS_ACCESS_KEY_ID=...
// AWS_SECRET_ACCESS_KEY=...
// AWS_S3_REGION=ap-northeast-2
// AWS_S3_BUCKET=stepup-같은-버킷이름
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_REGION,
});

const s3 = new AWS.S3();
const S3_BUCKET = process.env.AWS_S3_BUCKET;

// S3 Object URL 생성 헬퍼
function getS3ObjectUrl(key) {
  // 필요하면 .env 에 AWS_S3_PUBLIC_URL_BASE 추가해서 커스터마이즈 가능
  if (process.env.AWS_S3_PUBLIC_URL_BASE) {
    return `${process.env.AWS_S3_PUBLIC_URL_BASE}/${key}`;
  }
  return `https://${S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`;
}

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
// 업로드 폴더 / 정적 경로 (레거시용)
// =======================
// 기존에 로컬에 저장돼 있던 파일(이전에 올라온 것들)을 위해 유지.
// 새로 업로드하는 파일은 S3 로 올라가고, 여기에는 저장하지 않음.
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 예전 로그/게시판이 사용하는 /uploads 경로 (레거시)
app.use("/uploads", express.static(uploadDir));

// multer 설정
// 👉 더 이상 디스크에 저장하지 않고, 메모리 버퍼로만 받았다가 바로 S3로 업로드
const storage = multer.memoryStorage();
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
    videoUrl, // 이제는 S3 URL 또는 예전 /uploads/xxx.webm
    durationSec,  // 🟡 [추가] 프론트에서 넘어오는 실행시간(초)
  } = req.body;

  if (!userUid || !exercise || !difficulty) {
    return res
      .status(400)
      .json({ message: "userUid, exercise, difficulty 는 필수입니다." });
  }

  const sql = `
    INSERT INTO workout_logs
      (user_uid, exercise, difficulty, reps, score, video_url, started_at, ended_at, duration_sec)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    userUid,
    exercise,
    difficulty,
    reps ?? 0,
    score ?? null,
    videoUrl ?? null, // 문자열 경로(S3 URL 또는 레거시 /uploads/..)
    startedAt ? new Date(startedAt) : null,
    endedAt ? new Date(endedAt) : null,
    durationSec ?? null,  // 🟡 [추가] 프론트에서 온 durationSec 저장
  ];

  try {
    const [result] = await pool.query(sql, params);
    const insertedId = result.insertId;

    // 🔹 videoUrl 이 레거시 로컬 경로(/uploads/...)일 때만 BLOB 저장 시도
    //    S3 URL(https://...) 인 경우에는 여기서 BLOB 저장 생략
    if (videoUrl && !videoUrl.startsWith("http")) {
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
    } else if (videoUrl && videoUrl.startsWith("http")) {
      console.log("ℹ️ S3 URL 기반 영상, video_blob 저장은 건너뜀:", insertedId);
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
      video_url,   -- Logs.jsx 에서 써먹는 문자열 경로 (이제 S3 URL 포함)
      started_at,
      ended_at,
      created_at,
      TIMESTAMPDIFF(SECOND, started_at, ended_at) AS duration_sec
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

// [GET] /api/workouts/logs/:id  → 운동 로그 1건 상세 조회
app.get("/api/workouts/logs/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "로그 id 가 필요합니다." });
  }

  const sql = `
  SELECT
    id,
    user_uid,
    exercise,
    difficulty,
    reps,
    score,
    video_url,
    started_at,
    ended_at,
    created_at,
    COALESCE(
      duration_sec,
      TIMESTAMPDIFF(SECOND, started_at, ended_at)
    ) AS duration_sec
  FROM workout_logs
  WHERE id = ?
`;

  try {
    const [rows] = await pool.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "해당 로그를 찾을 수 없습니다." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("운동 로그 단건 조회 오류:", err);
    res.status(500).json({ message: "서버 오류(로그 상세 조회 실패)" });
  }
});

// =======================
// 1.5) 세트 영상 업로드 라우트 (S3 버전)
// =======================
// [POST] /api/upload-video  (pushup.html 에서 form-data "video" 로 호출)
app.post("/api/upload-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "영상 파일이 없습니다." });
    }

    if (!S3_BUCKET) {
      console.error("❌ S3 버킷이 설정되어 있지 않습니다. (.env 확인)");
      return res.status(500).json({ message: "S3 설정 오류" });
    }

    const ext = path.extname(req.file.originalname) || ".webm";
    const base = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const key = `videos/${base}${ext}`; // S3 오브젝트 키

    // S3 업로드
    await s3
      .upload({
        Bucket: S3_BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype || "video/webm",
        ACL: "public-read", // 공개 URL로 바로 접근할 수 있게
      })
      .promise();

    const videoUrl = getS3ObjectUrl(key);

    console.log("🎥 S3에 업로드된 세트 영상:", {
      key,
      size: req.file.size,
      videoUrl,
    });

    return res.json({
      message: "세트 영상 업로드 완료",
      videoUrl, // 이제는 S3 URL
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
        media_url,        -- 업로드된 사진/영상 경로 (이제 S3 URL 포함)
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

// 게시글 상세 조회
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
        media_url,
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

// 게시글 작성
app.post("/api/board/write", upload.single("media"), async (req, res) => {
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

  // "1", "0", true/false 등 들어온 걸 확실하게 boolean 으로 변환
  const isSecretFlag =
    isSecret === "1" ||
    isSecret === 1 ||
    isSecret === true ||
    isSecret === "true";

  let mediaUrl = null;

  try {
    const file = req.file;

    // 첨부파일이 있으면 S3 업로드
    if (file) {
      if (!S3_BUCKET) {
        console.error("❌ S3 버킷이 설정되어 있지 않습니다. (.env 확인)");
        return res.status(500).json({ message: "S3 설정 오류(게시판 업로드)" });
      }

      const ext = path.extname(file.originalname) || "";
      const base = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const key = `board/${base}${ext || ".bin"}`;

      await s3
        .upload({
          Bucket: S3_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype || "application/octet-stream",
          ACL: "public-read",
        })
        .promise();

      mediaUrl = getS3ObjectUrl(key);
      console.log("🖼 게시판 미디어 S3 업로드 완료:", mediaUrl);
    }

    const sql = `
      INSERT INTO board
        (user_uid, nickname, role, type, title, content,
         is_secret, secret_password, video_url, media_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      userUid,
      nickname,
      role,
      type,
      title,
      content,
      isSecretFlag ? 1 : 0,
      isSecretFlag ? secretPassword || null : null,
      videoUrl || null,
      mediaUrl,
    ];

    const [result] = await pool.query(sql, params);
    res.json({ message: "게시글 저장 완료", id: result.insertId });
  } catch (err) {
    console.error("게시글 저장 오류:", err);
    res.status(500).json({ message: "서버 오류(게시글 저장)" });
  }
});

// 게시글 삭제
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
// 서버 실행
// =======================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`✅ StepUp 서버 실행 중: http://localhost:${PORT}`);
});

server.on("error", (err) => {
  console.error("🛑 서버 실행 중 오류 발생:", err);
});
