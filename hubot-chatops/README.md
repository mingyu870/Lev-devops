# Hubot과 Slack Webhook URL을 이용한 ChatOps 구성

## 개요
Hubot과 Slack Webhook URL을 활용하여 효율적인 **ChatOps 환경**을 구성합니다. 이를 통해 개발 및 운영 작업을 자동화하고, Slack 채널에서 실시간으로 작업 상태를 모니터링하고 공유할 수 있습니다.

---

## 시스템 요구 사항
- **Node.js**: v18.20.6
- **npm**: v10.8.2
- **nvm**: v0.39.3

---

📂 프로젝트 디렉토리 구조

index.js  
├── 📄 kube.js      : Kubernetes 클러스터 조회 및 관리 (kubectl 명령어 활용)  
├── 📄 jenkins.js   : Jenkins 서비스 목록 호출 및 빌드 실행  
└── 📄 argocd.js    : ArgoCD 서비스 목록 호출 및 배포 실행

### 파일 설명
- **index.js**  
  메인 엔트리 포인트로, Hubot의 초기화 및 주요 모듈을 로드합니다.

- **kube.js**  
  Kubernetes 클러스터 정보를 조회하고 관리 작업을 수행합니다.  
  예: `kubectl get pods`, `kubectl describe` 등의 명령어 실행.

- **jenkins.js**  
  Jenkins API를 호출하여 서비스 목록을 가져오거나 특정 Job의 빌드를 트리거합니다.  
  예: `curl` 명령어를 통해 Jenkins REST API와 통신.

- **argocd.js**  
  ArgoCD API를 활용하여 애플리케이션 배포 상태를 조회하거나 새로운 배포를 실행합니다.  
  예: `argocd app list`, `argocd app sync` 명령어 실행.

---

이 디렉토리 구조는 각각의 파일이 독립적인 역할을 수행하며, ChatOps 환경에서 다양한 DevOps 작업을 자동화하는 데 사용됩니다.

