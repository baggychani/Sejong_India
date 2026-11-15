# 자료 출처

## 종교별 인구 구성 (2026-11-15 추가)

`data/content/religions.json`은 인도 Census 2011 C-01 공식 XLS의 남녀 합계 인원수에서 생성했다. 6대 종교, 기타 종교·신앙, 종교 미기재를 모두 보존한다. 원본 다운로드 URL·확인일·SHA-256과 선택한 행의 행정구역 코드를 데이터에 보존한다. 비율과 순위는 표시할 때 인원수에서 계산한다.

전국·주 자료는 https://censusindia.gov.in/nada/index.php/catalog/11361 이다. 학당·도시 자료는 Bihar(11366), Karnataka(11378), Maharashtra(11382), Manipur(11383), Tamil Nadu(11392), West Bengal(11396)의 같은 C-01 표를 사용한다.

학당 조사 지역은 기존 모어 자료의 연결 단위를 따른다. BBMP·파트나·임팔은 외곽 확장지(OG)를 포함한 합계 행을 사용하며 하위 부분 행을 더하지 않는다. 첸나이 VIT는 옛 칸치푸람 district 전체, 바라사트 학당은 Barasat-I 블록이고, 바라사트 도시와 별도다. 델리 학당은 델리 수도직할지 전체다. 현재 안드라프라데시·텔랑가나와 잠무 카슈미르·라다크에는 각각 분리 전 2011년 광역 참고치를 연결하고 이를 명시한다. 다드라 나가르하벨리 다만 디우는 2011년 두 직할지의 인원수를 합산했다.

종교 페이지 목록은 `data/content/religion-pages.json`에 직접 적는다(이름, 인구조사 분류 연결 키, 상징 그림의 이름·출처). 상징 그림은 Wikimedia Commons의 퍼블릭 도메인 파일을 PNG로 받아 `src/assets/religion-symbols/`에 두고, 모양만 마스크로 써서 종교별 색으로 칠한다. 상세 페이지의 전국 비율과 지역 분포 지도(주·연방직할지별 비율, 가장 진한 색이 그 종교의 최고 비율)는 `religions.json`에서 계산하며 따로 저장하지 않는다. 지도 상세의 종교 pill은 목록에 있는 종교만 해당 페이지로 연결한다.

재생성: 원본을 `data/cache/religion-c01-india.xls` 및 `religion-c01-<catalog-id>.xls`로 받은 뒤 `node scripts/import-religions.mjs <SheetJS 모듈 경로>`를 실행한다. 표시는 `src/site/religions.ts`에서 공통 계산하며, 전체 정적 본문은 `ReligionReference`를 지도와 종교 페이지가 공유한다. `npm run check:readable`에 종교 데이터의 합계·지역 연결·중복 집계 방지·분모·순위·정적 HTML/Markdown 검사를 연결했다.

확인 날짜는 2026-11-13이다.

## 지리 경계, 강, 지형 구역, 도시

- 자료: Natural Earth 1:10m, 버전 5.1.2
- 주소: https://www.naturalearthdata.com/ 와 https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2
- 라이선스: 퍼블릭 도메인
- 받은 파일: `ne_10m_admin_0_countries`, `ne_10m_admin_1_states_provinces`, `ne_10m_rivers_lake_centerlines`, `ne_10m_geography_regions_polys`, `ne_10m_populated_places`
- 경계 기준: Natural Earth는 실효 지배를 기준으로 그린다. 카슈미르 일대도 그 자료를 그대로 따른다.

전 세계 원본은 `data/cache/natural-earth/`에 두고, 저장소에는 넣지 않는다. `npm run data:fetch`가 다시 받는다.

`data/raw/south-asia/`는 인도·주변국·선택 강·지형만 잘라 둔 단순화 전 자료다. `data/processed/`는 웹에서 읽는 단순화본이다. `npm run data:build`가 둘 다 다시 만든다. 단순화는 mapshaper의 Visvalingam 알고리즘이다. 국토와 주 경계는 함께 단순화해 해안선과 주 경계가 어긋나지 않게 했다.

도시 좌표는 Natural Earth 주요 도시 자료의 위경도를 `data/content/cities.json`에 옮긴 것이다. 바라사트만 그 목록에 없어 OpenStreetMap Nominatim으로 시 위치를 확인했다.

산맥·고원·사막의 면은 Natural Earth 지형 구역을 인도 윤곽으로 자른 것이다. 행정 경계처럼 정확한 선이 아니다.

강 이름 `Mahäna Nadï`는 마하나디로 읽었다. `Godävari`는 고다바리, `Cauvery`는 카베리다.

히마찰프라데시는 Natural Earth의 유형 칸이 연방직할지로 잘못되어 있다. 화면의 주/연방직할지 구분은 그 칸을 따르지 않고, 2026년의 28개 주와 8개 연방직할지를 기준으로 한다.

## 세종학당

현재 목록은 세종학당재단 학당 데이터에서 국가가 인도인 항목만 골랐다.

- https://www.ksif.or.kr/ste/ksf/hkd/ajaxLocalHakdangList_v2.do
- 2026-11-13에 8곳이었다. 2026년 6월 30일 문화체육관광부 현황의 인도 일반 학당 7곳, 문화원 학당 1곳과 개수가 같다.
- 재단 목록의 위도·경도 칸은 모두 0이라 좌표로 쓰지 않았다.
- 2021년에 지정된 첸나이 힌두스탄 학당은 이 목록에 없다. 지도에 넣지 않았다.

좌표는 공식 주소를 확인한 뒤 OpenStreetMap(Photon, Nominatim)에서 같은 장소가 나오는지 대조했다. 사용 조건은 ODbL이다.

| 학당 | 점의 의미 |
| --- | --- |
| 델리 문화원 | 주소는 25A Ring Road, Lajpat Nagar IV. 건물 좌표는 확인하지 못해 라지파트 나가르 4구역으로만 표시. 빈 마름모. |
| 첸나이 인코 | Adyar Club Gate Road. 18번지 출입구가 아니라 그 도로. |
| 첸나이 VIT | 재단 주소의 Admin block에 해당하는 건물. 603호는 아님. 2026년 신규 지정. |
| 바라사트 | 웨스트벵골주립대학교 캠퍼스. 위키백과 좌표. 강의동 4층은 학당 사이트에 적혀 있다. |
| 임팔 | 주소는 DM College of Arts. 지도 자료에는 같은 캠퍼스의 Science 대학만 있어 그 점을 썼다. |
| 푸네 | 재단 주소의 Mitcon International School, 우편번호 411045. MIMA 2층 강의실 자체는 아님. |
| 벵갈루루 | 치카 바나스와디 도로, 우편번호 560043. 5번지는 확인하지 못했다. 레이크사이드 캠퍼스와 다르다. |
| 파트나 | 재단 주소칸은 델리 문화원이다. 운영기관인 A.N. College 캠퍼스를 점으로 했다. |

각 항목의 문장과 링크는 `data/content/institutes.json`에 있다.
