const express = require("express");
const router = express.Router();

// 기본 경로에서 로그인 화면 표시
router.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>test upload 로그인</title>
        <style>
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #000;
            color: white;
            font-family: Arial, sans-serif;
          }
          .login-container {
            background: #222;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0px 0px 15px rgba(255, 255, 255, 0.2);
            text-align: center;
            width: 300px;
          }
          input {
            width: 100%;
            padding: 10px;
            margin: 8px 0;
            border: none;
            border-radius: 5px;
            background: #333;
            color: white;
          }
          input::placeholder {
            color: #bbb;
          }
          input[type="submit"] {
            background-color: #007bff;
            color: white;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            border: none;
            transition: 0.3s;
          }
          input[type="submit"]:hover {
            background-color: #0056b3;
          }
          h2 {
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="login-container">
          <h2>test upload 로그인</h2>
          <form action="/login" method="post">
            <label>아이디: <input type="text" name="username" placeholder="아이디 입력" required></label><br>
            <label>비밀번호: <input type="password" name="password" placeholder="비밀번호 입력" required></label><br>
            <input type="submit" value="로그인">
          </form>
        </div>
      </body>
    </html>
  `);
});

// ✅ router만 내보내기
module.exports = router;