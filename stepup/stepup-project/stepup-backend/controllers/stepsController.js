// controllers/stepsController.js
const { makeCoachingMessage } = require('../services/aiService');

// 임시 저장용 (진짜면 DB 씀)
const stepStore = {}; 
// 예시: { "smhrd01": { steps: 3500, goal: 5000, updatedAt: "..." } }

exports.postSteps = (req, res) => {
  const { userId, steps, goal } = req.body;

  if (!userId || typeof steps !== 'number') {
    return res.status(400).json({ ok: false, message: 'userId와 steps가 필요합니다.' });
  }

  // goal이 안 오면 기본 5000으로
  const userGoal = goal || 5000;

  // 저장
  stepStore[userId] = {
    steps,
    goal: userGoal,
    updatedAt: new Date().toISOString()
  };

  // AI 멘트 생성
  const message = makeCoachingMessage(steps, userGoal);

  return res.json({
    ok: true,
    data: stepStore[userId],
    aiMessage: message
  });
};

exports.getTodaySteps = (req, res) => {
  const { userId } = req.params;
  const data = stepStore[userId];

  if (!data) {
    return res.json({ ok: true, data: null, message: '아직 오늘 기록이 없어요.' });
  }

  return res.json({ ok: true, data });
};
