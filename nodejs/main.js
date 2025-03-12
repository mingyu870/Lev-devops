const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = 5000;

app.use(bodyParser.urlencoded({ extended: true }));

// ✅ 라우트 설정
const { router: loginRoutes } = require("./routes/login");
const serverRoutes = require("./routes/server"); 
const backupRoutes = require("./routes/backupfile");

app.use("/", loginRoutes);
app.use("/server", serverRoutes);
app.use("/backupfile", backupRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
});