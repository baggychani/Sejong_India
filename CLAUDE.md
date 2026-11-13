# 세종학당 인도 가보기 프로젝트

Vite + React 개인 사이트. `npm run dev` (포트 5173), `npm run build` 로 타입 체크와 빌드.

## 서재에 책 추가하기

사용자가 표지 이미지를 주면:

1. slug 를 정한다 (영문 소문자·숫자·하이픈, 예: `korean-grammar-education`).
2. 표지를 넣는다. 줄인 JPEG 를 `content/library/covers/<slug>.jpg` 로 저장하고 책등 색을 출력한다.
   `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/add-book-cover.ps1 -Image <이미지 경로> -Slug <slug>`
3. `content/library/<slug>.md` 를 만든다. 제목·저자는 표지에서 읽고, 확인한 정보만 적는다. 쪽수, 독서 상태와 완독일은 생략할 수 있다. 표지 진열만 원하면 `pose: 표지`를 사용한다.

```md
---
title: 책 제목
author: 저자
cover: <slug>.jpg
spine: "#44554a"
pages: 320
pose: 표지
---

독서 메모 (책 페이지 본문)
```

필드 설명은 `src/library/books.ts` 맨 위 주석에 있다.
