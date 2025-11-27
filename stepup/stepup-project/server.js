// server.js
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// 미들웨어
app.use(cors());
app.use(express.json()); // JSON으로 오는 걸 읽게 해줌

// 메모리에 일단 저장 (진짜 DB 대신)
let stepLogs = [];

// 헬스체크
app.get('/', (req, res) => {
  res.send('StepUp backend is running 🚀');
});

// 걸음수 받는 API
app.post('/api/steps', (req, res) => {
  // { userId: "user1", steps: 4321 } 이런 형식으로 온다고 가정
  const { userId, steps } = req.body;
  if (!userId || steps == null) {
    return res.status(400).json({ message: 'userId 와 steps 를 주세요' });
  }

  const log = {
    userId,
    steps,
    time: new Date().toISOString(),
  };
  stepLogs.push(log);

  // 여기서 “AI 멘트” 자리만 미리 만들어둔다
  let message = '';
  if (steps < 3000) {
    message = '오늘은 가볍게 걸으셨네요. 한 바퀴만 더!';
  } else if (steps < 7000) {
    message = '좋아요! 목표의 70%쯤 왔어요 🔥';
  } else {
    message = '완전 충분! 보스전 열어드릴까요? 😎';
  }

  res.json({
    ok: true,
    received: log,
    aiMessage: message,
  });
});

// 저장된 로그 보기
app.get('/api/steps', (req, res) => {
  res.json(stepLogs);
});

app.listen(PORT, () => {
  console.log(`✅ server on http://localhost:${PORT}`);
});
