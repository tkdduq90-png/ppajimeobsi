/* ═══════════════════════════════════════════════
   사람 데이터베이스
   CTX  : 연결로 확인된 사실 (전 항목을 모두 조회한다고 가정)
   ROLE : 사실로부터 자동 판정되는 역할
   ROAD : 연속적 경로가 있는 역할만 보유
   EVENT: 일회성 사건 (로드맵 없이 체크리스트)
   ═══════════════════════════════════════════════ */

const BLANK={
  name:'', sub:'', tag:'', age:30, region:'서울',
  work:{on:false, sme:false, smeType:false, insured:0, hired:null, quit:null, taxRelief:false, freelance:false},
  biz:{on:false, plan:false, kind:null, label:'', ksic:'', years:0, rev:0, revDown:false,
       emp:0, opened:null, noran:false, tongsin:false, ip:null, venture:false, close:false, hire:false},
  home:{own:false, rent:false, deposit:0, monthly:0, incomeRate:100, car:0},
  fam:{married:false, kids:0, infant:false, pregnant:false, college:false},
  credit:{score:800, drop:0, arrears:0, multi:false, dsr:20},
  refund:{tax:0, local:0, medical:0, dormant:0, pension:0},
  event:{death:false, deathDays:0},
  admin:{idLatest:true, cert:true, moving:false, passport:0, license:false, licenseDue:99, carCheck:99},
  misc:{disabled:false, single:false, farm:false, welfare:false, chronic:false, care:false,
        unpaid:false, arrear:false, grants:[]}
};
const mk=(o)=>{const d=JSON.parse(JSON.stringify(BLANK));
  for(const k in o){ if(typeof o[k]==='object'&&!Array.isArray(o[k])) Object.assign(d[k],o[k]); else d[k]=o[k]; }
  return d;};

const CTX={
 a:mk({name:'오상엽', sub:'법인 대표 · 기술창업 2년차', tag:'법인사업자', age:38, region:'서울 동대문구',
   biz:{on:true, kind:'corp', label:'법인', ksic:'62010 소프트웨어 개발', years:2, rev:8400,
        emp:1, opened:'2022-01-24', ip:'특허 출원 1건'},
   home:{rent:true, deposit:5000, monthly:75, incomeRate:145},
   admin:{passport:4, license:true, licenseDue:14},
   credit:{score:842, dsr:18},
   refund:{tax:37, local:4, dormant:12, pension:0}}),

 b:mk({name:'김소연', sub:'카페 운영 3년차 · 자녀 1명', tag:'개인사업자 · 부모', age:36, region:'인천 미추홀구',
   biz:{on:true, kind:'solo', label:'개인 점포', ksic:'56211 일반음식점', years:3, rev:21000,
        revDown:true, emp:2, opened:'2023-04-11'},
   home:{rent:true, deposit:8000, incomeRate:112, car:1800},
   fam:{married:true, kids:1, infant:true},
   admin:{passport:22, license:true, licenseDue:4, carCheck:2},
   credit:{score:684, drop:-58, multi:true, dsr:62},
   refund:{tax:0, local:8, medical:41, dormant:0, pension:0},
   misc:{medicalHigh:true, chronic:false}}),

 c:mk({name:'박지훈', sub:'중소기업 재직 4년차 · 자녀 1명', tag:'직장인 · 부모', age:34, region:'경기 고양시',
   work:{on:true, sme:true, smeType:true, insured:1620, hired:'2021-08-16', taxRelief:true},
   home:{rent:true, deposit:24000, incomeRate:118, car:2600},
   fam:{married:true, kids:1, infant:true},
   admin:{passport:38, license:true, licenseDue:31, carCheck:9},
   credit:{score:871, dsr:24},
   refund:{tax:12, local:0, medical:0, dormant:6, pension:0}}),

 d:mk({name:'이현우', sub:'직장인 · 온라인 스토어 겸업 · 퇴사 예정', tag:'직장인 · 온라인사업자',
   age:33, region:'서울 성동구',
   work:{on:true, sme:true, smeType:true, insured:1280, hired:'2022-03-02'},
   biz:{on:true, kind:'online', label:'온라인 스토어', ksic:'47912 전자상거래 소매업',
        years:2, rev:3200, opened:'2024-06-03', tongsin:true},
   home:{rent:true, deposit:3000, monthly:62, incomeRate:132, car:2100},
   admin:{passport:3, license:true, licenseDue:26, carCheck:7},
   credit:{score:812, dsr:31},
   refund:{tax:28, local:3, dormant:0, pension:0}}),

 e:mk({name:'정수미', sub:'한부모 · 자녀 2명 · 중소기업 재직', tag:'직장인 · 한부모', age:41, region:'부산 사하구',
   work:{on:true, sme:true, smeType:true, insured:900, hired:'2024-01-15'},
   home:{rent:true, deposit:3000, monthly:35, incomeRate:55, car:900},
   fam:{married:false, kids:2},
   admin:{passport:0, license:true, licenseDue:19},
   credit:{score:722, drop:-11, dsr:38},
   refund:{tax:19, local:0, medical:27, dormant:0, pension:0},
   misc:{single:true, medicalHigh:true}}),

 f:mk({name:'한복순', sub:'만 68세 · 자가 거주 · 배우자와 2인', tag:'노년 가구', age:68, region:'대구 달서구',
   home:{own:true, incomeRate:45},
   fam:{married:true},
   admin:{passport:0, license:true, licenseDue:2},
   credit:{score:790, dsr:5},
   refund:{tax:0, local:2, medical:63, dormant:41, pension:180},
   misc:{medicalHigh:true, chronic:true, care:true}}),

 g:mk({name:'최기준', sub:'실직 · 기초생활수급 · 채무 연체', tag:'구직자 · 수급 가구', age:47, region:'광주 북구',
   work:{on:false, sme:true, insured:700, hired:'2023-02-01', quit:'end'},
   home:{rent:true, deposit:500, monthly:25, incomeRate:28},
   credit:{score:512, drop:-96, arrears:74, multi:true, dsr:88},
   refund:{tax:0, local:0, medical:22, dormant:0, pension:0},
   misc:{welfare:true, medicalHigh:true, unpaid:true}}),

 h:mk({name:'윤가람', sub:'프리랜서 · 창업 준비 중 · 사업자등록 전', tag:'프리랜서 · 예비창업자',
   age:29, region:'서울 마포구',
   work:{freelance:true},
   biz:{on:false, plan:true},
   home:{rent:true, deposit:2000, monthly:55, incomeRate:58},
   credit:{score:758, dsr:22},
   refund:{tax:64, local:0, dormant:9, pension:0},
   admin:{idLatest:false, cert:false, passport:5, license:false, licenseDue:99}}),

 i:mk({name:'신재호', sub:'부친 사망 · 상속 절차 진행 중 · 직장인', tag:'직장인 · 상속인',
   age:52, region:'대전 서구',
   work:{on:true, sme:false, insured:4200, hired:'2012-05-02'},
   home:{own:true, incomeRate:155},
   fam:{married:true, kids:1, college:true},
   admin:{passport:9, license:true, licenseDue:22},
   credit:{score:855, dsr:29},
   refund:{tax:0, local:0, medical:0, dormant:23, pension:0},
   event:{death:true, deathDays:38}}),

 j:mk({name:'오유진', sub:'첫 직장 6개월차 · 원룸 자취 시작', tag:'사회초년생', age:24, region:'서울 관악구',
   work:{on:true, sme:true, smeType:true, insured:180, hired:'2026-03-02'},
   home:{rent:true, deposit:1000, monthly:48, incomeRate:52},
   credit:{score:740, dsr:12},
   refund:{tax:0, local:0, dormant:0, pension:0},
   admin:{idLatest:true, cert:false, moving:true, passport:0, license:true, licenseDue:8}})
};

/* ── 역할 ── */
const ROLE={
 corp:{n:'법인사업자', on:c=>c.biz.on&&c.biz.kind==='corp', off:'법인 등기가 없습니다'},
 solo:{n:'개인사업자', on:c=>c.biz.on&&c.biz.kind==='solo', off:'오프라인 점포가 확인되지 않습니다'},
 online:{n:'온라인 사업자', on:c=>c.biz.on&&c.biz.kind==='online', off:'온라인 판매 사업자가 없습니다'},
 free:{n:'프리랜서', on:c=>!!c.work.freelance, off:'프리랜서 소득이 확인되지 않습니다'},
 worker:{n:'직장인', on:c=>c.work.on, off:'고용보험 가입 이력이 없습니다'},
 seeker:{n:'구직자', on:c=>!c.work.on&&c.work.insured>0&&!c.biz.on, off:'구직 상태가 아닙니다'},
 family:{n:'가족', on:c=>c.fam.married||c.fam.kids>0, off:'배우자와 자녀가 확인되지 않습니다'},
 senior:{n:'노년 가구', on:c=>c.age>=65, off:'만 65세 미만입니다'},
 welfare:{n:'수급 가구', on:c=>c.misc.welfare, off:'기초생활수급 가구가 아닙니다'},
 heir:{n:'상속인', on:c=>c.event.death, off:'상속 사건이 확인되지 않습니다'}
};

/* ── 로드맵 · 연속 경로가 있는 역할만 ── */
const ROAD={
 corp:c=>({label:'기술창업 로드맵', cur:1, stages:[
   {n:'준비', d:'사업자등록 전', items:[['창업교육 이수','done'],['사업 아이템 확정','done'],['예비창업패키지','lost']]},
   {n:'설립', d:'등록 직후', items:[['사업자등록','done'],['상표 출원','free','전문가'],
     ['초기창업패키지', c.biz.years<=3?'now':'cond','업력 3년 이내'],['두루누리','free']]},
   {n:'기반', d:'기술과 자격', items:[[c.biz.ip?'특허 출원':'특허 출원 검토', c.biz.ip?'done':'free'],
     ['특허 등록 전환','free','전문가'],['벤처기업 확인','free'],['창업성장 R&D','free']]},
   {n:'성장', d:'매출과 고용', items:[['창업도약패키지','cond','업력 3년 이후'],
     ['TIPS','cond','운영사 추천 필요'],['청년일자리도약장려금','cond','상시근로자 5명 이상'],['이노비즈 인증','cond','업력 3년 이후']]},
   {n:'확장', d:'해외와 규모화', items:[['수출바우처','cond','수출 실적 필요'],
     ['스케일업 팁스','cond','TIPS 선행'],['정책자금 확대','free']]}], later:['위기 대응','정리와 재도전']}),

 solo:c=>({label:'점포 운영 로드맵', cur:2, stages:[
   {n:'준비', d:'개업 전', items:[['상권 분석','done'],['위생교육','done'],['신사업창업사관학교','lost']]},
   {n:'개업', d:'등록과 영업', items:[['사업자등록','done'],['영업신고','done'],
     ['상표 출원','free','전문가'],['노란우산 가입', c.biz.noran?'done':'free']]},
   {n:'운영', d:'상시 가능', items:[['소상공인 정책자금','now'],
     [c.biz.revDown?'경영안정자금':'경영안정자금', c.biz.revDown?'now':'cond','매출 감소 시'],
     ['스마트상점','now'],['두루누리','free']]},
   {n:'확장', d:'매출 확대', items:[['온라인 판로 지원','cond','통신판매업 신고 필요'],
     ['백년가게','cond','업력 30년'],['프랜차이즈 전환','free','전문가']]}], later:['위기 대응','폐업과 재기']}),

 online:c=>({label:'온라인 판매 로드맵', cur:2, stages:[
   {n:'준비', d:'개업 전', items:[['아이템 소싱','done'],['통신판매업 신고','done']]},
   {n:'개업', d:'등록과 입점', items:[['사업자등록','done'],['오픈마켓 입점','done'],['상표 출원','free','전문가']]},
   {n:'운영', d:'상시 가능', items:[['소상공인 정책자금','now'],['온라인 판로 지원','now'],
     ['노란우산 가입','free']]},
   {n:'확장', d:'규모화', items:[['수출바우처','cond','수출 실적 필요'],['스마트 물류','free']]}],
   later:['정리와 전환']}),

 free:c=>({label:'프리랜서에서 창업으로', cur:0, stages:[
   {n:'프리랜서', d:'현재', items:[['종합소득세 신고','done'],['경정청구 확인','now'],['노란우산 가입','free']]},
   {n:'창업 준비', d:'등록 전에만', items:[['예비창업패키지','now'],['창업교육 이수','free'],['상표 출원','free','전문가']]},
   {n:'설립', d:'등록 이후', items:[['사업자등록','cond','예비창업 선정 후 권장'],
     ['초기창업패키지','cond','등록 후 3년 이내'],['두루누리','cond','채용 시']]}], later:['성장','확장']}),

 worker:c=>({label:'직장인 여정', cur:c.work.insured<365?0:1, stages:[
   {n:'입사', d:'취업 직후', items:[['고용보험 가입','done'],
     ['소득세 감면 신청', c.work.taxRelief?'done':c.work.smeType?'now':'cond','감면 대상 업종이어야 합니다'],
     ['청년내일채움공제','lost']]},
   {n:'재직', d:'상시 가능', items:[
     [c.age<=34?'청년도약계좌':'청년도약계좌', c.age<=34?'free':'cond','만 34세 이하'],
     ['내일배움카드','free'],
     ...(c.home.rent?[['청년월세 지원', c.age<=39?'now':'cond','만 39세 이하'],
                      ['공공임대 청약','free']]:[])]},
   {n:'이직 준비', d:'퇴사 전에', items:[['소득세 감면 정산','cond','재직 중에만 가능'],
     ['경정청구','free'],['퇴사 사유 확인','cond','실업급여 자격이 갈림']]},
   {n:'재취업', d:'구직 기간', items:[['실업급여','cond','퇴사 후'],
     ['국민취업지원제도','cond','소득 요건'],['직업훈련','free']]}], later:['창업 전환','노후 준비']}),

 seeker:c=>({label:'재취업 여정', cur:0, stages:[
   {n:'실직 직후', d:'지금', items:[['워크넷 구직등록','now'],['실업급여 신청','now'],
     ['건강보험 임의계속','free']]},
   {n:'구직 기간', d:'상시 가능', items:[['국민취업지원제도','free'],['내일배움카드','free'],
     ...(c.misc.unpaid?[['임금체불 대지급금','now']]:[])]},
   {n:'재취업', d:'취업 후', items:[['소득세 감면 신청','cond','중소기업 취업 시'],
     ['희망저축계좌','cond','수급 가구 근로 시']]}], later:['창업 전환']})
};

/* ── 사건 · 로드맵이 아니라 기한 있는 체크리스트 ── */
const EVENTS={
 heir:c=>({label:'상속 절차', urgent:true, sub:`사망일로부터 ${c.event.deathDays}일 경과`,
   items:[
     ['사망신고','done','사망일로부터 1개월 이내','완료'],
     ['안심상속 원스톱 서비스', c.event.deathDays>395?'lost':'now','사망월 말일부터 1년 이내',
      c.event.deathDays>395?'기간 경과':`약 ${Math.max(0,365-c.event.deathDays)}일 남음`],
     ['상속포기 · 한정승인', c.event.deathDays>90?'lost':'now','사망 후 3개월 이내',
      c.event.deathDays>90?'단순승인 간주':`${90-c.event.deathDays}일 남음`],
     ['상속세 신고','todo','사망한 달 말일부터 6개월',`${Math.max(0,180-c.event.deathDays)}일 남음`],
     ['유족연금 청구','todo','5년 이내','여유 있음'],
     ['부동산 상속등기','todo','기한 없으나 취득세는 6개월',`${Math.max(0,180-c.event.deathDays)}일 남음`]]}),
 welfare:c=>({label:'수급 가구 점검', urgent:false, sub:'각각 따로 신청해야 합니다',
   items:[['생계급여','done','수급 확정','수령 중'],
     ['주거급여','now','임차 가구','미신청'],
     ['에너지바우처','now','6~12월 신청','미신청'],
     ['문화누리카드','now','연 15만','미신청'],
     ['통신요금 감면','now','월 최대 2.6만','미신청'],
     ['전기요금 할인','now','월 최대 1.6만','미신청']]}),
 senior:c=>({label:'노년 가구 점검', urgent:false, sub:'기초연금이 다른 감면의 전제입니다',
   items:[['기초연금 신청','now','소득 하위 70%','미신청'],
     ['통신요금 감면','todo','기초연금 수급 후','선행 필요'],
     ['노인일자리','now','모집 기간','확인 필요'],
     ['장기요양 등급 판정', c.misc.care?'now':'todo','거동 불편 시', c.misc.care?'신청 가능':'해당 없음'],
     ['본인부담상한제 환급','now','신청해야 지급','미신청']]})
};

/* ── 방문 묶음 · 한 번에 처리할 것 ── */
const VISIT={
 center:{n:'주민센터', tip:'한 번 방문할 때 함께 처리하면 재방문을 줄일 수 있습니다'},
 bank:{n:'은행 방문', tip:'OTP나 인증서 발급 시 함께 처리할 수 있는 것들입니다'},
 office:{n:'기관 방문', tip:'각 기관을 직접 방문해야 하는 항목입니다'},
 online:{n:'온라인', tip:'방문 없이 처리할 수 있습니다'},
 company:{n:'회사 제출', tip:'원천징수의무자를 통해 처리합니다'}
};

/* ── 겹침 경고 ── */
const CROSS={
 d:[['실업급여 신청이 막힐 수 있습니다',
     '온라인 스토어라 재직 중 겸업은 가능하지만, 사업자를 보유한 상태로는 실업급여를 신청할 수 없습니다. 휴업 또는 폐업 처리가 선행돼야 하며 창구에서 반려되는 대표적 사유입니다'],
    ['철거를 먼저 하면 점포철거비를 못 받습니다',
     '희망리턴패키지 점포철거비는 폐업 전후 모두 신청할 수 있지만, 실제 공사비를 증빙해야 합니다. 철거 전후 사진과 공사내역서, 이체확인증이 필요하므로 철거 전에 준비를 시작하셔야 합니다']],
 b:[['자녀 양육과 사업 운영이 겹칩니다',
     '어린이집 종일반은 취업 또는 사업자 등록이 요건입니다. 개인사업자로 확인되어 신청할 수 있습니다'],
    ['소득 판정 기준이 두 가지입니다',
     '주거 지원은 가구 합산 소득으로, 소상공인 자금은 사업 매출로 판단합니다. 한쪽이 되어도 다른 쪽은 안 될 수 있습니다']],
 c:[['육아휴직과 소득세 감면이 함께 걸립니다',
     '육아휴직 기간에는 소득이 줄어 감면 효과도 함께 줄어듭니다. 복직 후 잔여 기간이 이어집니다']],
 e:[['한부모 증명서가 다른 지원의 전제입니다',
     '전기요금 할인과 스포츠강좌이용권은 한부모가족 증명서가 있어야 신청할 수 있습니다. 증명서를 먼저 발급받으셔야 나머지가 열립니다']],
 f:[['기초연금이 다른 감면의 조건입니다',
     '통신요금 감면은 만 65세 이상 중 기초연금 수급자가 대상입니다. 기초연금을 먼저 신청하셔야 감면도 받으실 수 있습니다']],
 g:[['실업급여와 국민취업지원은 동시에 받을 수 없습니다',
     '실업급여 수급 기간에는 국민취업지원제도 구직촉진수당을 받을 수 없습니다. 실업급여를 먼저 소진한 뒤 신청하는 순서가 유리합니다'],
    ['취업하면 생계급여가 줄어듭니다',
     '근로 소득이 생기면 생계급여가 감액됩니다. 자활 성공을 위한 유예 제도가 있으니 취업 전에 확인하셔야 합니다']],
 h:[['사업자등록 시점이 지원 규모를 가릅니다',
     '지금은 예비창업패키지 대상입니다. 2026년 기준 평균 4,000만 원이고, 사업자등록을 먼저 하면 이 자격이 영구히 사라져 초기창업패키지로만 갈 수 있습니다'],
    ['인증서가 없어 온라인 신청이 막힙니다',
     '공동인증서가 없으면 대부분의 온라인 신청을 진행할 수 없습니다. 은행 방문 시 함께 발급받으시면 재방문을 줄일 수 있습니다']],
 i:[['상속 기한이 두 개 동시에 흐릅니다',
     '상속포기와 한정승인은 3개월, 상속세 신고는 6개월입니다. 채무가 재산보다 많으면 3개월 안에 결정하셔야 합니다'],
    ['안심상속을 먼저 해야 판단할 수 있습니다',
     '고인의 재산과 채무를 모르면 상속포기 여부를 결정할 수 없습니다. 안심상속 원스톱은 사망월 말일부터 1년까지 여유가 있지만, 상속포기 기한 3개월이 먼저 끝나므로 지금 신청하셔야 판단할 시간이 남습니다']],
 j:[['이사와 인증서 발급이 같은 시기에 겹칩니다',
     '전입신고는 14일 이내이고 공동인증서는 온라인 신청의 전제입니다. 은행과 주민센터 방문을 각각 한 번에 묶어 처리하시면 됩니다']]
};

/* ── 알림 ── */
const NOTI={
 a:[['초기창업패키지 마감','12일 남았습니다 · 2026년 400개사 내외 선정','오늘','warn'],
    ['국세 미환급금 37만','조회 결과 미수령 확인','2일 전','go'],
    ['예비창업패키지','사업자등록으로 자격이 소멸했습니다','기록','stop']],
 b:[['매출 18% 감소 확인','경영안정자금 요건을 충족했습니다','오늘','go'],
    ['본인부담상한제 환급 41만','신청해야 지급됩니다','3일 전','warn'],
    ['신용점수 58점 하락','연체 전 채무조정을 검토하실 수 있습니다','5일 전','warn']],
 c:[['LH 신혼부부 매입임대','접수 18일 남았습니다','오늘','warn'],
    ['첫만남이용권','출생 후 1년이 지나 신청 기간이 끝났습니다','기록','stop']],
 d:[['실업급여 신청 전 확인','사업자 휴업 또는 폐업 처리가 선행돼야 합니다','오늘','stop'],
    ['소득세 감면 제도 일몰','2026년 12월 31일 종료 예정 · 미신청','오늘','stop'],
    ['희망리턴패키지','점포철거비 최대 600만 · 철거 전 사진이 필요합니다','2일 전','warn']],
 e:[['한부모 아동양육비 월 46만','자녀 2명 · 중위 65% 이하 · 미신청','오늘','stop'],
    ['한부모가족 증명서','다른 감면의 전제입니다','2일 전','warn'],
    ['본인부담상한제 환급 27만','신청해야 지급됩니다','4일 전','warn']],
 f:[['기초연금','소득 하위 70% 이내 · 신청 가능','오늘','go'],
    ['미청구 국민연금 180만','통합연금포털 조회 결과','1일 전','go'],
    ['본인부담상한제 환급 63만','미신청 상태입니다','3일 전','warn']],
 g:[['실업급여','이직일로부터 12개월 이내 신청','오늘','stop'],
    ['연체 74일','90일이 되면 개인워크아웃 구간으로 넘어갑니다','오늘','stop'],
    ['임금체불 대지급금','체불 확인 · 국가가 대신 지급합니다','2일 전','warn']],
 h:[['예비창업패키지','사업자등록을 하면 자격이 사라집니다','오늘','stop'],
    ['국세 미환급금 64만','프리랜서 원천징수분 환급 가능','1일 전','go'],
    ['공동인증서 미발급','온라인 신청이 막혀 있습니다','3일 전','warn']],
 i:[['상속포기 · 한정승인','52일 남았습니다 · 채무 확인 후 결정','오늘','stop'],
    ['안심상속 원스톱','아직 신청 가능 · 상속포기 판단의 전제입니다','1일 전','go'],
    ['상속세 신고','142일 남았습니다','2일 전','warn']],
 j:[['전입신고','이사 후 14일 이내 · 확정일자 함께','오늘','warn'],
    ['소득세 감면 미신청','첫 직장 · 연 200만 한도','1일 전','warn'],
    ['공동인증서 미발급','온라인 신청의 전제입니다','3일 전','warn']]
};

/* ── 물어보기 ── */
const ASK={
 corp:[{q:'지금 내가 받을 수 있는 게 뭐야?',mode:'logic',
   a:'자격이 되는 것은 초기창업패키지, 창업성장 R&D, 청년창업사관학교, 혁신창업사업화자금, 청년전용창업자금입니다. 선정 가능성은 계산하지 않습니다. 평가 배점이 공개되지 않고 정성평가가 대부분이라 근거를 댈 수 없기 때문입니다. 대신 공고문 가점표를 대조해 확보한 점수와 남은 점수를 보여드립니다. 국세 미환급금 37만 원도 조회됐습니다.',
   cite:'저장된 개업일 · 업종 · 상시근로자 · 특허 상태로 자격 판정 · 가점은 공고문 별표 대조'},
  {q:'직원 한 명 더 뽑으려는데 괜찮아?',mode:'logic',
   a:'두루누리는 채용월을 포함해 신청해야 소급되고, 채용 후에는 적용되지 않습니다. 고용창출장려금은 2024년부터 신규 지원이 끝났고, 청년일자리도약장려금은 수도권 기준 상시근로자 5명 이상이라 지금은 대상이 아닙니다.',
   cite:'저장된 고용보험 · 상시근로자 수로 계산'}],
 worker:[{q:'지금 내가 받을 수 있는 게 뭐야?',mode:'logic',
   a:'소득세 감면 상태와 주거 지원 자격을 먼저 확인하시는 편이 좋습니다. 감면 제도는 2026년 12월 31일 일몰 예정이라 남은 기간이 짧습니다.',
   cite:'저장된 고용보험 · 사업장 규모 · 소득으로 계산'},
  {q:'회사 그만두려는데 뭘 먼저 해야 해?',mode:'logic',
   a:'소득세 감면은 재직 중에만 신청할 수 있고 내일배움카드도 재직 중 발급이 간단합니다. 자발적 퇴사면 실업급여를 받을 수 없으니 퇴사 사유를 먼저 확인하세요.',
   cite:'저장된 재직 상태 · 고용보험 이력으로 계산'}],
 solo:[{q:'장사가 안 되는데 접어야 할까?',mode:'logic',
   a:'폐업을 결정하시기 전에 희망리턴패키지를 확인하세요. 점포철거비가 전용면적 3.3㎡당 20만원, 최대 600만원까지 나오고 폐업 전후 모두 신청할 수 있습니다. 다만 실제 공사비를 증빙해야 하므로 철거 전후 사진과 공사내역서를 반드시 남기셔야 합니다. 재취업하면 장려수당도 최대 100만원 나옵니다.',
   cite:'저장된 매출 추이 · 2026 희망리턴패키지 공고 요건으로 판정'},
  {q:'정책자금 상담 전화가 왔는데 수수료를 달래',mode:'logic',
   a:'정책자금은 보증료 외에 어떤 비용도 들지 않습니다. 컨설팅 명목으로 대출금의 8~12%를 요구하고 부결되어도 청구하는 사례가 보고되고 있습니다.',
   cite:'정책자금 운영 규정으로 판단 · 저희도 이 영역에서 요금을 받지 않습니다'}],
 online:[{q:'회사 다니면서 이 사업 유지해도 되나?',mode:'logic',
   a:'온라인 판매업은 상시 근무가 필요하지 않아 겸업 자체는 가능합니다. 다만 회사 취업규칙의 겸업 금지 조항은 별도로 확인하셔야 하고, 사업자를 보유한 상태에서는 퇴사하더라도 실업급여를 신청할 수 없습니다.',
   cite:'저장된 업종 · 사업 형태 · 고용보험 상태로 계산'}],
 free:[{q:'사업자등록 하려는데 괜찮아?',mode:'logic',
   a:'등록하시기 전에 예비창업패키지를 먼저 확인하셔야 합니다. 2026년 기준 평균 4,000만 원이고 사업자등록 전에만 신청할 수 있어, 등록하는 순간 자격이 영구히 사라집니다.',
   cite:'저장된 사업자등록 여부 · 나이로 계산'},
  {q:'3.3% 뗀 거 돌려받을 수 있어?',mode:'logic',
   a:'국세 미환급금 64만 원이 조회됐습니다. 종합소득세 신고로 정산되며, 누락된 공제가 있으면 경정청구로 최대 5년까지 소급할 수 있습니다.',
   cite:'저장된 소득 형태 · 국세청 조회 결과로 계산'}],
 seeker:[{q:'지금 내가 받을 수 있는 게 뭐야?',mode:'logic',
   a:'실업급여 수급 자격이 확인됐습니다. 소득이 중위 28%라 국민취업지원제도와 에너지바우처, 문화누리카드도 함께 신청하실 수 있습니다. 다만 실업급여와 국민취업지원은 동시에 받을 수 없습니다.',
   cite:'저장된 고용보험 이력 · 수급 자격 · 소득으로 계산'}],
 senior:[{q:'우리가 받을 수 있는 게 뭐야?',mode:'logic',
   a:'기초연금은 소득 하위 70% 이내로 확인되어 신청하실 수 있습니다. 미청구 국민연금 180만 원과 본인부담상한제 환급금 63만 원도 조회됐습니다.',
   cite:'저장된 연령 · 소득인정액 · 연금 조회 결과로 계산'}],
 welfare:[{q:'수급자인데 더 받을 수 있는 게 있나?',mode:'logic',
   a:'에너지바우처, 문화누리카드, 통신요금 감면, 전기요금 할인이 모두 수급 가구 대상입니다. 자동으로 지급되지 않고 각각 신청하셔야 합니다.',
   cite:'저장된 수급 자격 · 가구 정보로 계산'}],
 family:[{q:'우리 집이 받을 수 있는 게 뭐야?',mode:'logic',
   a:'자녀 관련 급여와 주거 지원을 함께 확인했습니다. 소득 구간에 따라 갈리는 항목이 있어 분야별 결과를 보시면 사유가 나옵니다.',
   cite:'저장된 가구원 수 · 소득 · 주택 소유 여부로 계산'}],
 heir:[{q:'상속 뭐부터 해야 해?',mode:'logic',
   a:'안심상속 원스톱 서비스로 고인의 재산과 채무를 먼저 조회하셔야 합니다. 그래야 상속포기 여부를 판단할 수 있습니다. 안심상속 자체는 사망월 말일부터 1년까지 되지만, 상속포기 기한 3개월이 먼저 끝나므로 그 안에 조회를 마치셔야 합니다.',
   cite:'저장된 사망일 · 경과 일수로 계산'},
  {q:'빚이 더 많으면 어떻게 해?',mode:'logic',
   a:'상속포기 또는 한정승인을 사망일로부터 3개월 이내에 가정법원에 신청하셔야 합니다. 기한이 지나면 단순승인으로 간주되어 채무를 그대로 승계합니다. 법률구조공단에서 지원받으실 수 있습니다.',
   cite:'저장된 사망일 · 소득 요건으로 계산'}]
};

/* ── 진행 ── */
const RUN={
 corp:{key:'창업성장 R&D', title:'창업성장 R&D', amt:'최대 2억', dday:'마감 12일 남음',
   lead:'가점과 증빙을 먼저 채우도록 순서를 잡았습니다 · 선정 가능성은 계산하지 않습니다',
   steps:[['창업교육 이수','온라인 4시간 · 서류평가 가점','now'],
          ['특허 등록 전환 검토','출원 상태보다 등록이 기술성 증빙에 유리합니다','now'],
          ['서류 준비','7건 중 5건은 저장된 정보로 자동 제출','wait'],
          ['사업계획서 초안','공고의 평가 항목과 배점을 목차로 생성','wait'],
          ['제출','입력값 복사 · 최종 제출은 본인이','wait'],
          ['선정 후 관리','협약 · 집행 증빙 · 최종보고','wait']], paid:1},
 solo:{key:'경영안정자금', title:'경영안정자금', amt:'최대 7,000만', dday:'예산 62% 소진',
   lead:'매출 감소 증빙은 저장된 카드매출로 자동 제출됩니다',
   steps:[['매출 감소 증빙','카드매출 추이로 자동 생성','now'],
          ['서류 준비','5건 중 4건 자동 제출','now'],
          ['신청','소상공인정책자금 누리집','wait'],
          ['보증 심사','지역신용보증재단 · 보증료 외 비용 없음','wait'],
          ['부결 시','사유 확인 · 6개월 재신청 제한 안내','wait']], paid:0},
 online:{key:'희망리턴패키지', title:'희망리턴패키지', amt:'점포철거비 최대 600만', dday:'폐업 전후 모두 신청 가능',
   lead:'철거 전후 사진과 공사내역서가 있어야 철거비가 나옵니다',
   steps:[['철거 전 사진 촬영','증빙의 전제 · 철거 시작 전에 남기셔야 합니다','now'],
          ['사업정리컨설팅 신청','재기전략 · 세무 · 부동산 · 심리 · 직무직능 중 3개','now'],
          ['철거 공사와 증빙 수집','공사내역서 · 이체확인증 · 철거 후 사진','wait'],
          ['점포철거비 신청','소상공인24 · 3.3㎡당 20만 · 최대 600만','wait'],
          ['재취업장려수당','취업 성공 시 최대 100만','wait']], paid:0},
 free:{key:'예비창업패키지', title:'예비창업패키지', amt:'평균 4,000만', dday:'사업자등록 전에만',
   lead:'등록하는 순간 자격이 영구히 사라집니다',
   steps:[['사업자등록 여부 확인','미등록 상태로 자격 유지 중','now'],
          ['공동인증서 발급','온라인 신청의 전제 · 은행 방문','now'],
          ['다음 공고 확인','통상 연 1회 · 1~2월 모집','wait'],
          ['사업계획서 초안','평가 항목과 배점 기반 생성','wait'],
          ['제출','K-Startup · 본인이 최종 제출','wait']], paid:1},
 worker:{key:'중소기업 취업자 소득세 감면', title:'중소기업 취업자 소득세 감면', amt:'연 200만 한도 · 90%', dday:'제도 일몰 3개월 전',
   lead:'2026년 12월 31일 종료 예정이라 지금 신청해야 남은 기간을 받습니다',
   steps:[['재직 · 업종 확인','고용보험과 업종코드로 자동 대조','now'],
          ['잔여 기간 산정','취업일 기준 청년 5년','now'],
          ['신청서 작성','회사 제출용 양식 자동 생성','wait'],
          ['회사 제출','원천징수의무자 경유 · 본인이 제출','wait'],
          ['경정청구','미신청분 소급 · 최대 5년','wait']], paid:0},
 seeker:{key:'실업급여', title:'실업급여', amt:'150일 지급', dday:'이직일로부터 12개월 이내',
   lead:'워크넷 구직등록이 선행돼야 합니다',
   steps:[['이직확인서 확인','고용보험 이력으로 자동 확인','now'],
          ['워크넷 구직등록','신청 전 필수','now'],
          ['수급자격 신청','고용센터 방문','wait'],
          ['실업인정','1~4주 간격 · 구직활동 증빙','wait']], paid:0},
 senior:{key:'기초연금', title:'기초연금', amt:'월 최대 34만 9,700원', dday:'상시 신청',
   lead:'다른 감면의 전제가 되므로 먼저 신청하시는 편이 좋습니다',
   steps:[['소득인정액 확인','재산과 소득으로 자동 산정','now'],
          ['신청','주민센터 또는 복지로','wait'],
          ['연계 감면 신청','통신요금 · 교통 감면','wait']], paid:0},
 welfare:{key:'에너지바우처', title:'에너지바우처', amt:'연 29.5~70.1만', dday:'6~12월 신청 기간',
   lead:'자동으로 지급되지 않아 신청하셔야 합니다',
   steps:[['수급 자격 확인','자동 확인','now'],
          ['신청','주민센터 또는 복지로','wait'],
          ['연계 지원 확인','문화누리 · 통신 · 전기요금 감면','wait']], paid:0},
 heir:{key:'안심상속 원스톱 서비스', title:'안심상속 원스톱 서비스', amt:'수수료 없음', dday:'상속포기 기한이 먼저 옵니다',
   lead:'재산과 채무를 먼저 조회해야 상속포기 여부를 판단할 수 있습니다',
   steps:[['사망신고 확인','완료','done'],
          ['안심상속 신청','사망월 말일부터 1년 이내 · 지금 가능','now'],
          ['재산 · 채무 조회 결과','금융 · 부동산 · 세금 일괄','wait'],
          ['상속포기 여부 판단','채무가 많으면 3개월 이내 결정','wait'],
          ['상속세 신고','6개월 이내','wait']], paid:1},
 family:{guard:c=>!c.home.own, title:'주거 지원 확인', amt:'유형별 상이', dday:'공고별',
   lead:'소득 구간에 따라 신청 가능한 유형이 갈립니다',
   steps:[['소득 요건 확인','건강보험료 기준으로 자동 판정','now'],
          ['무주택 확인','주민등록 · 재산 정보로 자동 확인','now'],
          ['공고 확인','LH · SH · 지자체','wait'],
          ['청약 신청','본인이 최종 제출','wait']], paid:0}
};

/* ── '진행 중인 건' 카드 선택 순서 ──
   ROLE 선언 순서가 아니라 급한 순서로 고릅니다.
   기한이 흐르는 사건(상속·실직)이 먼저이고,
   해당 제도의 판정 결과가 '불가'인 역할은 건너뜁니다. */
const RUN_ORDER=['heir','seeker','corp','solo','online','free','senior','welfare','worker','family'];
