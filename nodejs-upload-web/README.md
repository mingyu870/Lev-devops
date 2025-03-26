# 프로젝트 이름

이 프로젝트는 간단한 Node.js 기반의 웹 애플리케이션으로, 사용자 인증 및 서버 관리 기능을 제공합니다. 

---

## **프로젝트 구조**

📂 프로젝트 디렉토리 구조

### 디렉토리 내역 
web-upload/
│
├── app.js                          # 서버 실행 
├── src         
│   ├── db 
│   │   └── users.json              # 유저 
│   ├── middleware
│   │   └── auth-middleware.js      # 세션기반
│   └── routes
│       ├── users.json              # 로그인 유저 조회
│       ├── login-router.js         # 로그인
│       ├── logout-router.js        # 로그아웃
│       ├── main.js                 # 로그인 페이지
│       ├── check-login-router.js   # 로그인 세션 유지
│       ├── upload.js               # upload 페이지
│       ├── backupfile.js           # 백업파일 리스트
│       └── user-router.js          #
└── package.json  

---

## **파일 설명**

### **1. main.js**
- **역할**: 애플리케이션의 시작점으로, 서버를 초기화하고 필요한 모듈을 로드합니다.
- **주요 기능**:
  - `server.js`를 호출하여 서버를 실행.
  - 환경 변수 및 기본 설정 초기화.

### **2. login.js**
- **역할**: 사용자 인증과 관련된 로직을 처리합니다.
- **주요 기능**:
  - 로그인 요청 처리 (예: 사용자 ID와 비밀번호 검증).
  - 토큰 발급 또는 세션 관리.
  - 인증 실패 시 에러 반환.

### **3. server.js**
- **역할**: HTTP 서버를 생성하고 라우팅을 관리합니다.
- **주요 기능**:
  - Express 또는 HTTP 모듈을 사용하여 서버 생성.
  - `/login`과 같은 엔드포인트 정의.
  - 요청에 따라 적절한 컨트롤러(`login.js` 등) 호출.

---

참고 세션베이스 & JWT
https://github.com/NamJongtae/nodejs/blob/main/%EC%B6%94%EA%B0%80%EC%9E%90%EB%A3%8C/Session%20%EB%A1%9C%EA%B7%B8%EC%9D%B8.md