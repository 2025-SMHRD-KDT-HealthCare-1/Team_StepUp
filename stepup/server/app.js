// server/app.js

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

// 업로드/파일 처리용
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;
const multer = require("multer");

// S3 사용을 위한 aws-sdk
const AWS = require("aws-sdk");

// Stripe 결제
const Stripe = require("stripe");

dotenv.config();

const app = express();

// =======================
// AWS S3 설정
// =======================
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_REGION,
});

const s3 = new AWS.S3();
const S3_BUCKET = process.env.AWS_S3_BUCKET;

// S3 Object URL 생성 헬퍼
function getS3ObjectUrl(key) {
  if (process.env.AWS_S3_PUBLIC_URL_BASE) {
    return `${process.env.AWS_S3_PUBLIC_URL_BASE}/${key}`;
  }
  return `https://${S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`;
}

// =======================
// 공통 미들웨어
// =======================

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
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// multer: 메모리 버퍼로만 받고 S3 업로드
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

// [POST] /api/workouts/log
//  - 세트 시작: startedAt 만 담아서 호출 → 새 row INSERT
//  - 세트 종료 요약: reps/score/피드백 담아서 호출 → 마지막 미완료 row UPDATE
//  - 세트 영상 업로드 완료: videoUrl/endedAt 담아서 호출 → 같은 row UPDATE
app.post("/api/workouts/log", async (req, res) => {
  const {
    userUid,
    exercise,
    difficulty,
    reps,
    score,
    startedAt, // ISO 문자열
    endedAt,
    videoUrl, // S3 URL 또는 레거시 /uploads/xxx.webm
    // Pose.jsx 에서 넘어오는 세트 요약 텍스트
    feedbackMain,
    feedbackDetail,
  } = req.body;

  if (!userUid || !exercise || !difficulty) {
    return res
      .status(400)
      .json({ message: "userUid, exercise, difficulty 는 필수입니다." });
  }

  try {
    // startedAt 없이 들어오면서(=중간/마무리 호출)
    // score 나 videoUrl, endedAt, 피드백이 있는 경우 → 직전 미완료 세트 UPDATE 시도
    const shouldTryUpdate =
      !startedAt &&
      (score !== undefined ||
        videoUrl !== undefined ||
        endedAt ||
        feedbackMain !== undefined ||
        feedbackDetail !== undefined);

    if (shouldTryUpdate) {
      const [rows] = await pool.query(
        `
        SELECT id, started_at, ended_at
        FROM workout_logs
        WHERE user_uid = ?
          AND exercise = ?
          AND difficulty = ?
        ORDER BY created_at DESC
        LIMIT 1
      `,
        [userUid, exercise, difficulty]
      );

      if (rows.length > 0 && rows[0].ended_at == null) {
        const targetId = rows[0].id;

        // NULL 이 아니게 넘어온 값만 덮어쓰고, 나머지는 기존 값 유지
        await pool.query(
          `
          UPDATE workout_logs
          SET
            reps           = COALESCE(?, reps),
            score          = COALESCE(?, score),
            video_url      = COALESCE(?, video_url),
            started_at     = COALESCE(?, started_at),
            ended_at       = COALESCE(?, ended_at),
            feedback_main  = COALESCE(?, feedback_main),
            feedback_detail= COALESCE(?, feedback_detail)
          WHERE id = ?
        `,
          [
            reps ?? null,
            score ?? null,
            videoUrl ?? null,
            startedAt ? new Date(startedAt) : null,
            endedAt ? new Date(endedAt) : null,
            feedbackMain ?? null,
            feedbackDetail ?? null,
            targetId,
          ]
        );

        // 레거시 로컬 파일일 때만 BLOB 갱신 시도
        if (videoUrl && !videoUrl.startsWith("http")) {
          try {
            const relativePath = videoUrl.startsWith("/")
              ? "." + videoUrl
              : videoUrl;
            const filePath = path.join(__dirname, relativePath);
            const fileData = await fsPromises.readFile(filePath);

            await pool.query(
              "UPDATE workout_logs SET video_blob = ? WHERE id = ?",
              [fileData, targetId]
            );

            console.log("(UPDATE) 영상 BLOB까지 저장 완료:", targetId);
          } catch (blobErr) {
            console.error(
              "(UPDATE) 영상 BLOB 저장 실패(경로/파일 문제일 수 있음):",
              blobErr
            );
          }
        } else if (videoUrl && videoUrl.startsWith("http")) {
          console.log(
            "(UPDATE) S3 URL 기반 영상, video_blob 저장은 건너뜀:",
            targetId
          );
        }

        return res.json({
          message: "운동 로그 업데이트 완료",
          id: targetId,
          mode: "update",
        });
      }
      // 직전 세트를 못 찾았으면 아래 INSERT 로 새로 저장
    }

    // 일반 INSERT (세트 시작 또는 예외적인 케이스)
    const insertSql = `
      INSERT INTO workout_logs
        (user_uid, exercise, difficulty,
         reps, score, video_url,
         started_at, ended_at,
         feedback_main, feedback_detail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertParams = [
      userUid,
      exercise,
      difficulty,
      reps ?? 0,
      score ?? null,
      videoUrl ?? null,
      startedAt ? new Date(startedAt) : null,
      endedAt ? new Date(endedAt) : null,
      feedbackMain ?? null,
      feedbackDetail ?? null,
    ];

    const [result] = await pool.query(insertSql, insertParams);
    const insertedId = result.insertId;

    // 레거시 로컬 파일에 대해서만 BLOB 저장
    if (videoUrl && !videoUrl.startsWith("http")) {
      try {
        const relativePath = videoUrl.startsWith("/") ? "." + videoUrl : videoUrl;
        const filePath = path.join(__dirname, relativePath);
        const fileData = await fsPromises.readFile(filePath);

        await pool.query(
          "UPDATE workout_logs SET video_blob = ? WHERE id = ?",
          [fileData, insertedId]
        );

        console.log("(INSERT) 영상 BLOB까지 저장 완료:", insertedId);
      } catch (blobErr) {
        console.error(
          "(INSERT) 영상 BLOB 저장 실패(경로/파일 문제일 수 있음):",
          blobErr
        );
      }
    } else if (videoUrl && videoUrl.startsWith("http")) {
      console.log(
        "(INSERT) S3 URL 기반 영상, video_blob 저장은 건너뜀:",
        insertedId
      );
    }

    res.json({ message: "운동 로그 저장 완료", id: insertedId, mode: "insert" });
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
      video_url,
      started_at,
      ended_at,
      created_at,
      feedback_main,
      feedback_detail,
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

// [GET] /api/workouts/logs/:id
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
      feedback_main,
      feedback_detail,
      TIMESTAMPDIFF(SECOND, started_at, ended_at) AS duration_sec
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
app.post("/api/upload-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "영상 파일이 없습니다." });
    }

    if (!S3_BUCKET) {
      console.error("S3 버킷이 설정되어 있지 않습니다. (.env 확인)");
      return res.status(500).json({ message: "S3 설정 오류" });
    }

    const ext = path.extname(req.file.originalname) || ".webm";
    const base = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const key = `videos/${base}${ext}`;

    await s3
      .upload({
        Bucket: S3_BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype || "video/webm",
        ACL: "public-read",
      })
      .promise();

    const videoUrl = getS3ObjectUrl(key);

    console.log("S3에 업로드된 세트 영상:", {
      key,
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
// 2) 게시판 라우트
// =======================

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
        secret_password,
        video_url,
        media_url,
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
    type,
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

  const isSecretFlag =
    isSecret === "1" ||
    isSecret === 1 ||
    isSecret === true ||
    isSecret === "true";

  let mediaUrl = null;

  try {
    const file = req.file;

    if (file) {
      if (!S3_BUCKET) {
        console.error("S3 버킷이 설정되어 있지 않습니다. (.env 확인)");
        return res
          .status(500)
          .json({ message: "S3 설정 오류(게시판 업로드)" });
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
      console.log("게시판 미디어 S3 업로드 완료:", mediaUrl);
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

// 게시글 수정
app.put("/api/board/:id", upload.single("media"), async (req, res) => {
  const { id } = req.params;
  const {
    board_title,
    board_content,
    is_secret,
    secret_password,
    video_url,
    deleteMedia,
  } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT media_url FROM board WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "존재하지 않는 게시글입니다." });
    }

    let currentMediaUrl = rows[0].media_url;
    let deleteOldFromS3 = false;

    const isSecretFlag =
      is_secret === "1" ||
      is_secret === 1 ||
      is_secret === true ||
      is_secret === "true";

    const finalSecretPassword = isSecretFlag ? secret_password || null : null;

    if (deleteMedia === "1") {
      if (currentMediaUrl?.startsWith("http")) {
        deleteOldFromS3 = true;
      }
      currentMediaUrl = null;
    }

    if (req.file) {
      if (currentMediaUrl?.startsWith("http")) {
        deleteOldFromS3 = true;
      }

      const ext = path.extname(req.file.originalname) || "";
      const base = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const key = `board/${base}${ext || ".bin"}`;

      await s3
        .upload({
          Bucket: S3_BUCKET,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype || "application/octet-stream",
          ACL: "public-read",
        })
        .promise();

      currentMediaUrl = getS3ObjectUrl(key);
    }

    if (deleteOldFromS3 && rows[0].media_url?.startsWith("http")) {
      try {
        const key = rows[0].media_url.split(".amazonaws.com/")[1];
        await s3.deleteObject({ Bucket: S3_BUCKET, Key: key }).promise();
      } catch (err) {
        console.log("기존 이미지 삭제 실패(무시):", err);
      }
    }

    const sql = `
      UPDATE board
      SET 
        title = ?, 
        content = ?, 
        is_secret = ?, 
        secret_password = ?, 
        video_url = ?, 
        media_url = ?, 
        updated_at = NOW()
      WHERE id = ?
    `;

    const params = [
      board_title,
      board_content,
      isSecretFlag ? 1 : 0,
      finalSecretPassword,
      video_url || null,
      currentMediaUrl,
      id,
    ];

    await pool.query(sql, params);

    res.json({
      message: "게시글 수정 완료",
      media_url: currentMediaUrl,
    });
  } catch (err) {
    console.error("게시글 수정 오류:", err);
    res.status(500).json({ message: "게시글 수정 실패" });
  }
});

// 게시글 삭제
app.delete("/api/board/:id", async (req, res) => {
  const { id } = req.params;
  const { userUid, role } = req.body;

  if (!id || !userUid) {
    return res.status(400).json({ message: "id, userUid 가 필요합니다." });
  }

  try {
    let sql = `
      DELETE FROM board
      WHERE id = ?
    `;
    const params = [id];

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
  const { userUid, nickname, role, content } = req.body;

  if (!userUid || !content) {
    return res.status(400).json({ message: "댓글 내용이 필요합니다." });
  }

  try {
    await pool.query(
      "INSERT INTO board_comments (board_id, user_uid, nickname, role, content) VALUES (?, ?, ?, ?, ?)",
      [id, userUid, nickname, role, content]
    );
    res.json({ message: "댓글 등록 완료" });
  } catch (err) {
    console.error("댓글 저장 오류:", err);
    res.status(500).json({ message: "댓글 저장 실패" });
  }
});

// 댓글 수정
app.put("/api/board/:postId/comment/:commentId", async (req, res) => {
  const { postId, commentId } = req.params;
  const { userUid, role, content } = req.body;

  if (!userUid) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ message: "댓글 내용을 입력해주세요." });
  }

  try {
    // 파라미터 개수: commentId 한 개만 사용
    const [rows] = await pool.query(
      "SELECT user_uid FROM board_comments WHERE id = ?",
      [commentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "존재하지 않는 댓글입니다." });
    }

    const comment = rows[0];

    const isOwner = comment.user_uid === userUid;
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "본인 댓글 또는 관리자만 수정할 수 있습니다." });
    }

    await pool.query(
      "UPDATE board_comments SET content = ? WHERE id = ?",
      [content.trim(), commentId]
    );

    return res.json({ message: "댓글이 수정되었습니다." });
  } catch (err) {
    console.error("댓글 수정 오류:", err);
    return res
      .status(500)
      .json({ message: "댓글 수정 중 오류가 발생했습니다." });
  }
});

// 댓글 삭제
app.delete("/api/board/:postId/comment/:commentId", async (req, res) => {
  const { postId, commentId } = req.params;
  const { userUid, role } = req.body;

  if (!userUid) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    // 파라미터 개수: commentId 한 개만 사용
    const [rows] = await pool.query(
      "SELECT user_uid FROM board_comments WHERE id = ?",
      [commentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "존재하지 않는 댓글입니다." });
    }

    const comment = rows[0];

    const isOwner = comment.user_uid === userUid;
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "본인 댓글 또는 관리자만 삭제할 수 있습니다." });
    }

    await pool.query("DELETE FROM board_comments WHERE id = ?", [commentId]);

    return res.json({ message: "댓글이 삭제되었습니다." });
  } catch (err) {
    console.error("댓글 삭제 오류:", err);
    return res
      .status(500)
      .json({ message: "댓글 삭제 중 오류가 발생했습니다." });
  }
});

// =======================
// 3) Stripe 결제 라우트
// =======================
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

console.log("env check:", {
  secret: process.env.STRIPE_SECRET_KEY,
  price: process.env.STRIPE_PREMIUM_PRICE_ID,
});

app.post("/api/pay/create-checkout-session", async (req, res) => {
  console.log("/api/pay/create-checkout-session body:", req.body);

  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      console.log("userId 또는 email 누락:", { userId, email });
      return res
        .status(400)
        .json({ message: "userId와 email이 필요합니다." });
    }

    console.log("Stripe 세션 생성 시도:", {
      userId,
      email,
      priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: {
        userUid: userId,
      },
      success_url:
        "http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:5173/payment-cancel",
    });

    console.log("Stripe 세션 생성 성공:", session.id);

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe 세션 생성 오류(app.js):", err);
    return res
      .status(500)
      .json({ message: "결제 세션 생성 실패", error: err.message });
  }
});

app.get("/api/pay/confirm", async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ message: "session_id 가 필요합니다." });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "결제가 완료되지 않았습니다." });
    }

    const userUid = session.metadata?.userUid;
    if (!userUid) {
      return res.status(400).json({ message: "userUid 메타데이터 없음" });
    }

    await pool.query(
      `
      INSERT INTO users (user_uid, plan)
      VALUES (?, 'premium')
      ON DUPLICATE KEY UPDATE plan = 'premium', updated_at = CURRENT_TIMESTAMP
      `,
      [userUid]
    );

    res.json({ message: "결제 성공, premium 전환 완료", plan: "premium" });
  } catch (err) {
    console.error("결제 확인 오류:", err);
    res.status(500).json({ message: "결제 확인 실패" });
  }
});

// DELETE 운동 기록
app.post("/api/workouts/delete", async (req, res) => {
  const { id } = req.body;

  if (!id) return res.status(400).json({ message: "ID가 필요합니다." });

  try {
    const sql = "DELETE FROM workout_logs WHERE id = ?";
    const [result] = await pool.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "삭제할 기록이 없습니다." });
    }

    res.json({ message: "삭제 완료" });
  } catch (err) {
    console.error("운동 기록 삭제 오류:", err);
    res.status(500).json({ message: "삭제 실패" });
  }
});

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
