// server.js
const express = require('express');
const cors = require('cors');
const stepsRoutes = require('./routes/stepsRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json()); // JSON 받기

// 라우트 연결
app.use('/api/steps', stepsRoutes);

app.get('/', (req, res) => {
  res.send('STEP UP backend running ✅');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
