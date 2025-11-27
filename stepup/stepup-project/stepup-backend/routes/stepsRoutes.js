// routes/stepsRoutes.js
const express = require('express');
const router = express.Router();
const { postSteps, getTodaySteps } = require('../controllers/stepsController');

// 오늘 걸음수 보내는 곳
router.post('/', postSteps);

// 오늘 걸음수 가져오는 곳 (RN에서 리로드할 때 쓰는 용도)
router.get('/:userId', getTodaySteps);

module.exports = router;
