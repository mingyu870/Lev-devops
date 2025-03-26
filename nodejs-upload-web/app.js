const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bodyParser = require("body-parser");


const mainRouter = require("./src/routes/main"); 
const uploadRouter = require("./src/routes/upload");
const loginRouter = require("./src/routes/login-router");
const logoutRouter = require("./src/routes/logout-router");
const userRouter = require("./src/routes/user-router");
const checkLoginRouter = require("./src/routes/check-login-router");
const backupRouter = require("./src/routes/backupfile");

const {
  isAuthenticated, // 인증된 사용자만 접근 가능한 미들웨어
  isNotAuthenticated, // 인증되지 않은 사용자만 접근 가능한 미들웨어
} = require("./src/middleware/auth-middleware");

const app = express();
const PORT = 6660;

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정
app.use(
  session({
    secret: "mysecretkey", // 세션 암호화를 위한 비밀키 (필수)
    resave: false, // 세션을 변경하지 않는 한 매 요청마다 다시 저장하지 않음
    saveUninitialized: false, // 초기화되지 않은 세션도 저장 (로그인하지 않아도 세션 생성 가능)
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 쿠키 유효기간: 24시간
      secure: false, // HTTPS 환경에서만 쿠키 전송, 여기서는 HTTP이므로 false로 설정
      httpOnly: true, // 브라우저의 JavaScript로 쿠키에 접근하지 못하도록 설정
    },
  })
);

// 라우터 설정
app.use("/", mainRouter);
app.use("/upload", isAuthenticated, uploadRouter);
app.use("/login", isNotAuthenticated, loginRouter); // 로그인되지 않은 사용자만 /login 경로 접근 허용
app.use("/logout", logoutRouter); // 로그아웃
app.use("/user", isAuthenticated, userRouter); // 유저 조회
app.use("/check-login", checkLoginRouter); // 로그인 확인 => 클라이언트 측에서 로그인 상태를 확인하고 접근 설정을 위해
app.use("/backupfile", isAuthenticated, backupRouter);


// 에러 처리 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something wrong!");
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`); // 서버가 정상적으로 실행되었을 때 콘솔에 출력
});