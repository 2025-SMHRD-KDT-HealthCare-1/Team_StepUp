// server/routes/boardRouter.js
const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authMiddleware = require("../middlewares/authMiddleware");

// [GET] /api/board/list?type=suggestion ─ 목록
router.get("/list", async (req, res) => {
  const { type } = req.query;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM board WHERE board_type = ? ORDER BY created_at DESC",
      [type || "suggestion"]
    );
    res.json(rows);
  } catch (err) {
    console.error("board list error:", err);
    res.status(500).json({ message: "목록 조회 오류" });
  }
});

// [POST] /api/board/write ─ 글쓰기
router.post("/write", authMiddleware, async (req, res) => {
  const {
    board_type,
    board_title,
    board_content,
    author_uid,
    author_name,
    author_role,
    is_secret,
    secret_password,
    video_url,
  } = req.body;

  if (!board_title || !board_content) {
    return res
      .status(400)
      .json({ message: "제목과 내용을 모두 입력해 주세요." });
  }

  try {
    const sql = `
      INSERT INTO board (
        board_type, board_title, board_content,
        author_uid, author_name, author_role,
        is_secret, secret_password, video_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(sql, [
      board_type || "suggestion",
      board_title,
      board_content,
      author_uid || "",
      author_name || "",
      author_role || "user",
      is_secret ? 1 : 0,
      secret_password || null,
      video_url || null,
    ]);

    res.json({ message: "ok", id: result.insertId });
  } catch (err) {
    console.error("board write error:", err);
    res.status(500).json({ message: "작성 오류" });
  }
});

// [GET] /api/board/:id ─ 상세
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query("SELECT * FROM board WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "게시글이 없습니다." });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("board detail error:", err);
    res.status(500).json({ message: "상세 조회 오류" });
  }
});

// [DELETE] /api/board/:id ─ 삭제
router.delete("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM board WHERE id = ?", [id]);
    res.json({ message: "deleted" });
  } catch (err) {
    console.error("board delete error:", err);
    res.status(500).json({ message: "삭제 오류" });
  }
});

module.exports = router;
