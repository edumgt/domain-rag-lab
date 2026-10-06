# CI/CD 실패 복구

2026-10-02 커밋 `4ce3bfe`의 GitHub Actions 실패 로그 기준입니다.

## CI: `ModuleNotFoundError: No module named 'app'`

저장소 루트에서 `python -m pytest tests/ -v --tb=short`로 실행합니다.
`pytest` 실행 파일을 직접 호출할 때와 달리 저장소 루트가 Python 모듈 검색 경로에 포함됩니다.

## EC2 CD: `Configure SSH key` 실패

해당 실행은 `ssh-keyscan`에서 종료됐습니다. 로그만으로 호스트 설정 문제와
네트워크 접근 문제를 구분할 수 없습니다.

- GitHub 저장소 Settings → Secrets and variables → Actions에서 `EC2_HOST`가
  현재 배포 대상의 주소인지 확인합니다. 대상 정보는 `deploy/pr-edumgt/README.md`를 참고합니다.
- EC2 인스턴스 실행 상태와 보안 그룹·방화벽의 TCP 22 접근 정책을 확인합니다.
  GitHub 호스팅 러너에서 접근 가능한 경로가 필요합니다.
- `EC2_SSH_PRIVATE_KEY`에는 PEM 파일 전체 내용을 실제 줄바꿈과 함께 저장합니다.

워크플로는 필수 값과 키 형식을 검사하고 호스트 키 조회 실패 시 진단 메시지를 출력합니다.

## EC2 CD: `rsync ... delete_file ... Permission denied (13)` (exit 23)

서버의 `data/lean-workflows`(컨테이너가 root 로 생성)를 `--delete` 가 지우려다 실패한 것입니다.
`cd.yml` 은 `--exclude 'data/lean-workflows'` 와 `--filter 'protect data/'` 로 서버 데이터를 보호합니다.

## ECR 경로 제거 (2026-10-06)

`cd-ecr.yml` 과 `docker-compose.ecr.yml` 은 삭제했고 GitHub 에서 해당 워크플로는 disable 했습니다.
배포는 `cd.yml`(rsync → `deploy/pr-edumgt/compose.yml up --build`) 한 경로만 사용합니다.
`AWS_*`, `EC2_ECR_*` 시크릿은 더 이상 쓰지 않으므로 정리해도 됩니다.

시크릿 값은 로그나 이 문서에 기록하지 않습니다. 수정 커밋을 반영하고 설정을 복구한 뒤
Actions에서 실패한 워크플로를 다시 실행합니다. 기존 실행의 재실행은 기존 커밋을 사용하므로
코드 변경을 검증하려면 변경 커밋에 대한 실행이 필요합니다.
