/* ═══════════════════════════════════════════════
   제도 규칙 데이터베이스
   각 항목: n(이름) amt(금액) f(판정 함수) doc(필요 서류) where(신청처) visit(방문 유형)
   판정 결과: OK 가능 / NO 불가 / LOST 놓침 / CHK 확인 필요
   ═══════════════════════════════════════════════ */

const OK=(amt,why,odds,rate)=>({s:'ok',amt,why,odds:odds||70,rate:rate||'요건 충족 시'});
const NO=why=>({s:'no',why});
const LOST=(amt,why)=>({s:'lost',amt,why});
const CHK=(amt,why)=>({s:'chk',amt,why});

const SECTORS=[
{k:'house', n:'주거', items:[
  {n:'청년월세 특별지원', where:'복지로 · 주민센터', visit:'online',
   f:c=> !c.home.rent ? NO('임차 중이 아닙니다')
    : c.age>34 ? NO(`만 ${c.age}세 · 기준 34세 이하`)
    : c.home.incomeRate>60 ? NO(`본인 소득 중위 ${c.home.incomeRate}% · 기준 60% 이하`)
    : c.home.deposit>5000 ? NO(`보증금 ${c.home.deposit.toLocaleString()}만 · 기준 5,000만 이하`)
    : OK('월 20만 · 12개월','무주택 · 소득과 보증금 요건 충족',62,'예산 범위')},
  {n:'서울시 청년월세 지원', where:'서울주거포털', visit:'online',
   f:c=> !c.region.startsWith('서울') ? NO(`${c.region} 거주 · 서울시 사업입니다`)
    : c.age>39 ? NO(`만 ${c.age}세 · 기준 39세 이하`)
    : c.home.deposit>8000 ? NO('보증금 8,000만 초과')
    : c.home.monthly>60 ? NO(`월세 ${c.home.monthly}만 · 기준 60만 이하`)
    : c.home.incomeRate>150 ? NO(`중위 ${c.home.incomeRate}% · 기준 150% 이하`)
    : OK('월 20만 · 10개월','보증금·월세·소득 요건 모두 충족',54,'추첨')},
  {n:'SH 청년안심주택 · 공공지원민간임대', where:'SH 인터넷청약', visit:'online',
   f:c=> !c.region.startsWith('서울') ? NO(`${c.region} 거주 · 서울 지역 공급`)
    : c.age>39 ? NO(`만 ${c.age}세 · 기준 39세 이하`)
    : c.home.own ? NO('주택을 소유하고 있습니다')
    : c.home.incomeRate>120 ? NO(`중위 ${c.home.incomeRate}% · 기준 120% 이하`)
    : OK('시세 70~85% · 최대 6년','무주택 · 소득 요건 충족',37,'추첨')},
  {n:'LH 청년 매입임대', where:'LH청약플러스', visit:'online',
   f:c=> c.home.own ? NO('주택을 소유하고 있습니다')
    : c.fam.married ? NO('청년 유형은 미혼 대상 · 신혼부부 유형으로 신청하셔야 합니다')
    : c.age>39 ? NO(`만 ${c.age}세 · 기준 39세 이하`)
    : c.home.car>4542 ? NO(`자동차 ${c.home.car.toLocaleString()}만 · 기준 4,542만 이하`)
    : c.home.incomeRate>150 ? NO(`중위 ${c.home.incomeRate}% · 3순위 기준 150% 초과`)
    : c.home.incomeRate>100 ? OK('시세 30~50%',`중위 ${c.home.incomeRate}% · 3순위 · 1·2순위 미달 시`,14,'추첨 · 후순위')
    : OK('시세 30~50%','무주택 · 소득 2순위 이내',31,'추첨')},
  {n:'LH 신혼부부 매입임대', where:'LH청약플러스', visit:'online',
   f:c=> !c.fam.married ? NO('혼인 관계가 확인되지 않습니다')
    : c.home.own ? NO('주택을 소유하고 있습니다')
    : c.home.incomeRate>130 ? NO(`중위 ${c.home.incomeRate}% · 기준 130% 이하`)
    : OK('전세 지원','무주택 · 신혼부부 · 소득 요건 충족',31,'추첨')},
  {n:'중기청 전월세보증금 대출', where:'주택도시기금 · 은행 방문', visit:'bank',
   f:c=> !(c.work.on&&c.work.sme) ? NO('중소기업 재직자가 아닙니다')
    : c.age>34 ? NO(`만 ${c.age}세 · 기준 34세 이하`)
    : c.home.deposit>20000 ? NO(`보증금 ${c.home.deposit.toLocaleString()}만 · 기준 2억 이하`)
    : OK('최대 1억 · 연 1.5%','중소기업 재직 · 보증금 요건 충족',83,'심사')},
  {n:'버팀목 전세자금대출', where:'주택도시기금 · 은행 방문', visit:'bank',
   f:c=> c.home.own ? NO('주택을 소유하고 있습니다')
    : !c.home.rent ? NO('임차 계약이 없습니다')
    : c.home.incomeRate>140 ? NO(`중위 ${c.home.incomeRate}% · 소득 기준 초과`)
    : OK('최대 2억','무주택 · 소득과 보증금 요건 충족',86,'심사')},
  {n:'주택연금', where:'주택금융공사 · 지사 방문', visit:'office',
   f:c=> !c.home.own ? NO('주택을 소유하고 있어야 합니다')
    : c.age<55 ? NO(`만 ${c.age}세 · 기준 55세 이상`)
    : OK('월 연금 수령','자가 보유 · 연령 요건 충족',80,'상담 후')}]},

{k:'cash', n:'현금·자산형성', items:[
  {n:'근로장려금', where:'홈택스 · 손택스', visit:'online',
   f:c=> !c.work.on&&!c.biz.on&&!c.work.freelance ? NO('근로 또는 사업 소득이 없습니다')
    : c.biz.kind==='corp' ? NO('법인 대표는 지급 대상에서 제외됩니다')
    : c.home.incomeRate>120 ? NO(`중위 ${c.home.incomeRate}% · 소득 기준 초과`)
    : OK('최대 330만','소득 요건 충족 · 재산 2.4억 미만 확인 필요',76,'신청 기간 내')},
  {n:'자녀장려금', where:'홈택스 · 손택스', visit:'online',
   f:c=> c.fam.kids===0 ? NO('부양 자녀가 없습니다')
    : c.biz.kind==='corp' ? NO('법인 대표는 지급 대상에서 제외됩니다')
    : c.home.incomeRate>120 ? NO(`중위 ${c.home.incomeRate}% · 소득 기준 초과`)
    : OK(`자녀 ${c.fam.kids}명 · 최대 ${c.fam.kids*100}만`,'소득 요건 충족',78,'신청 기간 내')},
  {n:'청년도약계좌', where:'은행 앱 또는 창구', visit:'online',
   f:c=> c.age>34 ? NO(`만 ${c.age}세 · 기준 34세 이하`)
    : !c.work.on&&!c.biz.on&&!c.work.freelance ? NO('소득이 확인되지 않습니다')
    : OK('정부기여금 월 2.4만','개인소득 7,500만 이하 · 가구 중위 250% 이하',88,'소득 구간별')},
  {n:'희망저축계좌', where:'주민센터', visit:'center',
   f:c=> !c.misc.welfare ? NO('기초생활수급 또는 차상위 가구가 아닙니다')
    : !c.work.on&&!c.biz.on ? NO('근로 또는 사업 소득이 있어야 합니다')
    : OK('3년 만기 최대 1,440만','수급 가구 근로자 · 정부 매칭',85,'신청 시')},
  {n:'기초연금', where:'주민센터 · 복지로', visit:'center',
   f:c=> c.age<65 ? NO(`만 ${c.age}세 · 기준 65세 이상`)
    : c.home.incomeRate>70 ? NO('소득인정액이 선정기준액을 초과합니다')
    : OK('월 최대 34만','만 65세 이상 · 소득 하위 70%',90,'신청 시')}]},

{k:'tax', n:'세금·공과금', items:[
  {n:'중소기업 취업자 소득세 감면', where:'회사 제출 · 원천징수의무자 경유', visit:'company',
   f:c=> c.biz.kind==='corp'&&!c.work.on ? NO('법인 대표는 감면 대상에서 제외됩니다')
    : !c.work.on ? NO('근로소득이 없습니다')
    : !c.work.smeType ? NO('감면 대상 업종이 아닙니다')
    : c.work.taxRelief ? NO('이미 적용받고 있습니다')
    : OK('연 200만 한도 · 90%','미신청 상태 · 2026.12.31 일몰 예정',97,'신청만 하면')},
  {n:'경정청구 · 미신청 감면 소급', where:'홈택스', visit:'online',
   f:c=> c.biz.kind==='corp'&&!c.work.on ? NO('감면 대상이 아니라 소급분이 없습니다')
    : !c.work.on ? NO('근로소득이 없습니다')
    : c.work.taxRelief ? NO('이미 적용 중이라 소급분이 없습니다')
    : OK('최대 5년치','미신청 기간에 대해 소급 청구할 수 있습니다',92,'5년 이내')},
  {n:'전기요금 할인', where:'한전 · 온라인 신청', visit:'online',
   f:c=> (c.fam.kids>=3||c.misc.disabled||c.misc.single||c.misc.welfare)
      ? OK('월 최대 1.6만', c.misc.welfare?'수급 가구':c.misc.single?'한부모 가구':c.fam.kids>=3?'다자녀 가구':'장애 가구',95,'신청 시')
    : NO('다자녀·장애·한부모·수급 등 대상에 해당하지 않습니다')},
  {n:'통신요금 감면', where:'통신사 · 주민센터', visit:'center',
   f:c=> (c.misc.disabled||c.misc.welfare) ? OK('월 최대 2.6만', c.misc.welfare?'수급 가구':'장애 등록',95,'신청 시')
    : c.age>=65 ? OK('월 최대 1.1만','만 65세 이상 · 기초연금 수급자 대상',90,'기초연금 수급 후')
    : NO('감면 대상 계층에 해당하지 않습니다')},
  {n:'에너지바우처', where:'주민센터 · 복지로', visit:'center',
   f:c=> c.misc.welfare ? OK('연 최대 37만','기초생활수급 가구',95,'동절기 신청')
    : NO('기초생활수급 또는 차상위 계층이 아닙니다')},
  {n:'주거급여', where:'주민센터 · 복지로', visit:'center',
   f:c=> !c.misc.welfare ? NO(`중위 ${c.home.incomeRate}% · 기준 48% 이하`)
    : !c.home.rent ? NO('임차 가구가 아닙니다')
    : OK('월 최대 35만','수급 가구 · 임차료 지원',93,'신청 시')}]},

{k:'move', n:'교통·문화', items:[
  {n:'K-패스', where:'K-패스 앱 · 카드사', visit:'online',
   f:c=> c.age<19 ? NO('만 19세 이상 대상입니다')
    : OK('교통비 20~53% 환급', c.age<=34?'청년 30% 환급 구간':'일반 20% 환급 구간',93,'신청만 하면')},
  {n:'기후동행카드', where:'서울교통공사 · 편의점', visit:'online',
   f:c=> !c.region.startsWith('서울') ? NO(`${c.region} 거주 · 서울 지역 이용권`)
    : OK('월 6.5만 무제한','서울 거주 · 대중교통 이용',90,'구매 시')},
  {n:'문화누리카드', where:'주민센터 · 문화누리', visit:'center',
   f:c=> c.misc.welfare ? OK('연 14만','기초생활수급 가구',95,'신청 시')
    : NO('기초생활수급 또는 차상위 계층이 아닙니다')},
  {n:'스포츠강좌이용권', where:'주민센터', visit:'center',
   f:c=> c.fam.kids===0 ? NO('대상 아동이 없습니다')
    : !c.misc.welfare&&!c.misc.single ? NO('기초생활수급 또는 차상위 가구가 아닙니다')
    : OK('월 10만 · 아동당','수급 또는 한부모 가구',90,'신청 시')}]},

{k:'job', n:'일자리·훈련', items:[
  {n:'실업급여', where:'고용센터 방문 · 워크넷 선행', visit:'office',
   f:c=> c.work.on&&c.work.quit!=='soon' ? NO('재직 중에는 신청할 수 없습니다')
    : c.work.quit==='self' ? NO('자발적 퇴사는 수급 대상이 아닙니다')
    : c.work.insured<180 ? NO(`피보험 단위기간 ${c.work.insured}일 · 기준 180일 이상`)
    : c.biz.on ? OK('210일 지급','사업자 휴업 또는 폐업 처리가 선행돼야 합니다',70,'선행 조건 필요')
    : OK(`${c.work.insured>=1200?'210':'150'}일 지급`,`피보험 단위기간 ${c.work.insured}일 충족`,94,'요건 충족 시')},
  {n:'국민취업지원제도', where:'고용센터 · 온라인', visit:'office',
   f:c=> c.work.on&&c.work.quit!=='soon' ? NO('구직 상태가 아닙니다')
    : c.age>69 ? NO(`만 ${c.age}세 · 기준 15~69세`)
    : c.home.incomeRate>60 ? NO(`중위 ${c.home.incomeRate}% · Ⅰ유형 기준 60% 이하`)
    : OK('월 50만 · 6개월','구직 중 · 소득 요건 충족',72,'심사')},
  {n:'내일배움카드', where:'HRD-Net · 고용센터', visit:'online',
   f:c=> c.age>=75 ? NO('연령 상한을 초과했습니다')
    : OK('최대 500만','재직 중에도 발급 가능',91,'요건 충족 시')},
  {n:'임금체불 대지급금', where:'고용노동부 · 근로복지공단', visit:'office',
   f:c=> !c.work.on&&c.work.insured===0 ? NO('근로 관계가 확인되지 않습니다')
    : c.misc.unpaid ? OK('최대 1,000만','체불 확인 · 사업주가 못 주면 국가가 대신 지급',82,'확정 후')
    : NO('체불 사실이 확인되지 않습니다')},
  {n:'청년일자리도약장려금', where:'고용노동부 · 워크넷', visit:'online',
   f:c=> !c.biz.on ? NO('사업주가 아닙니다')
    : c.biz.emp===0&&!c.biz.hire ? NO('상시근로자가 없습니다')
    : OK('월 60만 · 12개월','청년 채용 시',72,'채용 후')},
  {n:'노인일자리', where:'주민센터 · 시니어클럽', visit:'center',
   f:c=> c.age<65 ? NO(`만 ${c.age}세 · 기준 65세 이상`)
    : OK('월 29~76만','만 65세 이상 · 유형별 상이',85,'모집 시')}]},

{k:'care', n:'양육·교육', items:[
  {n:'부모급여', where:'주민센터 · 복지로', visit:'center',
   f:c=> c.fam.kids===0 ? NO('자녀가 없습니다')
    : !c.fam.infant ? NO('만 2세 이하 영아가 없습니다')
    : OK('월 50만 · 만 2세까지','영아 보유',99,'자동 지급')},
  {n:'아동수당', where:'주민센터 · 복지로', visit:'center',
   f:c=> c.fam.kids===0 ? NO('자녀가 없습니다')
    : OK('월 10만 · 만 8세까지','자녀 보유',99,'자동 지급')},
  {n:'한부모 아동양육비', where:'주민센터', visit:'center',
   f:c=> !c.misc.single ? NO('한부모 가구가 아닙니다')
    : c.home.incomeRate>63 ? NO(`중위 ${c.home.incomeRate}% · 기준 63% 이하`)
    : OK(`자녀 ${c.fam.kids}명 · 월 ${c.fam.kids*21}만`,'소득 요건 충족',94,'신청 시')},
  {n:'첫만남이용권', where:'주민센터 · 복지로', visit:'center',
   f:c=> c.fam.pregnant ? OK('200만','출생 후 1년 이내 신청',99,'출생 신고 시')
    : c.fam.infant ? LOST('200만','출생 후 1년이 지나 신청 기간이 끝났습니다')
    : NO('출산 예정이나 해당 영아가 없습니다')},
  {n:'임신출산 진료비', where:'국민행복카드 · 은행 방문', visit:'bank',
   f:c=> c.fam.pregnant ? OK('100만 · 다태아 140만','임신 확인 후 신청',99,'출산 전')
    : NO('임신이 확인되지 않습니다')},
  {n:'보육료 지원', where:'주민센터 · 복지로', visit:'center',
   f:c=> c.fam.kids===0 ? NO('자녀가 없습니다')
    : CHK('전액 또는 일부','어린이집 등록 후 적용됩니다')},
  {n:'국가장학금', where:'한국장학재단', visit:'online',
   f:c=> !c.fam.college ? NO('대학 재학생이 없습니다')
    : OK('소득분위별','재학생 보유 · 소득분위 산정 필요',80,'학기별 신청')}]},

{k:'med', n:'의료·건강', items:[
  {n:'재난적의료비 지원', where:'건강보험공단 지사', visit:'office',
   f:c=> !c.misc.medicalHigh ? NO('연간 의료비가 소득 대비 기준을 넘지 않습니다')
    : c.home.incomeRate>200 ? NO('소득 기준 초과')
    : OK('최대 5,000만','의료비 부담 기준 충족',68,'심사')},
  {n:'산정특례', where:'병원 · 건강보험공단', visit:'office',
   f:c=> !c.misc.chronic ? NO('중증질환 등록 이력이 없습니다')
    : OK('본인부담 5~10%','등록 질환 대상',90,'등록 시')},
  {n:'난임 시술 지원', where:'주민센터 · 보건소', visit:'center',
   f:c=> !c.fam.married ? NO('대상 요건에 해당하지 않습니다')
    : c.age>44 ? NO('여성 연령 기준을 확인해야 합니다')
    : CHK('회당 최대 110만','지자체별 지원 횟수를 확인해야 합니다')},
  {n:'건강검진 · 암검진', where:'지정 검진기관', visit:'online',
   f:c=> OK('무료 또는 10%','건강보험 가입자 대상',95,'대상 연도')}]},

{k:'target', n:'대상 특화', items:[
  {n:'장애인연금 · 활동지원', where:'주민센터', visit:'center',
   f:c=> !c.misc.disabled ? NO('장애 등록이 확인되지 않습니다')
    : OK('월 최대 43만','장애 정도와 소득에 따라 상이',90,'신청 시')},
  {n:'한부모가족 증명서', where:'주민센터', visit:'center',
   f:c=> !c.misc.single ? NO('한부모 가구가 아닙니다')
    : c.home.incomeRate>63 ? NO(`중위 ${c.home.incomeRate}% · 기준 63% 이하`)
    : OK('각종 감면의 전제','발급받아야 다른 지원을 신청할 수 있습니다',95,'신청 시')},
  {n:'장기요양보험', where:'건강보험공단 지사', visit:'office',
   f:c=> c.age<65 ? NO(`만 ${c.age}세 · 기준 65세 이상`)
    : !c.misc.care ? CHK('등급별 지원','거동 불편이 있으시면 등급 판정을 신청하실 수 있습니다')
    : OK('등급별 재가·시설 급여','거동 불편 확인',78,'등급 판정')},
  {n:'보훈 · 병역 지원', where:'보훈지청', visit:'office',
   f:c=> NO('보훈 대상 또는 복무 중이 아닙니다')}]},

{k:'debt', n:'채무·재기', items:[
  {n:'신속채무조정', where:'신용회복위원회 · 무료', visit:'office',
   f:c=> c.credit.arrears>=30 ? NO('연체 30일을 넘어 개인워크아웃 대상입니다')
    : (c.credit.drop<-40||c.credit.multi||c.credit.dsr>70)
      ? OK('이자율 조정 · 상환 유예','연체 전 단계에서 신청할 수 있습니다 · 상담 무료',80,'심사')
      : NO('연체 우려 신호가 확인되지 않습니다')},
  {n:'이자율 채무조정 · 프리워크아웃', where:'신용회복위원회 · 무료', visit:'office',
   f:c=> c.credit.arrears>=31&&c.credit.arrears<=89 ? OK('이자율 인하','연체 31~89일 구간 · 상담 무료',82,'심사')
    : c.credit.arrears>89 ? NO('연체 90일 초과 · 개인워크아웃 대상입니다')
    : NO(`연체 ${c.credit.arrears}일 · 기준 31일 이상`)},
  {n:'개인워크아웃', where:'신용회복위원회 · 무료', visit:'office',
   f:c=> c.credit.arrears<90 ? NO(`연체 ${c.credit.arrears}일 · 기준 90일 이상`)
    : OK('원금 최대 70% 감면','신용회복위원회 · 신청과 상담 모두 무료',78,'심사')},
  {n:'개인회생', where:'법원 · 법률구조공단 경유 권장', visit:'office',
   f:c=> c.credit.arrears<90&&c.credit.dsr<80 ? NO('상환 곤란이 확인되지 않습니다')
    : !c.work.on&&!c.biz.on&&!c.work.freelance ? NO('계속적인 소득이 있어야 신청할 수 있습니다')
    : OK('변제 후 잔여 채무 면책','법원 절차 · 소득이 있어야 신청 가능',70,'법원 인가')},
  {n:'법률구조공단 무료 지원', where:'법률구조공단 지부 · 132', visit:'office',
   f:c=> c.credit.arrears<90&&c.credit.dsr<80 ? NO('해당 상황이 확인되지 않습니다')
    : c.home.incomeRate>125 ? NO(`중위 ${c.home.incomeRate}% · 무료 지원 기준 125% 이하`)
    : OK('신청서 작성까지 무료','법무법인 수임료 200~300만 원이 들지 않습니다',85,'상담 후')},
  {n:'희망리턴패키지', where:'소진공 지역센터 · 폐업 신고 전', visit:'office',
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.close ? OK('최대 2,000만','폐업 신고 전에 상담을 받아야 합니다',78,'상담 후')
    : CHK('최대 2,000만','폐업을 고려하실 때 신고 전에 상담을 받으셔야 합니다')},
  {n:'새출발기금', where:'캠코 · 온라인', visit:'online',
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.credit.arrears<90&&c.credit.dsr<70 ? NO('연체 또는 상환 곤란이 확인되지 않습니다')
    : OK('원금 조정 · 이자 감면','소상공인 채무조정',72,'심사')}]},

{k:'start', n:'창업 지원', items:[
  {n:'예비창업패키지', where:'K-Startup', visit:'online',
   f:c=> c.biz.on ? LOST('최대 1억','사업자등록으로 자격이 소멸했습니다')
    : OK('최대 1억','사업자등록 전 · 지금 등록하면 자격이 사라집니다',38,'14 : 1')},
  {n:'초기창업패키지', where:'K-Startup', visit:'online',
   f:c=> !c.biz.on ? NO('사업자등록 후 신청할 수 있습니다')
    : c.biz.kind!=='corp' ? NO(`${c.biz.ksic}는 제외 업종입니다`)
    : c.biz.years>3 ? NO(`업력 ${c.biz.years}년 · 기준 3년 이내`)
    : OK('최대 1억','업력 3년 이내',52,'9 : 1')},
  {n:'창업도약패키지', where:'K-Startup', visit:'online',
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.kind!=='corp' ? NO('제외 업종입니다')
    : c.biz.years<3 ? NO(`업력 ${c.biz.years}년 · 초기창업 구간입니다`)
    : c.biz.years>7 ? NO('업력 7년을 초과했습니다')
    : OK('최대 3억','업력 3~7년',41,'12 : 1')},
  {n:'창업성장 R&D', where:'K-Startup · IRIS', visit:'online',
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.kind!=='corp' ? NO('제외 업종입니다')
    : OK('최대 2억', c.biz.ip?'지식재산권 보유 가점':'기술성 증빙 부족', c.biz.ip?47:23,'7 : 1')},
  {n:'청년창업사관학교', where:'K-Startup', visit:'online',
   f:c=> c.age>39 ? NO(`만 ${c.age}세 · 기준 39세 이하`)
    : !c.biz.on&&!c.biz.plan ? NO('창업자 또는 예비창업자가 아닙니다')
    : c.biz.on&&c.biz.kind!=='corp' ? NO('기술창업 분야 대상입니다')
    : OK('최대 1억','만 39세 이하 · 업력 3년 이내',44,'11 : 1')},
  {n:'TIPS', where:'운영사 추천 후 K-Startup', visit:'online',
   f:c=> c.biz.on&&c.biz.kind!=='corp' ? NO('기술창업 분야 대상입니다')
    : NO('운영사 추천이 선행돼야 합니다')},
  {n:'벤처기업 확인', where:'벤처확인종합관리시스템', visit:'online',
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.venture ? NO('이미 확인받았습니다')
    : c.biz.ip ? OK('세제감면 · 가점','기술평가 기반 신청 가능',64,'평가')
    : NO('기술평가 또는 투자 요건을 충족하지 못합니다')},
  {n:'상표 출원', where:'특허로 · 변리사 상담 권장', visit:'online',
   f:c=> !c.biz.on&&!c.biz.plan ? NO('사업자 또는 예비창업자가 아닙니다')
    : OK('출원료 실비','브랜드 보호 · 다수 사업 가점 항목',90,'상시')}]},

{k:'small', n:'소상공인·농어업', items:[
  {n:'소상공인 정책자금', where:'소상공인정책자금 누리집 · 지역센터', visit:'office',
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.kind==='corp' ? NO('중소기업 자금 대상입니다')
    : c.misc.arrear ? NO('체납 또는 연체 해소가 선행돼야 합니다')
    : c.biz.rev>30000 ? NO(`매출 ${(c.biz.rev/10000).toFixed(1)}억 · 기준 3억 이하`)
    : OK('최대 7,000만','매출 3억 미만 · 소상공인 기준 충족',60,'예산 소진 전')},
  {n:'경영안정자금', where:'소상공인정책자금 누리집', visit:'online',
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : !c.biz.revDown ? NO('매출 감소가 확인되지 않습니다')
    : OK('최대 7,000만','매출 감소 증빙 자동 제출',71,'요건 충족 시')},
  {n:'스마트상점 기술보급', where:'소상공인마당', visit:'online',
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.kind!=='solo' ? NO('오프라인 점포 대상입니다')
    : OK('최대 500만','오프라인 점포 보유',58,'4 : 1')},
  {n:'온라인 판로 지원', where:'소상공인마당', visit:'online',
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : !c.biz.tongsin ? NO('통신판매업 신고가 필요합니다')
    : OK('최대 500만','통신판매업 신고 완료',64,'3 : 1')},
  {n:'노란우산공제', where:'중소기업중앙회 · 은행', visit:'bank',
   f:c=> !c.biz.on&&!c.work.freelance ? NO('사업자 또는 프리랜서가 아닙니다')
    : c.biz.noran ? NO('이미 가입돼 있습니다')
    : OK('연 최대 500만 소득공제','가입만 하면 적용 · 폐업 시 공제금',95,'가입 시')},
  {n:'백년가게', where:'소상공인마당', visit:'online',
   f:c=> !c.biz.on ? NO('사업자가 아닙니다') : NO('업력 30년 요건을 충족하지 못합니다')},
  {n:'농업직불금 · 청년농 영농정착', where:'농관원 · 농지소재지', visit:'office',
   f:c=> !c.misc.farm ? NO('농업경영체 등록이 없습니다')
    : OK('월 최대 110만','청년농 영농정착지원금',80,'선발')}]},

{k:'emp', n:'고용·정책금융', items:[
  {n:'두루누리 사회보험료', where:'근로복지공단', visit:'online',
   f:c=> !c.biz.on ? NO('사업주가 아닙니다')
    : c.biz.emp===0&&!c.biz.hire ? NO('상시근로자가 없습니다')
    : OK('월 최대 60만', c.biz.hire?'채용 계획 있음 · 채용 후에는 소급 불가':'상시근로자 보유',85,'채용 전 신청')},
  {n:'고용창출장려금', where:'고용노동부 · 워크넷 선행', visit:'online',
   f:c=> !c.biz.on ? NO('사업주가 아닙니다')
    : c.biz.emp===0 ? NO('상시근로자가 없습니다')
    : OK('최대 3,600만','워크넷 구인등록이 선행 조건',78,'요건 충족 시')},
  {n:'이노비즈 인증', where:'이노비즈협회', visit:'online',
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.years<3 ? NO('업력 3년 이상이 필요합니다')
    : NO('기술혁신 평가 요건을 확인해야 합니다')},
  {n:'수출바우처', where:'수출바우처 누리집', visit:'online',
   f:c=> !c.biz.on ? NO('사업자가 아닙니다') : NO('수출 실적 또는 계획 증빙이 필요합니다')}]},

{k:'refund', n:'미수령·환급', items:[
  {n:'국세 미환급금', where:'홈택스 · 손택스', visit:'online',
   f:c=> c.refund.tax>0 ? OK(c.refund.tax.toLocaleString()+'만','미수령 환급금 확인 · 5년 지나면 국고 귀속',99,'조회 후 신청')
    : NO('미환급금이 확인되지 않습니다')},
  {n:'지방세 미환급금', where:'위택스', visit:'online',
   f:c=> c.refund.local>0 ? OK(c.refund.local.toLocaleString()+'만','미수령 환급금 확인',99,'조회 후 신청')
    : NO('미환급금이 확인되지 않습니다')},
  {n:'본인부담상한제 환급금', where:'건강보험공단', visit:'online',
   f:c=> c.refund.medical>0 ? OK(c.refund.medical.toLocaleString()+'만','상한 초과분 환급 대상 · 신청해야 지급',97,'신청 시')
    : NO('연간 본인부담금이 상한을 넘지 않았습니다')},
  {n:'휴면예금 · 미청구 보험금', where:'서민금융진흥원 · 내보험찾아줌', visit:'online',
   f:c=> c.refund.dormant>0 ? OK(c.refund.dormant.toLocaleString()+'만','장기 미거래 계좌와 미청구 보험금',99,'조회 후 신청')
    : NO('미수령 금액이 확인되지 않습니다')},
  {n:'종합소득세 경정청구', where:'홈택스', visit:'online',
   f:c=> !c.biz.on&&!c.work.on&&!c.work.freelance ? NO('신고 이력이 없습니다')
    : OK('최대 5년치', c.work.freelance?'프리랜서 원천징수 3.3% 환급 가능성':'누락된 공제와 감면 소급',75,'5년 이내')},
  {n:'미청구 국민연금 · 퇴직연금', where:'국민연금공단 · 통합연금포털', visit:'online',
   f:c=> c.refund.pension>0 ? OK(c.refund.pension.toLocaleString()+'만','미청구 적립금 확인',95,'조회 후 신청')
    : NO('미청구 적립금이 확인되지 않습니다')}]},

{k:'death', n:'상속·사망', items:[
  {n:'안심상속 원스톱 서비스', where:'주민센터 · 정부24', visit:'center',
   f:c=> !c.event.death ? NO('해당 사건이 확인되지 않습니다')
    : c.event.deathDays>30 ? LOST('무료','사망일로부터 1개월 이내 신청 기간이 지났습니다')
    : OK('무료','고인의 재산과 채무를 한 번에 조회할 수 있습니다',99,'사망 후 1개월 이내')},
  {n:'상속포기 · 한정승인', where:'가정법원 · 법률구조공단', visit:'office',
   f:c=> !c.event.death ? NO('해당 사건이 확인되지 않습니다')
    : c.event.deathDays>90 ? LOST('채무 승계 방지','사망일로부터 3개월이 지나 단순승인으로 간주됩니다')
    : OK('채무 승계 방지',`남은 기간 ${90-c.event.deathDays}일 · 채무가 재산보다 많으면 반드시 검토`,90,'3개월 이내')},
  {n:'상속세 신고', where:'홈택스 · 세무서', visit:'online',
   f:c=> !c.event.death ? NO('해당 사건이 확인되지 않습니다')
    : OK('공제 후 산정',`사망일이 속한 달의 말일부터 6개월 이내 · 남은 기간 ${Math.max(0,180-c.event.deathDays)}일`,85,'기한 내 신고')},
  {n:'유족연금 · 사망일시금', where:'국민연금공단', visit:'office',
   f:c=> !c.event.death ? NO('해당 사건이 확인되지 않습니다')
    : OK('월 연금 또는 일시금','고인의 국민연금 가입 이력에 따라 결정',80,'5년 이내 청구')},
  {n:'장제급여', where:'주민센터', visit:'center',
   f:c=> !c.event.death ? NO('해당 사건이 확인되지 않습니다')
    : !c.misc.welfare ? NO('기초생활수급 가구가 아닙니다')
    : OK('80만','수급 가구 장례비 지원',95,'신청 시')},
  {n:'상속 취득세 감면', where:'위택스 · 시군구청', visit:'office',
   f:c=> !c.event.death ? NO('해당 사건이 확인되지 않습니다')
    : CHK('요건별 감면','1가구 1주택 상속 등 요건을 확인해야 합니다')}]},

{k:'admin', n:'행정 절차', items:[
  {n:'모바일 주민등록증', where:'주민센터 방문 필요', visit:'center',
   f:c=> c.admin.idLatest ? OK('무료','소지한 실물 주민등록증이 최신 발급본입니다',95,'방문 신청')
    : NO('소지한 실물이 최신 재발급본이 아닙니다 · 재발급 후 신청 가능')},
  {n:'공동인증서 발급', where:'은행 방문 또는 비대면', visit:'bank',
   f:c=> c.admin.cert ? NO('이미 발급받으셨습니다')
    : OK('무료','다수 행정·금융 절차의 선행 조건입니다',95,'발급 시')},
  {n:'전입신고 · 확정일자', where:'주민센터 · 정부24', visit:'center',
   f:c=> !c.admin.moving ? NO('이사 예정이 확인되지 않습니다')
    : OK('무료','전입 후 14일 이내 · 확정일자는 보증금 보호의 전제',99,'14일 이내')},
  {n:'사업자등록', where:'홈택스 · 세무서', visit:'online',
   f:c=> c.biz.on ? NO('이미 등록돼 있습니다')
    : !c.biz.plan ? NO('창업 계획이 확인되지 않습니다')
    : CHK('무료','등록하면 예비창업패키지 자격이 사라집니다. 순서를 먼저 확인하세요')}]}
];
