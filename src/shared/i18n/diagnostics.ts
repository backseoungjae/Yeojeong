export const diagnosticsMessages = {
  ko: {
    title: 'Phase 0 · TourAPI 검증', errorSummary: '{reason} · 코드/HTTP {code}', languageLabel: '{label}: {language}', language: '화면 언어', ko: '한국어', en: 'English',
    intro: '개발용 화면입니다. 실행 시 두 언어에서 최대 38회의 API 요청을 순차 실행합니다. 자동 재시도는 없습니다. 인증·할당량·통신 오류 이후에는 해당 언어의 남은 요청을 건너뜁니다.',
    configured: '키 설정 있음 · 인증 성공 여부는 호출로 확인', missing: '키 설정 없음 또는 형식 오류',
    run: '실제 API 검증 실행', cancel: '요청 취소', running: '실제 API 검증 중', idle: '아직 실행하지 않았습니다.', finished: '검증 종료 · 각 결과를 확인하세요.', cancelled: '검증을 취소했습니다.', failed: '검증을 완료하지 못했습니다. 설정·네트워크를 확인하고 다시 실행하세요.',
    summary: '수신 {received} / 전체 {total} · HTTP {status} · API {code}',
    ok: '응답 성공', empty: '빈 결과', error: '실패', skipped: '미실행',
    fields: '응답 필드', evidence: '검증 데이터', images: 'HTTPS 이미지 표본',
    image: '{name}의 TourAPI 사진 · {source}', imageLoading: '이미지 로딩 중', imageLoaded: '현재 환경에서 이미지 로딩 성공', imageFailed: '이미지 로딩 실패', imageMissing: '사용 가능한 HTTPS 이미지가 없습니다.',
    manual: '미확인: 실제 iOS·Android의 이미지, 큰 글씨, VoiceOver·TalkBack, 계정 할당량. 같은 장소의 번역 연결과 유형별 신분류 대응은 보장하지 않습니다. 공공데이터포털의 활용신청 상세에서 실제 할당량·사용량을 확인하세요. 기기에서 실행 후 사진의 성공·실패 상태를 확인하세요. 웹 결과는 네이티브 결과와 별도로 기록하세요.',
    configuration: '환경변수 설정 오류', parameters: '요청값 오류', network: '네트워크 연결 오류', timeout: '요청 시간 초과', http: 'HTTP 오류', authentication: '인증·권한 오류', quota: '호출 제한 오류', api: 'API 처리 오류', format: '응답 형식 오류',
  },
  en: {
    title: 'Phase 0 · TourAPI diagnostics', errorSummary: '{reason} · code/HTTP {code}', languageLabel: '{label}: {language}', language: 'Screen language', ko: '한국어', en: 'English',
    intro: 'Development screen. Runs up to 38 API requests sequentially across both languages. No automatic retries. Remaining requests for a language are skipped after configuration, authentication, quota or connection failures.',
    configured: 'Key configured · authentication requires a request', missing: 'Key missing or invalid format',
    run: 'Run live API checks', cancel: 'Cancel requests', running: 'Live API checks in progress', idle: 'Not run yet.', finished: 'Checks finished · review individual results.', cancelled: 'Checks cancelled.', failed: 'Checks did not finish. Verify configuration and connectivity, then run again.',
    summary: 'Received {received} / total {total} · HTTP {status} · API {code}',
    ok: 'Response succeeded', empty: 'Empty result', error: 'Failed', skipped: 'Not run',
    fields: 'Response fields', evidence: 'Diagnostic data', images: 'HTTPS image samples',
    image: 'TourAPI photo of {name} · {source}', imageLoading: 'Loading image', imageLoaded: 'Image loaded in the current environment', imageFailed: 'Image failed to load', imageMissing: 'No usable HTTPS image.',
    manual: 'Unverified: images on physical iOS and Android devices, large text, VoiceOver and TalkBack, and account quota. Translation links and type-to-classification mappings are not guaranteed. Check actual quota and usage in your data.go.kr application details. Run on a device and inspect image success or failure. Record web results separately from native results.',
    configuration: 'Environment configuration error', parameters: 'Invalid request parameters', network: 'Network connection error', timeout: 'Request timed out', http: 'HTTP error', authentication: 'Authentication or permission error', quota: 'Request limit error', api: 'API processing error', format: 'Invalid response format',
  },
} as const;
export function interpolate(message: string, values: Record<string, string | number>): string {
  return message.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}
export function formatDiagnosticNumber(value: number, language: 'ko' | 'en') {
  return new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US').format(value);
}

const checkLabels: Record<string, { ko: string; en: string }> = {
  attraction: { ko: '관광지 목록', en: 'Attraction list' }, culture: { ko: '문화시설 목록', en: 'Culture list' }, restaurant: { ko: '음식점 목록', en: 'Restaurant list' },
  regions: { ko: '법정동 시·도', en: 'Province codes' }, districts: { ko: '서울 시·군·구', en: 'Seoul district codes' }, classifications: { ko: '신분류 코드', en: 'Classification codes' },
  search: { ko: '키워드 검색', en: 'Keyword search' }, searchFiltered: { ko: '검색 + 신분류', en: 'Search with classification' }, searchControl: { ko: '다른 신분류 대조', en: 'Other classification control' }, noResults: { ko: '존재하지 않는 검색어', en: 'Nonexistent keyword' },
  attractionCommon: { ko: '관광지 기본 상세', en: 'Attraction details' }, attractionIntro: { ko: '관광지 이용 정보', en: 'Attraction visitor information' }, attractionImages: { ko: '관광지 사진', en: 'Attraction images' },
  cultureCommon: { ko: '문화시설 기본 상세', en: 'Culture details' }, cultureIntro: { ko: '문화시설 이용 정보', en: 'Culture visitor information' }, cultureImages: { ko: '문화시설 사진', en: 'Culture images' },
  restaurantCommon: { ko: '음식점 기본 상세', en: 'Restaurant details' }, restaurantIntro: { ko: '음식점 이용 정보', en: 'Restaurant visitor information' }, restaurantImages: { ko: '음식점 사진', en: 'Restaurant images' },
};
export function diagnosticCheckLabel(check: string, language: 'ko' | 'en') { return checkLabels[check]?.[language] ?? check; }
