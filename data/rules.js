/* ═══════════════════════════════════════════════
   제도 규칙 데이터베이스
   각 항목: n(이름) amt(표시 금액) f(판정 함수) where(신청처) visit(방문 유형)
   판정 결과: OK 가능 / NO 불가 / LOST 놓침 / CHK 확인 필요

   ── 금액 집계 규칙 ──
   OK 의 다섯 번째 인자 mv 가 "합산 가능한 금액"입니다. 없으면 합산에서 빠집니다.
     {y:n}    연 환산 반복 수령·절감액 (월 20만 12개월 → y:240)
     {once:n} 한 번만 받는 금액
     {cap:n}  대출 한도 (받는 돈이 아니므로 따로 셉니다)
     {max:n}  선정돼야 받는 최대 사업비 (확정 금액이 아니므로 따로 셉니다)
   단위는 만원. 범위 표기는 하한을, '최대' 표기는 그 값을 씁니다.
   ═══════════════════════════════════════════════ */

const OK=(amt,why,odds,rate,mv)=>({s:'ok',amt,why,odds:odds||70,rate:rate||'요건 충족 시',mv:mv||null});
const NO=why=>({s:'no',why});
const LOST=(amt,why,mv)=>({s:'lost',amt,why,mv:mv||null});
const CHK=(amt,why)=>({s:'chk',amt,why});

/* 정책 대출 · cat 이 같은 민간 상품과만 비교합니다 */
const POLICY_LOAN={
 '소상공인 정책자금':{rate:2.96, cat:'biz'},
 '성장기반자금 · 시설자금':{rate:0, cat:'biz', note:'연 2~4%대 · 자금별 차등'},
 '청년전용창업자금':{rate:2.5, cat:'biz'},
 '혁신창업사업화자금':{rate:0, cat:'biz', note:'기준금리 −0.3%p · 분기별 변동'},
 '경영안정자금':{rate:2.96, cat:'biz'},
 '새출발기금':{rate:3.0, cat:'biz'},
 '중기청 전월세보증금 대출':{rate:1.5, cat:'jeonse'},
 '버팀목 전세자금대출':{rate:2.7, cat:'jeonse'},
 '주택연금':{rate:0, cat:'none', note:'대출이 아니라 연금 수령'}
};
/* 민간 대출 · 비교용으로만 조회합니다. 연결해도 수수료를 받지 않습니다 */
const PRIV=[
 {n:'시중은행 사업자 신용대출', cat:'biz', rate:7.8, max:5000, need:c=>c.biz.on, where:'각 은행'},
 {n:'인터넷은행 사업자대출', cat:'biz', rate:6.9, max:3000, need:c=>c.biz.on, where:'토스뱅크 · 케이뱅크'},
 {n:'카드사 사업자 대출', cat:'biz', rate:11.2, max:3000, need:c=>c.biz.on, where:'각 카드사'},
 {n:'시중은행 신용대출', cat:'credit', rate:6.4, max:8000, need:c=>c.work.on, where:'각 은행'},
 {n:'인터넷은행 신용대출', cat:'credit', rate:5.9, max:5000, need:c=>c.work.on, where:'카카오뱅크 · 토스뱅크'},
 {n:'전세자금 민간대출', cat:'jeonse', rate:4.6, max:20000, need:c=>c.home.rent&&!c.home.own, where:'각 은행'}
];

const SECTORS=[
{k:'house', n:'주거', items:[
  {n:'청년월세 특별지원', type:'cash', where:'복지로 · 주민센터', visit:'online',
   chk:{d:'2026-09-08', src:'2026 청년월세 특별지원', u:'https://www.tossbank.com/articles/youth-monthly-rent'},
   f:c=> !c.home.rent ? NO('임차 중이 아닙니다')
    : c.age>34 ? NO(`만 ${c.age}세 · 기준 34세 이하`)
    : c.home.incomeRate>60 ? NO(`본인 소득 중위 ${c.home.incomeRate}% · 기준 60% 이하`)
    : c.home.deposit>5000 ? NO(`보증금 ${c.home.deposit.toLocaleString()}만 · 기준 5,000만 이하`)
    : OK('월 최대 20만 · 최대 24개월 · 총 480만','2026년부터 상시 신청 · 청년 중위 60% 이하 · 원가구 100% 이하',62,'상시 신청',{y:240})},
  {n:'서울시 청년월세 지원', type:'compete', where:'서울주거포털', visit:'online',
   chk:{d:'2026-09-08', src:'서울주거포털 청년월세지원', lvl:'org', u:'https://housing.seoul.go.kr/'},
   f:c=> !c.region.startsWith('서울') ? NO(`${c.region} 거주 · 서울시 사업입니다`)
    : c.age>39 ? NO(`만 ${c.age}세 · 기준 39세 이하`)
    : c.home.deposit>8000 ? NO('보증금 8,000만 초과')
    : c.home.monthly>60 ? NO(`월세 ${c.home.monthly}만 · 기준 60만 이하`)
    : c.home.incomeRate>150 ? NO(`중위 ${c.home.incomeRate}% · 기준 150% 이하`)
    : OK('월 20만 · 10개월','보증금·월세·소득 요건 모두 충족',54,'추첨',{max:200})},
  {n:'SH 청년안심주택 · 공공지원민간임대', type:'compete', where:'SH 인터넷청약', visit:'online',
   chk:{d:'2026-09-08', src:'SH 청년안심주택', lvl:'org', u:'https://soco.seoul.go.kr/youth/'},
   f:c=> !c.region.startsWith('서울') ? NO(`${c.region} 거주 · 서울 지역 공급`)
    : c.age>39 ? NO(`만 ${c.age}세 · 기준 39세 이하`)
    : c.home.own ? NO('주택을 소유하고 있습니다')
    : c.home.incomeRate>120 ? NO(`중위 ${c.home.incomeRate}% · 기준 120% 이하`)
    : OK('시세 70~85% · 최대 6년','무주택 · 소득 요건 충족',37,'추첨')},
  {n:'LH 청년 매입임대', type:'compete', where:'LH청약플러스', visit:'online',
   chk:{d:'2026-09-08', src:'KB · 2026 청년·신혼부부 주거 지원', u:'https://kbthink.com/realestate/basics/housing-support.html'},
   f:c=> c.home.own ? NO('주택을 소유하고 있습니다')
    : c.fam.married ? NO('청년 유형은 미혼 대상 · 신혼부부 유형으로 신청하셔야 합니다')
    : c.age>39 ? NO(`만 ${c.age}세 · 기준 39세 이하`)
    : c.home.car>4542 ? NO(`자동차 ${c.home.car.toLocaleString()}만 · 기준 4,542만 이하`)
    : c.home.incomeRate>150 ? NO(`중위 ${c.home.incomeRate}% · 3순위 기준 150% 초과`)
    : c.home.incomeRate>100 ? OK('시세 40~50% · 최대 10년',`중위 ${c.home.incomeRate}% · 3순위 · 1·2순위 미달 시`,14,'추첨 · 후순위')
    : OK('시세 40~50% · 최대 10년','무주택 · 소득 2순위 이내 · 혼인 후 최대 20년',31,'추첨')},
  {n:'LH 신혼부부 매입임대', type:'compete', where:'LH청약플러스', visit:'online',
   chk:{d:'2026-09-08', src:'KB · 2026 청년·신혼부부 주거 지원', u:'https://kbthink.com/realestate/basics/housing-support.html'},
   f:c=> !c.fam.married ? NO('혼인 관계가 확인되지 않습니다')
    : c.home.own ? NO('주택을 소유하고 있습니다')
    : c.home.incomeRate>130 ? NO(`중위 ${c.home.incomeRate}% · 기준 130% 이하`)
    : OK('1유형 시세 30~40% · 2유형 70~80%','혼인 7년 이내 또는 신생아 가구 · 1유형 최장 20년 2유형 14년',31,'추첨')},
  {n:'중기청 전월세보증금 대출', type:'loan', where:'주택도시기금 · 은행 방문', visit:'bank',
   chk:{d:'2026-09-08', src:'주택도시기금 중소기업취업청년 전월세보증금대출', lvl:'org', u:'https://nhuf.molit.go.kr/'},
   f:c=> !(c.work.on&&c.work.sme) ? NO('중소기업 재직자가 아닙니다')
    : c.age>34 ? NO(`만 ${c.age}세 · 기준 34세 이하`)
    : c.home.deposit>20000 ? NO(`보증금 ${c.home.deposit.toLocaleString()}만 · 기준 2억 이하`)
    : OK('최대 1억 · 연 1.5%','중소기업 재직 · 보증금 요건 충족',83,'심사',{cap:10000})},
  {n:'버팀목 전세자금대출', type:'loan', where:'주택도시기금 · 은행 방문', visit:'bank',
   chk:{d:'2026-09-08', src:'2026 버팀목 전세자금대출 조건', u:'https://brunch.co.kr/@anaskorea16/211'},
   f:c=> c.home.own ? NO('주택을 소유하고 있습니다')
    : !c.home.rent ? NO('임차 계약이 없습니다')
    : c.home.incomeRate>140 ? NO(`중위 ${c.home.incomeRate}% · 소득 기준 초과`)
    : OK('최대 2억','무주택 · 소득과 보증금 요건 충족',86,'심사',{cap:20000})},
  {n:'주택연금', type:'loan', where:'주택금융공사 · 지사 방문', visit:'office',
   chk:{d:'2026-09-08', src:'한국주택금융공사 주택연금', lvl:'org', u:'https://www.hf.go.kr/'},
   f:c=> !c.home.own ? NO('주택을 소유하고 있어야 합니다')
    : c.age<55 ? NO(`만 ${c.age}세 · 기준 55세 이상`)
    : OK('월 연금 수령','자가 보유 · 연령 요건 충족',80,'상담 후')}]},

{k:'cash', n:'현금·자산형성', items:[
  {n:'근로장려금', type:'cash', where:'홈택스 · 손택스', visit:'online',
   chk:{d:'2026-09-08', src:'2026 근로·자녀장려금 기준', u:'https://bileotools.com/blog/eitc-child-tax-credit-2026-guide'},
   f:c=> !c.work.on&&!c.biz.on&&!c.work.freelance ? NO('근로 또는 사업 소득이 없습니다')
    : c.biz.kind==='corp' ? NO('법인 대표는 지급 대상에서 제외됩니다')
    : c.home.incomeRate>120 ? NO(`중위 ${c.home.incomeRate}% · 소득 기준 초과`)
    : c.fam.married ? OK('홑벌이 연 최대 285만','배우자도 소득이 있으면 맞벌이 최대 330만 · 재산 1.7억 미만이면 전액',76,'신청 기간 내',{y:285})
    : OK('단독 연 최대 165만','재산 1.7억 미만이면 전액 · 2.4억 이상은 신청 불가',76,'신청 기간 내',{y:165})},
  {n:'자녀장려금', type:'cash', where:'홈택스 · 손택스', visit:'online',
   chk:{d:'2026-09-08', src:'2026 근로·자녀장려금 기준', u:'https://bileotools.com/blog/eitc-child-tax-credit-2026-guide'},
   f:c=> c.fam.kids===0 ? NO('부양 자녀가 없습니다')
    : c.biz.kind==='corp' ? NO('법인 대표는 지급 대상에서 제외됩니다')
    : c.home.incomeRate>120 ? NO(`중위 ${c.home.incomeRate}% · 소득 기준 초과`)
    : OK(`자녀 ${c.fam.kids}명 · 연 최대 ${c.fam.kids*100}만`,'부부합산 총소득 7,000만 미만 · 자녀 1명당 50~100만',78,'신청 기간 내',{y:c.fam.kids*100})},
  {n:'청년도약계좌', type:'cash', where:'은행 앱 또는 창구', visit:'online',
   chk:{d:'2026-09-08', src:'2026 청년도약계좌 기여금 인상', u:'https://www.dait90000.com/2026/09/youth-leap-account-government-contribution-expansion-2026.html'},
   f:c=> c.age>34 ? NO(`만 ${c.age}세 · 기준 34세 이하`)
    : !c.work.on&&!c.biz.on&&!c.work.freelance ? NO('소득이 확인되지 않습니다')
    : OK('정부기여금 월 최대 3.3만','총급여 7,500만 이하 · 소득 구간별 매칭 3.0~6.0%',88,'소득 구간별',{y:39.6})},
  {n:'희망저축계좌', type:'compete', where:'주민센터', visit:'center',
   chk:{d:'2026-09-08', src:'2026 희망저축계좌 Ⅰ·Ⅱ', u:'https://www.tossbank.com/articles/hope-savings-account-2026'},
   f:c=> !c.misc.welfare ? NO('기초생활수급 또는 차상위 가구가 아닙니다')
    : !c.work.on&&!c.biz.on ? NO('근로 또는 사업 소득이 있어야 합니다')
    : OK('Ⅰ유형 만기 1,440만 · Ⅱ유형 1,080만','본인 월 10만 × 36개월 + 정부 매칭 · 탈수급 또는 근로 유지 조건',85,'연 3~4회 모집',{max:1440})},
  {n:'기초연금', type:'cash', where:'주민센터 · 복지로', visit:'center',
   chk:{d:'2026-09-08', src:'국민연금공단 · 2026년 기초연금', u:'https://www.npsonair.kr/advantages/detail.html?strIdx=3761'},
   f:c=> c.age<65 ? NO(`만 ${c.age}세 · 기준 65세 이상`)
    : c.home.incomeRate>70 ? NO('소득인정액이 선정기준액을 초과합니다')
    : c.home.incomeRate<=50 ? OK('월 40만','2026년부터 중위소득 50% 이하 저소득 어르신은 40만',90,'신청 시',{y:480})
    : OK('월 최대 34만 9,700원','만 65세 이상 · 소득 하위 70% · 선정기준액 단독 247만',90,'신청 시',{y:419.6})}]},

{k:'tax', n:'세금·공과금', items:[
  {n:'중소기업 취업자 소득세 감면', type:'save', where:'회사 제출 · 원천징수의무자 경유', visit:'company',
   chk:{d:'2026-09-08', src:'뉴스핌 · 2026 일몰조세 심층평가', u:'https://www.newspim.com/news/view/20260510000101'},
   f:c=> c.biz.kind==='corp'&&!c.work.on ? NO('법인 대표는 감면 대상에서 제외됩니다')
    : !c.work.on ? NO('근로소득이 없습니다')
    : !c.work.smeType ? NO('감면 대상 업종이 아닙니다')
    : c.work.taxRelief ? NO('이미 적용받고 있습니다')
    : OK('연 200만 한도 · 청년 5년 90%','미신청 · 2026.12.31 일몰 예정이고 연장 여부는 아직 정해지지 않았습니다',97,'신청만 하면',{y:200})},
  {n:'창업중소기업 세액감면', type:'save', where:'홈택스 · 종합소득세 또는 법인세 신고 시', visit:'online',
   chk:{d:'2026-09-08', src:'2026년 달라진 창업중소기업 세액감면', u:'https://taxly.kr/post/1637'},
   f:c=>{ if(!c.biz.on) return NO('사업자가 아닙니다');
     if(c.biz.years>5) return NO(`업력 ${c.biz.years}년 · 최초 소득 발생 후 5년간`);
     const startAge=c.age-c.biz.years;                       /* 창업 당시 나이 */
     const young=startAge<=34;
     const zone=/^(서울|인천)/.test(c.region)?'과밀':/^경기/.test(c.region)?'성장관리':'비수도권';
     const rate=young ? (zone==='비수도권'?100:zone==='성장관리'?75:50)
                      : (zone==='비수도권'?50:zone==='성장관리'?25:0);
     if(!rate) return NO(`일반창업 · ${c.region.split(' ')[0]}은 과밀억제권역이라 감면 대상이 아닙니다`);
     return OK(`소득세·법인세 ${rate}% 감면 · 5년`,
       `창업 당시 만 ${startAge}세 · ${young?'청년창업':'일반창업'} · ${zone} · 부동산임대와 소비성서비스업은 제외`,
       92,'신고 시 적용'); }},
  {n:'경정청구 · 미신청 감면 소급', type:'cash', where:'홈택스', visit:'online',
   chk:{d:'2026-09-08', src:'국세청 경정청구 안내', lvl:'org', u:'https://www.nts.go.kr/'},
   f:c=> c.biz.kind==='corp'&&!c.work.on ? NO('감면 대상이 아니라 소급분이 없습니다')
    : !c.work.on ? NO('근로소득이 없습니다')
    : c.work.taxRelief ? NO('이미 적용 중이라 소급분이 없습니다')
    : OK('최대 5년치','미신청 기간에 대해 소급 청구할 수 있습니다',92,'5년 이내')},
  {n:'전기요금 할인', type:'save', where:'한전 · 온라인 신청 · 123', visit:'online',
   chk:{d:'2026-09-08', src:'2026 전기요금 복지할인 안내', u:'https://khpman.com/entry/전기요금-복지할인-신청-방법'},
   f:c=> (c.fam.kids>=3||c.misc.disabled||c.misc.single||c.misc.welfare)
      ? OK('월 최대 1.6만 · 하계 2만', c.misc.welfare?'수급 가구':c.misc.single?'한부모 가구':c.fam.kids>=3?'다자녀 가구':'장애 가구',95,'신청 시',{y:19.2})
    : NO('다자녀·장애·한부모·수급 등 대상에 해당하지 않습니다')},
  {n:'통신요금 감면', type:'save', where:'통신사 · 주민센터 · 정부24', visit:'center',
   chk:{d:'2026-09-08', src:'2026 통신비 감면 혜택 정리', u:'https://money-info.kr/12'},
   f:c=> (c.misc.disabled||c.misc.welfare) ? OK('월 최대 2.6만', c.misc.welfare?'수급 가구':'장애 등록',95,'신청 시',{y:31.2})
    : c.age>=65 ? OK('월 최대 1.1만','만 65세 이상 · 기초연금 수급자 대상',90,'기초연금 수급 후',{y:13.2})
    : NO('감면 대상 계층에 해당하지 않습니다')},
  {n:'에너지바우처', type:'cash', where:'주민센터 · 복지로', visit:'center',
   chk:{d:'2026-09-08', src:'2026 에너지바우처 안내', u:'https://www.tossbank.com/articles/2026-energy-voucher'},
   f:c=>{ if(!c.misc.welfare) return NO('기초생활수급 또는 차상위 계층이 아닙니다');
     if(!(c.age>=65||c.misc.disabled||c.fam.infant||c.fam.pregnant||c.misc.chronic))
       return NO('수급 가구 중 노인 · 장애인 · 영유아 · 임산부 · 중증질환자가 있어야 합니다');
     const n=1+(c.fam.married?1:0)+c.fam.kids, v=[29.5,40.7,53.2,70.1][Math.min(3,n-1)];
     return OK(`연 ${v}만`,`수급 가구 · ${n}인 세대 기준`,95,'6~12월 신청',{y:v}); }},
  {n:'주거급여', type:'cash', where:'주민센터 · 복지로', visit:'center',
   chk:{d:'2026-09-08', src:'2026 주거급여 기준임대료', u:'https://bokjijiwon.com/housing-benefit/'},
   f:c=>{ if(!c.misc.welfare) return NO(`중위 ${c.home.incomeRate}% · 기준 48% 이하`);
     if(!c.home.rent) return NO('임차 가구가 아닙니다');
     const G=['1급지 서울','2급지 경기·인천','3급지 광역시·세종','4급지 그 외'];
     const g=/^서울/.test(c.region)?0:/^(경기|인천)/.test(c.region)?1
            :/^(부산|대구|광주|대전|울산|세종)/.test(c.region)?2:3;
     const T=[[36.9,41.4,49.3,57.1,59.0,70.0],[30.0,33.7,40.1,46.4,48.0,56.9],
              [24.7,27.7,33.0,38.2,39.5,46.8],[21.2,23.8,28.3,32.8,34.0,40.2]];
     const n=Math.min(6, 1+(c.fam.married?1:0)+c.fam.kids), r=T[g][n-1];
     return OK(`월 최대 ${r}만`,`${G[g]} · ${n}인 가구 기준임대료 · 소득에 따라 자기부담분이 차감됩니다`,93,'신청 시',{y:+(r*12).toFixed(1)}); }}]},

{k:'move', n:'교통·문화', items:[
  {n:'K-패스', type:'save', where:'K-패스 앱 · 카드사', visit:'online',
   chk:{d:'2026-09-08', src:'2026 하반기 K-패스 환급 확대', u:'https://www.dait90000.com/2026/09/k-pass-public-transport-refund-expansion-multi-child-benefit-2026.html'},
   f:c=>{ if(c.age<19) return NO('만 19세 이상 대상입니다');
     const r = c.misc.welfare?53.3 : c.fam.kids>=3?50 : c.fam.kids===2?30 : c.age<=34?30 : 20;
     const lab = c.misc.welfare?'저소득층':c.fam.kids>=3?'3자녀 이상':c.fam.kids===2?'2자녀':c.age<=34?'청년 만 19~34세':'일반';
     return OK(`교통비 ${r}% 환급`,`${lab} 구간 · 월 15회 이상 이용 시 · 월 60회까지`,93,'신청만 하면',{y:+(7*r/100*12).toFixed(1)}); }},
  {n:'기후동행카드', type:'save', where:'서울교통공사 · 편의점', visit:'online',
   chk:{d:'2026-09-08', src:'서울시 기후동행카드', lvl:'org', u:'https://news.seoul.go.kr/traffic/archives/509734'},
   f:c=> !c.region.startsWith('서울') ? NO(`${c.region} 거주 · 서울 지역 이용권`)
    : OK('월 6.5만 무제한','서울 거주 · 대중교통 이용',90,'구매 시')},
  {n:'문화누리카드', type:'cash', where:'주민센터 · 문화누리', visit:'center',
   chk:{d:'2026-09-08', src:'2026 문화누리카드 안내', u:'https://asiatop.co.kr/gov-support/culture-nuri-card-2026-eligibility/'},
   f:c=> c.misc.welfare ? OK('연 15만','기초생활수급 · 법정 차상위 · 만 6세 이상',95,'2~11월 발급',{y:15})
    : NO('기초생활수급 또는 차상위 계층이 아닙니다')},
  {n:'스포츠강좌이용권', type:'cash', where:'주민센터', visit:'center',
   chk:{d:'2026-09-08', src:'국민체육진흥공단 스포츠강좌이용권', lvl:'org', u:'https://svoucher.kspo.or.kr/'},
   f:c=> c.fam.kids===0 ? NO('대상 아동이 없습니다')
    : !c.misc.welfare&&!c.misc.single ? NO('기초생활수급 또는 차상위 가구가 아닙니다')
    : OK('월 10만 · 아동당','수급 또는 한부모 가구',90,'신청 시',{y:120*c.fam.kids})}]},

{k:'job', n:'일자리·훈련', items:[
  {n:'실업급여', type:'cash', where:'고용센터 방문 · 워크넷 선행', visit:'office',
   chk:{d:'2026-09-08', src:'2026 실업급여 상한 68,100원 · 하한 66,048원', u:'https://bileotools.com/blog/unemployment-benefit-calculation-2026'},
   f:c=>{ if(c.work.on&&c.work.quit!=='soon') return NO('재직 중에는 신청할 수 없습니다');
     if(c.work.quit==='self') return NO('자발적 퇴사는 수급 대상이 아닙니다');
     if(c.work.insured<180) return NO(`피보험 단위기간 ${c.work.insured}일 · 기준 180일 이상`);
     const days=c.work.insured>=1200?210:150, low=Math.round(days*66048/10000);
     if(c.biz.on) return OK(`${days}일 · 최소 ${low.toLocaleString()}만`,'사업자 휴업 또는 폐업 처리가 선행돼야 합니다',70,'선행 조건 필요');
     return OK(`${days}일 · ${low.toLocaleString()}~${Math.round(days*68100/10000).toLocaleString()}만`,
       `피보험 단위기간 ${c.work.insured}일 · 1일 하한 66,048원 상한 68,100원`,94,'요건 충족 시',{once:low}); }},
  {n:'국민취업지원제도', type:'cash', where:'고용센터 · 온라인', visit:'office',
   chk:{d:'2026-09-08', src:'2026 국민취업지원제도 1유형', u:'https://blog.kwt.co.kr/%EA%B5%AD%EB%AF%BC%EC%B7%A8%EC%97%85%EC%A7%80%EC%9B%90%EC%A0%9C%EB%8F%84-2026%EB%85%84-%EC%B4%9D%EC%A0%95%EB%A6%AC-%EC%9B%94-60%EB%A7%8C%EC%9B%90-%EA%B5%AC%EC%A7%81%EC%B4%89%EC%A7%84%EC%88%98/'},
   f:c=> c.work.on&&c.work.quit!=='soon' ? NO('구직 상태가 아닙니다')
    : c.age>69 ? NO(`만 ${c.age}세 · 기준 15~69세`)
    : c.home.incomeRate>60 ? NO(`중위 ${c.home.incomeRate}% · Ⅰ유형 기준 60% 이하`)
    : OK('월 60만 · 6개월 · 최대 360만','Ⅰ유형 · 중위 60% 이하 · 부양가족 1인당 월 10만 추가',72,'심사',{once:360})},
  {n:'국민내일배움카드', type:'admin', where:'고용24 · 고용센터', visit:'online',
   chk:{d:'2026-09-08', src:'2026 국민내일배움카드 안내', u:'https://grantinfo.co.kr/national-learning-card-2026-guide/'},
   f:c=> c.age>=75 ? NO('연령 상한을 초과했습니다')
    : OK('훈련비 300~500만','5년간 사용 · 재직 중에도 발급 · 훈련별 자부담이 있습니다',91,'요건 충족 시')},
  {n:'임금체불 대지급금', type:'cash', where:'고용노동부 · 근로복지공단', visit:'office',
   chk:{d:'2026-09-08', src:'찾기쉬운 생활법령 · 대지급금', u:'https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=1694&ccfNo=3&cciNo=3&cnpClsNo=1'},
   f:c=> !c.work.on&&c.work.insured===0 ? NO('근로 관계가 확인되지 않습니다')
    : c.misc.unpaid ? OK('간이 최대 1,000만 · 도산 최대 3,150만','체불 확인 · 사업주가 못 주면 국가가 대신 지급',82,'확정 후',{once:1000})
    : NO('체불 사실이 확인되지 않습니다')},
  {n:'청년일자리도약장려금', type:'compete', where:'고용노동부 · 고용24', visit:'online',
   chk:{d:'2026-09-08', src:'2026 청년일자리도약장려금 안내', u:'https://www.tossbank.com/articles/youth-employment-subsidy'},
   f:c=> !c.biz.on ? NO('사업주가 아닙니다')
    : c.biz.emp===0&&!c.biz.hire ? NO('상시근로자가 없습니다')
    : /^(서울|경기|인천)/.test(c.region)&&c.biz.emp<5 ? NO(`수도권형은 상시근로자 5명 이상 · 현재 ${c.biz.emp}명`)
    : OK('기업 1년간 최대 720만','정규직 · 주 28시간 이상 · 월 급여 450만 이하',72,'채용 후',{max:720})},
  {n:'노인일자리', type:'compete', where:'주민센터 · 시니어클럽', visit:'center',
   chk:{d:'2026-09-08', src:'2026 노인일자리 유형별 활동비', u:'https://minwoninfo.co.kr/2026-%EB%85%B8%EC%9D%B8%EC%9D%BC%EC%9E%90%EB%A6%AC-%EC%8B%A0%EC%B2%AD-%EB%B0%A9%EB%B2%95-%EC%B4%9D%EC%A0%95%EB%A6%AC-%EC%9B%94-%EC%B5%9C%EB%8C%80-76%EB%A7%8C%EC%9B%90%C2%B7115%EB%A7%8C%EA%B0%9C/'},
   f:c=> c.age<65 ? NO(`만 ${c.age}세 · 기준 65세 이상`)
    : OK('공익 월 29만 · 사회서비스 월 59.4만','시장형은 최대 76만 · 공익활동은 기초연금 수급자 대상',85,'모집 시',{max:348})}]},

{k:'care', n:'양육·교육', items:[
  {n:'부모급여', type:'cash', where:'주민센터 · 복지로', visit:'center',
   chk:{d:'2026-09-08', src:'2026 부모급여·아동수당·첫만남이용권 정리', u:'https://welfare-mom.com/korea-child-benefit-guide-2026/'},
   f:c=> c.fam.kids===0 ? NO('자녀가 없습니다')
    : !c.fam.infant ? NO('만 2세 이하 영아가 없습니다')
    : OK('0세 월 100만 · 1세 월 50만','자녀 나이에 따라 갈립니다 · 어린이집 이용 시 차액 지급',99,'자동 지급',{y:600})},
  {n:'아동수당', type:'cash', where:'주민센터 · 복지로', visit:'center',
   chk:{d:'2026-09-08', src:'2026 부모급여·아동수당·첫만남이용권 정리', u:'https://welfare-mom.com/korea-child-benefit-guide-2026/'},
   f:c=> c.fam.kids===0 ? NO('자녀가 없습니다')
    : OK(`자녀 ${c.fam.kids}명 · 월 ${10*c.fam.kids}만`,'2026년부터 만 9세 미만으로 확대',99,'자동 지급',{y:120*c.fam.kids})},
  {n:'한부모 아동양육비', type:'cash', where:'주민센터', visit:'center',
   chk:{d:'2026-09-08', src:'2026 한부모가족 아동양육비', u:'https://www.tndlrs.com/2026/08/single-parentchild.html'},
   f:c=> !c.misc.single ? NO('한부모 가구가 아닙니다')
    : c.home.incomeRate>65 ? NO(`중위 ${c.home.incomeRate}% · 기준 65% 이하`)
    : OK(`자녀 ${c.fam.kids}명 · 월 ${c.fam.kids*23}만`,'중위소득 65% 이하 · 만 18세 미만 자녀',94,'신청 시',{y:c.fam.kids*23*12})},
  {n:'첫만남이용권', type:'cash', where:'주민센터 · 복지로', visit:'center',
   chk:{d:'2026-09-08', src:'2026 첫만남이용권 안내', u:'https://www.tndlrs.com/2026/08/FirstChildVoucher.html'},
   f:c=> c.fam.pregnant ? OK('첫째 200만 · 둘째 이상 300만','출생 후 1년 이내 신청 · 2년 안에 안 쓰면 소멸',99,'출생 신고 시',{once:200})
    : c.fam.infant ? LOST('200만','출생 후 1년이 지나 신청 기간이 끝났습니다',{once:200})
    : NO('출산 예정이나 해당 영아가 없습니다')},
  {n:'임신출산 진료비', type:'cash', where:'국민행복카드 · 은행 방문', visit:'bank',
   chk:{d:'2026-09-08', src:'2026 출산 지원금 총정리', u:'https://www.jptcalc.kr/blog/posts/childbirth-support-guide.html'},
   f:c=> c.fam.pregnant ? OK('100만 · 다태아 140만','임신 확인 후 신청',99,'출산 전',{once:100})
    : NO('임신이 확인되지 않습니다')},
  {n:'보육료 지원', type:'save', where:'복지로 · 아이사랑 · 주민센터', visit:'center',
   chk:{d:'2026-09-08', src:'2026 어린이집 보육료 지원', u:'https://livinginfoweb.com/entry/어린이집-보육료-지원-2026'},
   f:c=> c.fam.kids===0 ? NO('자녀가 없습니다')
    : c.fam.infant ? OK('0세 월 51.4만 · 1세 45.2만 · 2세 37.5만','소득 제한 없이 전 계층 무상 · 아이행복카드 발급이 선행',97,'등록 시',{y:452*0.12})
    : OK('3~5세 월 28만 · 누리과정','소득 제한 없이 전 계층 무상 · 어린이집 등록 후 적용',97,'등록 시',{y:336})},
  {n:'국가장학금', type:'compete', where:'한국장학재단', visit:'online',
   chk:{d:'2026-09-08', src:'2026 국가장학금 소득구간별 지원금액', u:'https://blog.kwt.co.kr/2026-국가장학금-신청기간-총정리소득분위별-지원금액/'},
   f:c=>{ if(!c.fam.college) return NO('대학 재학생이 없습니다');
     if(c.misc.welfare) return OK('등록금 전액','기초·차상위 전액 지원',90,'학기별 신청',{y:600});
     const v = c.home.incomeRate<=90?600 : c.home.incomeRate<=140?440 : c.home.incomeRate<=200?360 : 100;
     return OK(`연 최대 ${v}만`,`소득구간 추정 · 3자녀 이상 셋째부터는 8구간까지 전액`,80,'학기별 신청',{y:v}); }}]},

{k:'med', n:'의료·건강', items:[
  {n:'재난적의료비 지원', type:'compete', where:'건강보험공단 지사', visit:'office',
   chk:{d:'2026-09-08', src:'국민건강보험공단 · 재난적의료비 안내', u:'https://www.nhis.or.kr/static/html/wbma/c/wbmac0222.html'},
   f:c=> !c.misc.medicalHigh ? NO('연간 의료비가 소득 대비 기준을 넘지 않습니다')
    : c.home.incomeRate>100 ? NO(`중위 ${c.home.incomeRate}% · 기준 100% 이하`)
    : OK('연 2,000만 · 개별심사 시 3,000만','본인부담상한제 적용 밖 금액의 50% · 퇴원 후 180일 이내 신청',68,'심사',{max:2000})},
  {n:'산정특례', type:'save', where:'병원 · 건강보험공단', visit:'office',
   chk:{d:'2026-09-08', src:'국민건강보험공단 산정특례', lvl:'org', u:'https://www.nhis.or.kr/'},
   f:c=> !c.misc.chronic ? NO('중증질환 등록 이력이 없습니다')
    : OK('본인부담 5~10%','등록 질환 대상',90,'등록 시')},
  {n:'난임 시술 지원', type:'admin', where:'주민센터 · 보건소', visit:'center',
   chk:{d:'2026-09-08', src:'보건복지부 난임부부 시술비 지원', lvl:'org', u:'https://www.bokjiro.go.kr/'},
   f:c=> !c.fam.married ? NO('대상 요건에 해당하지 않습니다')
    : c.age>44 ? NO('여성 연령 기준을 확인해야 합니다')
    : CHK('회당 최대 110만','지자체별 지원 횟수를 확인해야 합니다')},
  {n:'건강검진 · 암검진', type:'save', where:'지정 검진기관', visit:'online',
   chk:{d:'2026-09-08', src:'국민건강보험공단 건강검진', lvl:'org', u:'https://www.nhis.or.kr/'},
   f:c=> OK('본인부담 없음 또는 10%','건강보험 가입자 대상',95,'대상 연도')}]},

{k:'target', n:'대상 특화', items:[
  {n:'장애인연금 · 활동지원', type:'cash', where:'주민센터', visit:'center',
   chk:{d:'2026-09-08', src:'보건복지부 보도자료 · 2026 장애인연금', u:'https://www.mohw.go.kr/board.es?mid=a10503010200&bid=0027&act=view&list_no=1488505'},
   f:c=> !c.misc.disabled ? NO('장애 등록이 확인되지 않습니다')
    : OK('월 최대 43만 9,700원','기초급여와 부가급여 합산 · 중증장애인 소득 하위 70%',90,'신청 시',{y:527.6})},
  {n:'한부모가족 증명서', type:'admin', where:'주민센터', visit:'center',
   chk:{d:'2026-09-08', src:'2026 한부모가족 아동양육비', u:'https://www.tndlrs.com/2026/08/single-parentchild.html'},
   f:c=> !c.misc.single ? NO('한부모 가구가 아닙니다')
    : c.home.incomeRate>65 ? NO(`중위 ${c.home.incomeRate}% · 기준 65% 이하`)
    : OK('각종 감면의 전제','발급받아야 다른 지원을 신청할 수 있습니다',95,'신청 시')},
  {n:'장기요양보험', type:'save', where:'건강보험공단 지사', visit:'office',
   chk:{d:'2026-09-08', src:'2026 장기요양 등급별 월 한도액', u:'https://yoyang24.co.kr/2026년-등급별-월-한도액-monthly-limit-by-care-grade/'},
   f:c=> c.age<65 ? NO(`만 ${c.age}세 · 기준 65세 이상`)
    : !c.misc.care ? CHK('재가급여 월 67~251만','거동 불편이 있으시면 등급 판정을 신청하실 수 있습니다')
    : OK('재가급여 월 한도 1등급 251만 ~ 5등급 121만','한도 내 본인부담 15% · 초과분은 전액 본인 부담',78,'등급 판정',{y:1208.9*12*0.85/100})},
  {n:'보훈 · 병역 지원', type:'cash', where:'보훈지청', visit:'office',
   chk:{d:'2026-09-08', src:'국가보훈부', lvl:'org', u:'https://www.mpva.go.kr/'},
   f:c=> NO('보훈 대상 또는 복무 중이 아닙니다')}]},

{k:'debt', n:'채무·재기', items:[
  {n:'신속채무조정', type:'admin', where:'신용회복위원회', visit:'office',
   chk:{d:'2026-09-08', src:'2026 채무조정 6가지 비교', u:'https://www.ddok.life/blog/posts/debt-adjustment-complete-guide-2026'},
   f:c=> c.credit.arrears>=30 ? NO('연체 30일을 넘어 프리워크아웃 이후 단계입니다')
    : (c.credit.drop<-40||c.credit.multi||c.credit.dsr>70)
      ? OK('이자율 조정 · 상환 유예','연체 30일 이하 단계 · 원금 감면은 없습니다 · 신청비 약 5만원',80,'심사')
      : NO('연체 우려 신호가 확인되지 않습니다')},
  {n:'이자율 채무조정 · 프리워크아웃', type:'admin', where:'신용회복위원회', visit:'office',
   chk:{d:'2026-09-08', src:'2026 채무조정 6가지 비교', u:'https://www.ddok.life/blog/posts/debt-adjustment-complete-guide-2026'},
   f:c=> c.credit.arrears>=31&&c.credit.arrears<=89 ? OK('금리 30~70% 인하','연체 30~89일 구간 · 원금 감면은 없습니다 · 신청비 약 5만원',82,'심사')
    : c.credit.arrears>89 ? NO('연체 90일 초과 · 개인워크아웃 대상입니다')
    : NO(`연체 ${c.credit.arrears}일 · 기준 31일 이상`)},
  {n:'개인워크아웃', type:'admin', where:'신용회복위원회', visit:'office',
   chk:{d:'2026-09-08', src:'2026 채무조정 6가지 비교', u:'https://www.ddok.life/blog/posts/debt-adjustment-complete-guide-2026'},
   f:c=> c.credit.arrears<90 ? NO(`연체 ${c.credit.arrears}일 · 기준 90일 이상`)
    : OK('이자 전액 면제 · 원금 최대 70% 감면','취약계층은 최대 90% · 신청비 약 5만원 · 금융과 통신 채무만 대상',78,'심사')},
  {n:'개인회생', type:'admin', where:'법원 · 법률구조공단 경유 권장', visit:'office',
   chk:{d:'2026-09-08', src:'2026 채무조정 6가지 비교', u:'https://www.ddok.life/blog/posts/debt-adjustment-complete-guide-2026'},
   f:c=> c.credit.arrears<90&&c.credit.dsr<80 ? NO('상환 곤란이 확인되지 않습니다')
    : !c.work.on&&!c.biz.on&&!c.work.freelance ? NO('계속적인 소득이 있어야 신청할 수 있습니다')
    : OK('원금 최대 97% 감면 · 3~5년 변제','사채와 세금까지 포함 · 법원 절차라 수임료와 법원비용이 듭니다',70,'법원 인가')},
  {n:'법률구조공단 지원', type:'admin', where:'법률구조공단 지부 · 132', visit:'office',
   chk:{d:'2026-09-08', src:'대한법률구조공단', lvl:'org', u:'https://www.klac.or.kr/'},
   f:c=> c.credit.arrears<90&&c.credit.dsr<80 ? NO('해당 상황이 확인되지 않습니다')
    : c.home.incomeRate>125 ? NO(`중위 ${c.home.incomeRate}% · 지원 기준 125% 이하`)
    : OK('신청서 작성까지 지원','법무법인에 맡기면 200~300만 원이 드는 절차입니다',85,'상담 후')},
  {n:'희망리턴패키지', type:'compete', where:'소진공 지역센터 · 폐업 신고 전', visit:'office',
   chk:{d:'2026-09-08', src:'소진공 희망리턴패키지', lvl:'org', u:'https://www.sbiz.or.kr/'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.close ? OK('최대 2,000만','폐업 신고 전에 상담을 받아야 합니다',78,'상담 후',{max:2000})
    : CHK('최대 2,000만','폐업을 고려하실 때 신고 전에 상담을 받으셔야 합니다')},
  {n:'새출발기금', type:'loan', where:'캠코 · 온라인', visit:'online',
   chk:{d:'2026-09-08', src:'2026 채무조정 6가지 비교', u:'https://www.ddok.life/blog/posts/debt-adjustment-complete-guide-2026'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.credit.arrears<90&&c.credit.dsr<70 ? NO('연체 또는 상환 곤란이 확인되지 않습니다')
    : OK('원금 최대 90% 감면','소상공인·자영업자 90일 이상 연체 · 신청 비용 없음',72,'심사')}]},

{k:'start', n:'창업 지원', items:[
  {n:'예비창업패키지', type:'compete', where:'K-Startup', visit:'online',
   chk:{d:'2026-09-08', src:'2026년도 예비창업패키지 모집공고', u:'https://www.venturesquare.net/announcement/1041449'},
   f:c=> c.biz.on ? LOST('최대 1억','사업자등록으로 자격이 소멸했습니다',{max:10000})
    : !c.biz.plan ? NO('창업 준비 여부가 확인되지 않습니다 · 준비 중이시면 알려주세요')
    : OK('최대 1억 · 평균 4,000만','1단계 2,000만 + 중간평가 후 2단계 · 사업자등록 전에만',38,'49 : 1',{max:10000})},
  {n:'초기창업패키지', type:'compete', where:'K-Startup', visit:'online',
   chk:{d:'2026-09-08', src:'2026년 초기창업패키지 모집 공고 분석', u:'https://www.nextunicorn.kr/insight/69246d75f5fa2699'},
   f:c=> !c.biz.on ? NO('사업자등록 후 신청할 수 있습니다')
    : c.biz.kind!=='corp' ? NO(`${c.biz.ksic}는 제외 업종입니다`)
    : c.biz.years>3 ? NO(`업력 ${c.biz.years}년 · 기준 3년 이내`)
    : OK('최대 1억 · 딥테크 특화형 1.5억','창업 3년 미만 · 2026년 딥테크형 신설',52,'9 : 1',{max:10000})},
  {n:'창업도약패키지', type:'compete', where:'K-Startup', visit:'online',
   chk:{d:'2026-09-08', src:'2026 창업지원금 총정리 · 유형별 한도', u:'https://openads.co.kr/content/contentDetail?contsId=18496'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.kind!=='corp' ? NO('제외 업종입니다')
    : c.biz.years<3 ? NO(`업력 ${c.biz.years}년 · 초기창업 구간입니다`)
    : c.biz.years>7 ? NO('업력 7년을 초과했습니다')
    : OK('일반형 최대 3억','대기업협업 2억 · 투자병행 2억 · 딥테크 2억 · 1개 유형만 신청',41,'12 : 1',{max:30000})},
  {n:'창업성장 R&D · 디딤돌', type:'compete', where:'K-Startup · IRIS', visit:'online',
   chk:{d:'2026-09-08', src:'2026 창업성장기술개발사업(디딤돌) 공고', u:'https://tlo.korea.ac.kr/support-projects/2702'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.kind!=='corp' ? NO('제외 업종입니다')
    : c.biz.years>7 ? NO(`업력 ${c.biz.years}년 · 기준 7년 이하`)
    : c.biz.rev>=200000 ? NO(`매출 ${(c.biz.rev/10000).toFixed(1)}억 · 기준 20억 미만`)
    : OK('과제당 최대 2억', c.biz.ip?'업력 7년 이하 · 매출 20억 미만 · 지식재산권 보유 가점':'업력 7년 이하 · 매출 20억 미만 · 기술성 증빙 부족', c.biz.ip?47:23,'7 : 1',{max:20000})},
  {n:'청년창업사관학교', type:'compete', where:'K-Startup', visit:'online',
   chk:{d:'2026-09-08', src:'2026 청년창업사관학교 안내', u:'https://www.tndlrs.com/2026/08/sesac.html'},
   f:c=> c.age>39 ? NO(`만 ${c.age}세 · 기준 39세 이하`)
    : !c.biz.on&&!c.biz.plan ? NO('창업자 또는 예비창업자가 아닙니다')
    : c.biz.on&&c.biz.kind!=='corp' ? NO('기술창업 분야 대상입니다')
    : OK('최대 1억 · 자부담 30% 이상','만 39세 이하 · 업력 3년 이내 · 경험창업자는 7년 이내',44,'11 : 1',{max:10000})},
  {n:'TIPS', type:'compete', where:'운영사 추천 후 K-Startup', visit:'online',
   chk:{d:'2026-09-08', src:'2026년 팁스 창업기업 지원계획 공고', lvl:'org', u:'https://www.k-startup.go.kr/'},
   f:c=> c.biz.on&&c.biz.kind!=='corp' ? NO('기술창업 분야 대상입니다')
    : NO('운영사 추천이 선행돼야 합니다')},
  {n:'벤처기업 확인', type:'admin', where:'벤처확인종합관리시스템', visit:'online',
   chk:{d:'2026-09-08', src:'벤처확인종합관리시스템', lvl:'org', u:'https://www.smes.go.kr/venturein/'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.venture ? NO('이미 확인받았습니다')
    : c.biz.ip ? OK('세제감면 · 가점','기술평가 기반 신청 가능',64,'평가')
    : NO('기술평가 또는 투자 요건을 충족하지 못합니다')},
  {n:'혁신창업사업화자금', type:'loan', where:'중진공 · 정책자금 내비게이션', visit:'office',
   chk:{d:'2026-09-08', src:'2026 중진공 정책자금 6종', u:'https://seomin.kr/kosmes-overview/'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.kind!=='corp' ? NO('소상공인 정책자금 대상입니다')
    : c.biz.years>=7 ? NO(`업력 ${c.biz.years}년 · 기준 7년 미만`)
    : OK('운전 5억 · 시설 60억','업력 7년 미만 창업기업 · 운전 5년 시설 10년 상환',65,'심사',{cap:50000})},
  {n:'청년전용창업자금', type:'loan', where:'중진공 · 직접대출', visit:'office',
   chk:{d:'2026-09-08', src:'2026 중진공 정책자금 6종', u:'https://seomin.kr/kosmes-overview/'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.age>39 ? NO(`대표자 만 ${c.age}세 · 기준 39세 이하`)
    : c.biz.years>=3 ? NO(`업력 ${c.biz.years}년 · 기준 3년 미만`)
    : OK('최대 1억 · 연 2.5% 고정','만 39세 이하 · 업력 3년 미만 · 제조와 중점분야는 2억',70,'심사',{cap:10000})},
  {n:'상표 출원', type:'admin', where:'특허로 · 변리사 상담 권장', visit:'online',
   chk:{d:'2026-09-08', src:'특허청 특허로', lvl:'org', u:'https://www.patent.go.kr/'},
   f:c=> !c.biz.on&&!c.biz.plan ? NO('사업자 또는 예비창업자가 아닙니다')
    : OK('출원료 실비','브랜드 보호 · 다수 사업 가점 항목',90,'상시')}]},

{k:'small', n:'소상공인·농어업', items:[
  {n:'소상공인 정책자금', type:'loan', where:'소상공인정책자금 누리집 · 지역센터', visit:'office',
   chk:{d:'2026-09-08', src:'2026 소상공인 정책자금 한도·금리', u:'https://brunch.co.kr/@af3987f9ff78481/33'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.kind==='corp' ? NO('중소기업 자금 대상입니다')
    : c.misc.arrear ? NO('체납 또는 연체 해소가 선행돼야 합니다')
    : c.biz.rev>30000 ? NO(`매출 ${(c.biz.rev/10000).toFixed(1)}억 · 기준 3억 이하`)
    : OK('최대 7,000만','매출 3억 미만 · 소상공인 기준 충족',60,'예산 소진 전',{cap:7000})},
  {n:'경영안정자금', type:'loan', where:'소상공인정책자금 누리집', visit:'online',
   chk:{d:'2026-09-08', src:'2026 소진공 정책자금 종류·금리', u:'https://sbfc.kr/semas-policy-fund/'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : !c.biz.revDown ? NO('매출 감소가 확인되지 않습니다')
    : OK('최대 7,000만','매출 감소 증빙 자동 제출',71,'요건 충족 시',{cap:7000})},
  {n:'성장기반자금 · 시설자금', type:'loan', where:'소상공인정책자금 누리집 · 지역센터', visit:'office',
   chk:{d:'2026-09-08', src:'2026 소진공 정책자금 종류·금리', u:'https://sbfc.kr/semas-policy-fund/'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.kind==='corp' ? NO('중진공 자금 대상입니다')
    : c.misc.arrear ? NO('체납 또는 연체 해소가 선행돼야 합니다')
    : OK('최대 5억','시설과 장비 구입 · 점포 확장에 씁니다 · 일반 운전자금과 별도',55,'심사',{cap:50000})},
  {n:'스마트상점 기술보급', type:'compete', where:'소상공인마당', visit:'online',
   chk:{d:'2026-09-08', src:'2026 스마트상점 기술보급사업 공고', u:'https://www.sbiz.or.kr/smst/index.do'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.kind!=='solo' ? NO('오프라인 점포 대상입니다')
    : OK('최대 500만','오프라인 점포 보유',58,'4 : 1',{max:500})},
  {n:'온라인 판로 지원', type:'compete', where:'소상공인마당', visit:'online',
   chk:{d:'2026-09-08', src:'소상공인마당', lvl:'org', u:'https://www.sbiz.or.kr/'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : !c.biz.tongsin ? NO('통신판매업 신고가 필요합니다')
    : OK('최대 500만','통신판매업 신고 완료',64,'3 : 1',{max:500})},
  {n:'노란우산공제', type:'save', where:'중소기업중앙회 · 은행', visit:'bank',
   chk:{d:'2026-09-08', src:'2026 노란우산공제 한도·대상', u:'https://www.easyzetec.com/blog/noran-umbrella-mutual-aid-self-employed-2026'},
   f:c=>{ if(!c.biz.on&&!c.work.freelance) return NO('사업자 또는 프리랜서가 아닙니다');
     if(c.biz.noran) return NO('이미 가입돼 있습니다');
     const inc=c.biz.rev, lim = inc<=4000?600 : inc<=6000?500 : inc<=10000?400 : 200;
     return OK(`연 최대 ${lim}만 소득공제`,`사업소득 구간별 한도 · 월 5~100만 납입 · 폐업 시 공제금 수령`,95,'가입 시'); }},
  {n:'백년가게', type:'compete', where:'소상공인마당', visit:'online',
   chk:{d:'2026-09-08', src:'소상공인마당 백년가게', lvl:'org', u:'https://www.sbiz.or.kr/'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다') : NO('업력 30년 요건을 충족하지 못합니다')},
  {n:'농업직불금 · 청년농 영농정착', type:'compete', where:'농관원 · 농지소재지', visit:'office',
   chk:{d:'2026-09-08', src:'2026 청년농 영농정착지원금', u:'https://myfarmfix.com/2026-young-farmer-support-policy-guide/'},
   f:c=> !c.misc.farm ? NO('농업경영체 등록이 없습니다')
    : c.age>=40 ? NO(`만 ${c.age}세 · 청년농 기준 40세 미만`)
    : OK('1년차 월 110만 · 2년차 100만 · 3년차 90만','만 18~40세 미만 · 독립경영 3년 이하 · 연 160시간 의무교육',80,'선발',{max:3600})}]},

{k:'emp', n:'고용·정책금융', items:[
  {n:'두루누리 사회보험료', type:'cash', where:'근로복지공단', visit:'online',
   chk:{d:'2026-09-08', src:'근로복지공단 두루누리', u:'https://insurancesupport.or.kr/durunuri/intro.php'},
   f:c=> !c.biz.on ? NO('사업주가 아닙니다')
    : c.biz.emp===0&&!c.biz.hire ? NO('상시근로자가 없습니다')
    : c.biz.emp>=10 ? NO(`상시근로자 ${c.biz.emp}명 · 기준 10명 미만`)
    : c.biz.hire ? OK('근로자 1인당 월 최대 10.9만','보험료의 80% · 채용 후에는 소급되지 않습니다',85,'채용 전 신청',{y:130})
    : CHK('근로자 1인당 월 최대 10.9만','2021년 이후 신규 가입한 근로자만 대상이고 합산 36개월까지입니다. 기존 직원은 해당하지 않습니다')},
  {n:'고용창출장려금', type:'cash', where:'고용노동부 · 고용센터', visit:'online',
   chk:{d:'2026-09-08', src:'찾기쉬운 생활법령 · 고용창출 지원', u:'https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=1122&ccfNo=2&cciNo=1&cnpClsNo=1'},
   f:c=> !c.biz.on ? NO('사업주가 아닙니다')
    : NO('일자리 함께하기와 신중년 적합직무는 2024년 1월부터 신규 지원이 끝났고, 남은 유형은 국내복귀기업 대상입니다')},
  {n:'이노비즈 인증', type:'admin', where:'이노비즈협회', visit:'online',
   chk:{d:'2026-09-08', src:'이노비즈협회', lvl:'org', u:'https://www.innobiz.net/'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다')
    : c.biz.years<3 ? NO('업력 3년 이상이 필요합니다')
    : NO('기술혁신 평가 요건을 확인해야 합니다')},
  {n:'수출바우처', type:'compete', where:'수출바우처 누리집', visit:'online',
   chk:{d:'2026-09-08', src:'수출바우처 누리집', lvl:'org', u:'https://www.exportvoucher.com/'},
   f:c=> !c.biz.on ? NO('사업자가 아닙니다') : NO('수출 실적 또는 계획 증빙이 필요합니다')}]},

{k:'refund', n:'미수령·환급', items:[
  {n:'국세 미환급금', type:'cash', where:'홈택스 · 손택스', visit:'online',
   chk:{d:'2026-09-08', src:'정부24 미환급금 조회 안내', u:'https://www.gov.kr/portal/service/serviceInfo/174100000054'},
   f:c=> c.refund.tax>0 ? OK(c.refund.tax.toLocaleString()+'만','미수령 환급금 확인 · 5년 지나면 국고 귀속',99,'조회 후 신청',{once:c.refund.tax})
    : NO('미환급금이 확인되지 않습니다')},
  {n:'지방세 미환급금', type:'cash', where:'위택스', visit:'online',
   chk:{d:'2026-09-08', src:'정부24 미환급금 조회 안내', u:'https://www.gov.kr/portal/service/serviceInfo/174100000054'},
   f:c=> c.refund.local>0 ? OK(c.refund.local.toLocaleString()+'만','미수령 환급금 확인',99,'조회 후 신청',{once:c.refund.local})
    : NO('미환급금이 확인되지 않습니다')},
  {n:'본인부담상한제 환급금', type:'cash', where:'건강보험공단', visit:'online',
   chk:{d:'2026-09-08', src:'정부24 미환급금 조회 안내', u:'https://www.gov.kr/portal/service/serviceInfo/174100000054'},
   f:c=> c.refund.medical>0 ? OK(c.refund.medical.toLocaleString()+'만','상한 초과분 환급 대상 · 신청해야 지급',97,'신청 시',{once:c.refund.medical})
    : NO('연간 본인부담금이 상한을 넘지 않았습니다')},
  {n:'휴면예금 · 미청구 보험금', type:'cash', where:'서민금융진흥원 · 내보험찾아줌', visit:'online',
   chk:{d:'2026-09-08', src:'정부24 미환급금 조회 안내', u:'https://www.gov.kr/portal/service/serviceInfo/174100000054'},
   f:c=> c.refund.dormant>0 ? OK(c.refund.dormant.toLocaleString()+'만','장기 미거래 계좌와 미청구 보험금',99,'조회 후 신청',{once:c.refund.dormant})
    : NO('미수령 금액이 확인되지 않습니다')},
  {n:'종합소득세 경정청구', type:'cash', where:'홈택스', visit:'online',
   chk:{d:'2026-09-08', src:'정부24 미환급금 조회 안내', u:'https://www.gov.kr/portal/service/serviceInfo/174100000054'},
   f:c=> !c.biz.on&&!c.work.on&&!c.work.freelance ? NO('신고 이력이 없습니다')
    : OK('최대 5년치', c.work.freelance?'프리랜서 원천징수 3.3% 환급 가능성':'누락된 공제와 감면 소급',75,'5년 이내')},
  {n:'미청구 국민연금 · 퇴직연금', type:'cash', where:'국민연금공단 · 통합연금포털', visit:'online',
   chk:{d:'2026-09-08', src:'정부24 미환급금 조회 안내', u:'https://www.gov.kr/portal/service/serviceInfo/174100000054'},
   f:c=> c.refund.pension>0 ? OK(c.refund.pension.toLocaleString()+'만','미청구 적립금 확인',95,'조회 후 신청',{once:c.refund.pension})
    : NO('미청구 적립금이 확인되지 않습니다')}]},

{k:'death', n:'상속·사망', items:[
  {n:'안심상속 원스톱 서비스', type:'admin', where:'주민센터 · 정부24', visit:'center',
   chk:{d:'2026-09-08', src:'정책브리핑 · 안심상속 원스톱 신청기한', u:'https://www.korea.kr/news/policyNewsView.do?newsId=148931775'},
   f:c=> !c.event.death ? NO('해당 사건이 확인되지 않습니다')
    : c.event.deathDays>395 ? LOST('—','사망일이 속한 달의 말일부터 1년이 지났습니다')
    : OK('수수료 없음',`금융·부동산·자동차·세금·연금을 한 번에 조회합니다 · 남은 기간 약 ${Math.max(0,365-c.event.deathDays)}일`,99,'사망월 말일부터 1년 이내')},
  {n:'상속포기 · 한정승인', type:'admin', where:'가정법원 · 법률구조공단', visit:'office',
   chk:{d:'2026-09-08', src:'민법 제1019조 · 신우법무사 해설', u:'https://korea.legal/%EC%83%81%EC%86%8D/%EC%83%81%EC%86%8D%ED%8F%AC%EA%B8%B0/'},
   f:c=> !c.event.death ? NO('해당 사건이 확인되지 않습니다')
    : c.event.deathDays>90 ? LOST('채무 승계 방지','사망일로부터 3개월이 지나 단순승인으로 간주됩니다')
    : OK('채무 승계 방지',`남은 기간 ${90-c.event.deathDays}일 · 채무가 재산보다 많으면 반드시 검토`,90,'3개월 이내')},
  {n:'상속세 신고', type:'admin', where:'홈택스 · 세무서', visit:'online',
   chk:{d:'2026-09-08', src:'안심상속·상속 절차 기한 정리', u:'https://www.watax.kr/inheritance/safe-inheritance-onestop-property-search'},
   f:c=> !c.event.death ? NO('해당 사건이 확인되지 않습니다')
    : OK('공제 후 산정',`사망일이 속한 달의 말일부터 6개월 이내 · 남은 기간 ${Math.max(0,180-c.event.deathDays)}일`,85,'기한 내 신고')},
  {n:'유족연금 · 사망일시금', type:'cash', where:'국민연금공단', visit:'office',
   chk:{d:'2026-09-08', src:'안심상속·상속 절차 기한 정리', u:'https://www.watax.kr/inheritance/safe-inheritance-onestop-property-search'},
   f:c=> !c.event.death ? NO('해당 사건이 확인되지 않습니다')
    : OK('월 연금 또는 일시금','고인의 국민연금 가입 이력에 따라 결정',80,'5년 이내 청구')},
  {n:'장제급여', type:'cash', where:'주민센터', visit:'center',
   chk:{d:'2026-09-08', src:'보건복지부 기초생활보장 장제급여', lvl:'org', u:'https://www.bokjiro.go.kr/'},
   f:c=> !c.event.death ? NO('해당 사건이 확인되지 않습니다')
    : !c.misc.welfare ? NO('기초생활수급 가구가 아닙니다')
    : OK('80만','수급 가구 장례비 지원',95,'신청 시',{once:80})},
  {n:'상속 취득세 감면', type:'save', where:'위택스 · 시군구청', visit:'office',
   chk:{d:'2026-09-08', src:'위택스 취득세 안내', lvl:'org', u:'https://www.wetax.go.kr/'},
   f:c=> !c.event.death ? NO('해당 사건이 확인되지 않습니다')
    : CHK('요건별 감면','1가구 1주택 상속 등 요건을 확인해야 합니다')}]},

{k:'admin', n:'행정 절차', items:[
  {n:'공동인증서 발급', type:'admin', where:'은행 방문 또는 비대면', visit:'bank',
   chk:{d:'2026-09-08', src:'금융결제원 공동인증서', lvl:'org', u:'https://www.yessign.or.kr/'},
   f:c=> c.admin.cert ? NO('이미 보유하고 계십니다')
    : OK('수수료 없음','온라인으로 신청할 항목이 있는데 인증서가 없어 진행이 막힙니다',95,'선행 조건')},
  {n:'모바일 주민등록증', type:'admin', where:'주민센터 방문', visit:'center',
   chk:{d:'2026-09-08', src:'정부24 모바일 신분증', lvl:'org', u:'https://www.mobileid.go.kr/'},
   f:c=> !c.admin.idLatest ? NO('소지한 실물이 최신 재발급본이 아닙니다 · 재발급이 선행돼야 합니다')
    : NO('필요하실 때 신청하시면 됩니다 · 기한이 정해진 항목이 아닙니다')},
  {n:'전입신고 · 확정일자', type:'admin', where:'주민센터 · 정부24', visit:'center',
   chk:{d:'2026-09-08', src:'정부24 전입신고', lvl:'org', u:'https://www.gov.kr/'},
   f:c=> !c.admin.moving ? NO('이사 예정이 확인되지 않습니다')
    : OK('수수료 없음','전입 후 14일 이내 · 확정일자는 보증금 보호의 전제',99,'14일 이내')},
  {n:'사업자등록', type:'admin', where:'홈택스 · 세무서', visit:'online',
   chk:{d:'2026-09-08', src:'국세청 홈택스 사업자등록', lvl:'org', u:'https://www.hometax.go.kr/'},
   f:c=> c.biz.on ? NO('이미 등록돼 있습니다')
    : !c.biz.plan ? NO('창업 계획이 확인되지 않습니다')
    : CHK('수수료 없음','등록하면 예비창업패키지 최대 1억 자격이 사라집니다. 순서를 먼저 확인하세요')},
  {n:'여권 갱신', type:'admin', where:'구청 · 시청 여권과', visit:'office',
   chk:{d:'2026-09-08', src:'외교부 여권안내', lvl:'org', u:'https://www.passport.go.kr/'},
   f:c=> c.admin.passport===0 ? NO('여권을 보유하고 있지 않습니다')
    : c.admin.passport<6 ? OK('발급 수수료',`만료까지 ${c.admin.passport}개월 · 잔여 6개월 미만이면 입국을 거부하는 국가가 있습니다`,99,'방문 신청')
    : NO(`만료까지 ${c.admin.passport}개월 · 아직 여유가 있습니다`)},
  {n:'운전면허 갱신', type:'admin', where:'경찰서 · 운전면허시험장', visit:'office',
   chk:{d:'2026-09-08', src:'찾기쉬운 생활법령 · 운전면허 갱신', u:'https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=668&ccfNo=3&cciNo=2&cnpClsNo=2'},
   f:c=> !c.admin.license ? NO('운전면허를 보유하고 있지 않습니다')
    : c.admin.licenseDue<6 ? OK('수수료 1.6만',`갱신까지 ${c.admin.licenseDue}개월 · 생일 전후 6개월 이내 · 넘기면 20만원 이하 과태료`,99,'방문 신청')
    : NO(`갱신까지 ${c.admin.licenseDue}개월 · 아직 여유가 있습니다`)},
  {n:'자동차 정기검사', type:'admin', where:'검사소', visit:'office',
   chk:{d:'2026-09-08', src:'한국교통안전공단 자동차검사', lvl:'org', u:'https://www.kotsa.or.kr/'},
   f:c=> !c.home.car ? NO('보유 차량이 확인되지 않습니다')
    : c.admin.carCheck<3 ? OK('검사 수수료',`검사 기한까지 ${c.admin.carCheck}개월 · 지나면 과태료가 부과됩니다`,99,'방문 검사')
    : NO(`검사 기한까지 ${c.admin.carCheck}개월 · 아직 여유가 있습니다`)}]}
];

/* 제도 총 건수 · 문구에 하드코딩하지 않고 여기서 셉니다 */
const RULE_COUNT=SECTORS.reduce((a,s)=>a+s.items.length,0);
const SECTOR_COUNT=SECTORS.length;

/* 출처 확인 이력 · chk:{d:확인일, src:출처, u:링크, lvl}
   lvl 없음 = 금액과 요건까지 기관 자료로 대조함
   lvl:'org' = 소관 기관만 확인 · 수치는 아직 대조하지 않음
   chk 자체가 없으면 '출처 미확인'
   숫자를 고칠 때는 chk.d 를 그날로 갱신하고, 대조했으면 lvl 을 지웁니다 */
const CHECKED=SECTORS.flatMap(s=>s.items).filter(i=>i.chk);
const VERIFIED=CHECKED.filter(i=>!i.chk.lvl);
const CHECK_COUNT=VERIFIED.length;
const ORG_COUNT=CHECKED.length-VERIFIED.length;
const CHECK_LATEST=CHECKED.map(i=>i.chk.d).sort().pop()||null;
