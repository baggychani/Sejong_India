// 세종학당 파견 교원 면접에서 쓰는 교안 양식. 화면과 검사가 같은 원본을 쓴다.
export const lessonPlanForm = {
  slug: "plan-form",
  title: "교안 양식",
  source: "세종학당재단 공고 제2026-34호 붙임 「교안 양식(참고용)」",
  header: [
    { label: "권/과", value: "" },
    { label: "수업 시간", value: "1시수(50분)" },
    { label: "수험번호", value: "" },
  ],
  rows: ["학습 목표", "학습 내용"],
  materials: { label: "준비물", who: ["교사", "학습자"] },
  columns: ["단계", "학습 내용 및 활동", "학습 자료", "시간", "유의점"],
  stages: ["도입", "제시 및 설명", "연습", "활용/사용", "마무리"],
};
