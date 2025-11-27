// services/aiService.js

// 진짜 LLM은 아직 안 쓰고, 규칙 기반으로라도 “AI같이” 말하게
exports.makeCoachingMessage = (steps, goal) => {
  const percent = Math.floor((steps / goal) * 100);

  if (percent >= 100) {
    return `오늘 목표 ${goal}보폭 다 채웠어요! 내일은 조금 늘려볼까요? 🏆`;
  } else if (percent >= 70) {
    return `거의 다 왔어요! ${goal - steps}보폭만 더 걸어보죠 💪`;
  } else if (percent >= 40) {
    return `좋아요, 절반은 넘었어요. 집에 가기 전에 한 번 더 걸어볼까요? 🚶`;
  } else {
    return `시작이 제일 어려워요. 지금 ${steps}보폭인데, 짧게 5분만 더 걸어봅시다! 🔥`;
  }
};
