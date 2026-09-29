/* ═══════════ 로드맵 · 오늘 동선 ═══════════════════════════════
   로드맵   = 몇 달~몇 년 단위. 목표(창업·법인 전환·퇴사·이사·출산)가 있을 때 무엇을 먼저 하나
   오늘 동선 = 하루 단위. 한 번 나갈 때 어디를 어떤 순서로 들르고 무엇을 챙기나

   제도 수백 건을 늘어놓지 않고 '행동'으로 묶습니다. 행동 하나(사업자등록·휴업·전입…)를 하면
   어떤 제도가 열리고 닫히는지는 판정 엔진에 바뀐 상태를 넣고 다시 돌려 계산합니다(반사실 판정).
   안전장치: 사용자가 고른 목표 안의 행동만 계산합니다. "폐업하면 +N원", "세대분리하면 수급" 같은
   조작 경로는 제안하지 않습니다. 순서 규칙은 단정하지 않고 확인처를 붙입니다. */

const escH=s=>String(s==null?'':s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const clone=o=>JSON.parse(JSON.stringify(o));

/* ── 행동 사전 · 바뀌는 사실과 들르는 곳 ── */
const ACT={
  quit:{n:'퇴사', place:'회사', ch:'self',
    apply:c=>{ c.work.on=false; c.work.quit='end'; },
    note:'계약만료·권고사직 같은 비자발적 퇴사로 가정했습니다. 자발적 퇴사는 실업급여 대상이 아닙니다',
    docs:['이직확인서 제출 요청(회사 → 고용보험)']},
  bizPause:{n:'사업자 휴업 신고', place:'홈택스', ch:'online', alt:'세무서 방문도 가능',
    apply:c=>{ c.biz.on=false; },
    note:'휴업 상태에서 실업을 인정할지는 고용센터가 판단합니다. 영업을 접을 계획이면 폐업이 확실합니다',
    docs:['공동인증서 또는 간편인증']},
  bizClose:{n:'사업자 폐업 신고', place:'홈택스', ch:'online', alt:'세무서 방문도 가능', irrev:true,
    apply:c=>{ c.biz.on=false; c.biz.close=true; },
    note:'같은 업종으로 다시 창업하면 폐업 후 3년(부도·파산 2년) 동안은 창업으로 보지 않습니다',
    docs:['공동인증서 또는 간편인증']},
  jobReg:{n:'구직 등록', place:'고용24', ch:'online', docs:['간편인증'],
    note:'실업급여 신청 전에 반드시 해야 합니다'},
  uiEdu:{n:'수급자격 신청자 온라인 교육', place:'고용24', ch:'online', docs:[]},
  bank:{n:'실업급여 받을 통장 준비', place:'은행', ch:'visit', docs:['신분증'],
    note:'채무 압류가 걱정되면 압류방지 전용 통장(희망지킴이통장)을 만드세요. 일반 통장이면 사본만 챙기면 됩니다'},
  uiApply:{n:'실업급여 수급자격 신청', place:'고용센터', ch:'visit', docs:['신분증','통장 사본'],
    report:'수급 중에 취업·사업 시작·소득이 생기면 실업인정일에 신고해야 합니다. 신고하지 않으면 부정수급입니다'},
  bizOpen:{n:'사업자등록', place:'홈택스', ch:'online', irrev:true,
    apply:c=>{ c.biz.on=true; c.biz.kind=c.biz.kind||'solo'; c.biz.label=c.biz.label||'개인사업자'; c.biz.years=0; c.biz.plan=false; },
    note:'등록 순간 예비창업자 전용 지원은 닫힙니다',
    report:'실업급여를 받는 중이면 사업 개시를 신고해야 합니다'},
  corp:{n:'법인 설립 · 전환', place:'등기소 · 홈택스', ch:'visit', irrev:true,
    apply:c=>{ c.biz.kind='corp'; c.biz.label='법인'; },
    note:'같은 업종을 법인으로 바꾸는 것은 원칙적으로 창업으로 보지 않습니다. 업력은 개인사업자 개업일부터 이어집니다'},
  moveIn:{n:'전입신고', place:'정부24', ch:'online', alt:'새 주소지 주민센터 방문도 가능',
    apply:c=>{ c.admin.resMonths=0; c.admin.sidoMonths=0; },
    note:'이사 후 14일 안에 해야 합니다. 거주 기간 요건은 전입일부터 다시 셉니다'},
  birth:{n:'출생신고', place:'정부24', ch:'online', alt:'주민센터 방문 시 행복출산 원스톱으로 여러 건 한 번에',
    apply:c=>{ c.fam.infant=true; c.fam.kids=(c.fam.kids||0)+1; c.fam.pregnant=false; },
    note:'출생 후 1개월 안에 해야 합니다'},
};

/* ── 반사실 판정 · 행동 전과 후를 비교 ── */
const PLAN_CACHE={};
function flatJ(J){ const m={}; J.forEach(s=>s.res.forEach(r=>{ m[s.k+'|'+r.n]=r; })); return m; }
function actDiff(ids){
  const key=[PID, JSON.stringify(S.facts||{}), ids.join(','), (window.NATIONAL||[]).length, localOf(ctx()).length].join('#');
  if(PLAN_CACHE[key]) return PLAN_CACHE[key];
  const c0=ctx(), c1=clone(c0);
  ids.forEach(i=>{ const a=ACT[i]; if(a&&a.apply) a.apply(c1); });
  const A=flatJ(judgeAll(c0)), B=flatJ(judgeAll(c1));
  const open=[], lost=[], maybe=[];
  for(const k in B){ const a=A[k], b=B[k]; const s0=a?a.s:'no';
    if(b.s==='ok' && s0!=='ok') open.push(b);
    else if(b.s==='chk' && s0==='no') maybe.push(b); }
  for(const k in A){ const a=A[k], b=B[k]; if(a.s==='ok' && (!b||b.s==='no'||b.s==='lost')) lost.push({...a, why2:b?b.why:''}); }
  return PLAN_CACHE[key]={open, lost, maybe}; }

const sumOf=L=>{ const t=tally(L); return t.y+t.once+t.max; };
const listN=(L,n)=>L.slice().sort((a,b)=>sumOf([b])-sumOf([a])).slice(0,n);
function diffLine(d){
  const parts=[];
  if(d.open.length) parts.push(`<span style="color:var(--go);font-weight:700">열림 ${d.open.length}건${sumOf(d.open)?` · ${won(sumOf(d.open))}`:''}</span>`);
  if(d.maybe.length) parts.push(`<span style="color:var(--warn)">확인 대상 ${d.maybe.length}건</span>`);
  if(d.lost.length) parts.push(`<span style="color:var(--stop);font-weight:700">닫힘 ${d.lost.length}건${sumOf(d.lost)?` · ${won(sumOf(d.lost))}`:''}</span>`);
  return parts.length?parts.join(' · '):'<span style="opacity:.7">판정 결과가 바뀌는 제도는 없습니다</span>'; }
const names=(L,n)=>listN(L,n).map(r=>escH(r.n)).join(' · ')+(L.length>n?` 외 ${L.length-n}건`:'');

/* ── 로드맵 시나리오 ── */
const SCEN={
  startup:{n:'창업 준비', d:'사업자등록 전후로 받을 수 있는 것이 갈립니다', can:c=>true,
    fit:c=>!c.biz.on&&!!c.biz.plan,   /* 창업 준비 의사가 확인된 경우만 · 프리랜서라는 사실만으로는 아님 */
    steps:c=>{ const reg=actDiff(['bizOpen']);
      return [
        c.biz.on?{t:'지금은 사업자가 있습니다', warn:true,
          d:'예비창업자 전용 지원(예비창업패키지·신사업창업사관학교 등)은 사업자가 있는 동안 신청할 수 없습니다. 폐업 후 <b>다른 업종</b>으로 창업하면 다시 대상이 됩니다'}:
        {t:'사업자 없는 상태에서 먼저 신청', now:true,
          d:`등록하면 닫히는 제도 <b>${reg.lost.length}건</b>을 먼저 신청하세요`, list:reg.lost},
        {t:'선정·협약 시점에 사업자등록', act:'bizOpen', diff:reg},
        {t:'업력 3년 안에', d:'초기창업패키지 등 업력 기준 지원은 개업일부터 3년 안에만 신청됩니다. 개업일이 곧 시계의 시작입니다'},
        {t:'업력 3~7년', d:'창업도약패키지 · 이노비즈 인증 · 정책자금 확대'} ]; }},
  convert:{n:'개인 → 법인 전환', d:'전환이 창업으로 인정되는지, 업력이 이어지는지가 핵심입니다', can:c=>c.biz.on&&c.biz.kind!=='corp',
    fit:c=>c.biz.on&&c.biz.kind!=='corp'&&!!c.biz.toCorp,   /* 전환 계획이 있을 때만 · 개인사업자라는 사실만으로는 아님 */
    steps:c=>{ const cv=actDiff(['corp']); const left=Math.max(0,3-(c.biz.years||0));
      return [
        {t:'전환 전에 확인', warn:true,
          d:`같은 업종으로 법인 전환하면 <b>창업으로 보지 않는 것이 원칙</b>입니다 → 예비창업패키지 대상 아님. 업력은 개인사업자 개업일부터 이어집니다(지금 ${c.biz.years||0}년차${left?` · 업력 3년 기준 지원은 약 ${left}년 남음`:' · 업력 3년 기준 지원은 이미 지남'}). 다른 업종으로 새로 창업하면 달라지므로 공고마다 확인하세요`},
        {t:'법인 설립 · 전환', act:'corp', diff:cv},
        {t:'세금 · 명의 이전', expert:true, d:'사업용 자산 이전 시 양도세 이월과세 등 감면 요건이 있습니다. 세무사와 전환 방식(현물출자·사업양수도)을 정하세요'} ]; }},
  quit:{n:'퇴사 후 실업급여', d:'신청하러 가기 전에 끝내야 할 것이 있습니다', can:c=>c.work.on||c.work.insured>0,
    fit:c=>!!c.work.leaving||(!c.work.on&&c.work.insured>0),
    steps:c=>{ const pre=c.work.on?['quit']:[];
      const base=pre.length?actDiff(pre):null;
      const out=[];
      if(c.work.on) out.push({t:'퇴사', act:'quit', diff:base});
      if(c.biz.on) out.push({t:'사업자 휴업 또는 폐업 먼저', act:'bizPause', warn:true,
        d:`<b>${escH(c.biz.label||'사업자')}</b>가 살아 있으면 고용센터에서 반려되는 대표 사유입니다. 은행·고용센터 가기 전에 홈택스에서 먼저 처리하세요`});
      out.push({t:'구직 등록 · 온라인 교육', act:'jobReg', act2:'uiEdu'});
      out.push({t:'통장 준비', act:'bank'});
      out.push({t:'고용센터에서 수급자격 신청', act:'uiApply'});
      if(c.biz.plan||c.biz.on) out.push({t:'수급 중 창업하게 되면', warn:true,
        d:'사업 개시를 신고해야 합니다. 남은 수급일수가 있으면 조기재취업수당 요건(수급일수 절반 이상 남기고 1년 이상 사업 유지 등)을 확인하세요'});
      return out; }},
  move:{n:'이사', d:'거주 기간이 0으로 돌아가 받던 것이 끊기고, 새 동네 것은 몇 달 뒤 열립니다', can:c=>true,
    fit:c=>!!c.admin.moving,
    steps:c=>{ const mv=actDiff(['moveIn']);
      return [
        mv.lost.length?{t:'이사 전에 신청', now:true, d:`전입하면 거주 기간 요건 때문에 닫히는 제도 <b>${mv.lost.length}건</b>을 먼저 신청하세요`, list:mv.lost}
          :{t:'이사 전 확인', d:'지금 받을 수 있는 것 중 전입으로 끊기는 제도는 없습니다'},
        {t:'전입신고 (14일 안)', act:'moveIn', diff:mv},
        {t:'새 동네 거주 기간 채우기', d:'"관내 6개월·1년 이상 거주" 요건이 붙은 제도가 전국에 약 490건입니다. 전입일이 기준일입니다'} ]; }},
  birth:{n:'출산', d:'출생신고 한 번에 여러 제도가 열립니다', can:c=>c.age<55,
    fit:c=>!!c.fam.pregnant,
    steps:c=>{ const b=actDiff(['birth']);
      return [
        {t:'임신 중', d:'임신·출산 진료비 바우처 · 임산부 교통비(지역별) · 난임 지원'},
        {t:'출생신고 (1개월 안)', act:'birth', diff:b},
        {t:'행복출산 원스톱', d:'주민센터에서 출생신고할 때 부모급여·아동수당·첫만남이용권 등을 한 번에 신청합니다'} ]; }},
};

/* 직원 채용 · 아직 뽑지 않은 사람이라 연동으로 알 수 없습니다 → 문답으로 조건을 좁혀 순서를 안내합니다.
   기존 직원(4대보험 사업장 자료로 보수월액·취득일이 확인되는 사람)은 로드맵이 아니라 할 일에서 바로 판정·제출합니다 */
const HQ=[['pay','뽑을 사람의 월 보수',[['lo','270만 원 미만'],['mid','270만~450만'],['hi','450만 초과']]],
  ['youth','만 15~34세 청년인가요',[['y','예'],['n','아니요']]],
  ['full','정규직 · 주 28시간 이상인가요',[['y','예'],['n','아니요']]]];
SCEN.hire={n:'직원 채용', d:'누구를 어떤 조건으로 뽑느냐에 따라 받을 수 있는 지원이 갈립니다. 채용 전에 먼저 해야 하는 신청이 있습니다',
  can:c=>c.biz.on, fit:c=>c.biz.on&&!!c.biz.hire,
  steps:c=>{ const q=S.hq||{}, emp=c.biz.emp||0, cap=/^(서울|경기|인천)/.test(c.region||'');
    const out=[{qa:true}];
    const leapNo=cap&&emp<5?`수도권은 상시근로자 5명 이상이어야 합니다 · 지금 ${emp}명`
      : q.youth==='n'?'만 15~34세 청년 채용이 대상입니다' : q.full==='n'?'정규직 · 주 28시간 이상 채용이 대상입니다'
      : q.pay==='hi'?'월 급여 450만 원 이하가 대상입니다':'';
    const leapOk=!leapNo&&q.youth==='y'&&q.full==='y'&&q.pay&&q.pay!=='hi';
    if(leapNo) out.push({t:'청년일자리도약장려금', warn:true, d:`해당하지 않습니다 · ${leapNo}`});
    else out.push({t:'채용 전 · 청년일자리도약장려금 참여 신청', now:leapOk,
      d:`고용24에서 사업 참여를 먼저 신청합니다. 채용한 뒤에 신청하면 인정되지 않는 경우가 있습니다 · 기업 1년간 최대 720만(선정형)${leapOk?'':' · 위 질문에 답하시면 대상인지 좁혀집니다'}`});
    out.push({t:'채용 · 근로계약', d: q.pay==='lo'?'월 보수를 <b>270만 원 미만</b>으로 정하면 두루누리 대상입니다'
      : q.pay==='mid'?'월 보수 270만 원 이상이라 <b>두루누리는 대상이 아닙니다</b>' : q.pay==='hi'?'월 보수 450만 원 초과라 두루누리·청년도약 모두 대상이 아닙니다'
      : '월 보수가 270만 원 미만이면 두루누리, 450만 원 이하면 청년도약 대상이 됩니다'});
    const duruNo=emp>=10?`상시근로자 10명 미만 사업장만 대상입니다 · 지금 ${emp}명`: (q.pay==='mid'||q.pay==='hi')?'월 보수 270만 원 이상이라 대상이 아닙니다':'';
    out.push(duruNo?{t:'4대보험 자격 취득 신고', d:`두루누리 사회보험료 지원은 해당하지 않습니다 · ${duruNo}`}
      :{t:'4대보험 자격 취득 신고 · 같은 달 두루누리 신청', now:q.pay==='lo',
        d:'근로자 1인당 보험료의 80% · 월 최대 10.9만. <b>신청한 달부터만</b> 지원되고 소급되지 않습니다. 최근 6개월 국민연금·고용보험 가입 이력이 없는 사람이어야 합니다'});
    if(!leapNo) out.push({t:'6개월 근속 후 · 청년도약 1차 지원금 신청', d:'이후 분기별로 신청합니다'});
    out.push({t:'이미 있는 직원은', d:'보수월액·취득일이 4대보험 사업장 자료로 확인되면 할 일에서 바로 판정·제출합니다. 로드맵은 앞으로 뽑을 사람만 다룹니다'});
    return out; }};

function stepCard(st,i){
  if(st.qa){ const q=S.hq||{};
    return `<div class="card pad" style="margin-top:8px"><p style="font-weight:700;font-size:15px">뽑을 사람에 대해 알려 주세요</p>
      <p style="font-size:12.5px;opacity:.8;margin-top:2px">아직 채용 전이라 연동으로는 알 수 없습니다 · 답에 따라 아래 순서가 바뀝니다</p>
      ${HQ.map(([k,l,o])=>`<div style="margin-top:10px"><p style="font-size:13px;font-weight:600">${l}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px">${o.map(([v,t])=>`<button class="btn btn-sm hq" data-q="${k}" data-v="${v}" style="${q[k]===v?'background:var(--go);color:#fff':''}">${t}</button>`).join('')}</div></div>`).join('')}
    </div>`; }
  const a=st.act?ACT[st.act]:null, a2=st.act2?ACT[st.act2]:null;
  const tone=st.warn?'n-warn':st.now?'n-go':'';
  return `<div class="card pad ${tone}" style="margin-top:8px;${tone?'':'background:var(--card,#fff)'}">
    <div style="display:flex;gap:10px;align-items:flex-start">
      <div style="min-width:26px;height:26px;border-radius:13px;background:${st.now?'var(--go)':st.warn?'var(--warn)':'var(--rule)'};color:${st.now||st.warn?'#fff':'inherit'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${i+1}</div>
      <div style="flex:1">
        <p style="font-weight:700;font-size:15px">${escH(st.t)}${a&&a.irrev?' <span style="font-size:11.5px;color:var(--stop);font-weight:600">되돌리기 어려움</span>':''}${st.expert?' <span style="font-size:11.5px;opacity:.7">전문가</span>':''}</p>
        ${st.d?`<p style="font-size:13.5px;margin-top:3px">${st.d}</p>`:''}
        ${a?`<p style="font-size:12.5px;margin-top:4px;opacity:.85">${escH(a.place)}${a.alt?' · '+escH(a.alt):''}${a2?' · 이어서 '+escH(a2.n):''}</p>`:''}
        ${a&&a.note?`<p style="font-size:12.5px;margin-top:3px">${escH(a.note)}</p>`:''}
        ${st.diff?`<p style="font-size:13px;margin-top:6px">${diffLine(st.diff)}</p>
          ${st.diff.open.length?`<p style="font-size:12px;margin-top:2px;opacity:.8">열림: ${names(st.diff.open,4)}</p>`:''}
          ${st.diff.lost.length?`<p style="font-size:12px;margin-top:2px;opacity:.8">닫힘: ${names(st.diff.lost,4)}</p>`:''}`:''}
        ${st.list&&st.list.length?`<p style="font-size:12px;margin-top:4px;opacity:.85">${names(st.list,5)}</p>`:''}
        ${a&&a.report?`<p style="font-size:12.5px;margin-top:6px;color:var(--stop)"><b>신고 의무</b> · ${escH(a.report)}</p>`:''}
      </div></div></div>`; }

const SCEN_ORDER=['birth','quit','startup','hire','move','convert'];
const fitOf=c=>SCEN_ORDER.filter(k=>SCEN[k].fit(c));
function viewRoad(){
  const c=ctx(); const fit=fitOf(c);
  const other=SCEN_ORDER.filter(k=>!fit.includes(k)&&SCEN[k].can(c));
  if(S._scenPid!==PID){ S._scenPid=PID; S.scen=null; S.hq={}; }   /* 사람이 바뀌면 목표도 새로 감지 */
  if(S.scen&&!(SCEN[S.scen]&&SCEN[S.scen].can(c))) S.scen=null;   /* 다른 사람으로 바꿨을 때 불가능한 목표가 남지 않게 */
  if(S.scen===undefined||S.scen===null) S.scen=fit[0]||null;
  const chip=k=>`<button class="btn btn-sm scen" data-k="${k}" aria-pressed="${k===S.scen}" style="${k===S.scen?'background:var(--go);color:#fff;border-color:var(--go)':''}">${SCEN[k].n}</button>`;
  const sc=S.scen?SCEN[S.scen]:null;
  return `<h2 class="sec" style="margin-top:0">사라지기 전에 해야 할 것</h2>
    <div class="card pad" style="margin-bottom:6px">${deadlineBlock(c)}</div>
    <h2 class="sec" style="margin-top:26px">내 진행 상황</h2>
    ${roadProgress(c)}
    <h2 class="sec" style="margin-top:26px">목표별 순서 · 무엇을 먼저 할까</h2>
    ${fit.length?`<p style="font-size:13.5px;opacity:.85;margin-bottom:8px">지금 상황에서 감지된 목표입니다. 각 행동으로 열리고 닫히는 제도를 지금 판정 결과로 다시 계산합니다.</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${fit.map(chip).join('')}</div>`
      :`<p style="font-size:13.5px;opacity:.85">지금 상황에서 감지된 목표가 없습니다. 계획이 생기면 아래에서 골라 보세요.</p>`}
    ${other.length?`<details style="margin-top:10px" ${S.scen&&other.includes(S.scen)?'open':''}><summary style="font-size:13px;cursor:pointer;opacity:.85">다른 목표 · 계획이 있을 때만</summary>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${other.map(chip).join('')}</div></details>`:''}
    ${sc?`<div class="card pad" style="margin-top:12px">
      <h3>${sc.n}</h3><p style="font-size:13.5px;margin-top:2px;opacity:.85">${sc.d}</p>
      ${fit.includes(S.scen)?'':'<p style="font-size:12.5px;margin-top:4px;color:var(--warn)">감지된 목표가 아니라 고르신 가정으로 계산합니다</p>'}
    </div>
    ${(()=>{ let n=0; return sc.steps(c).map(x=>stepCard(x, x.qa?0:n++)).join(''); })()}
    <p style="font-size:12px;opacity:.7;margin-top:12px">순서 규칙은 법령·공고 기준의 일반 원칙입니다. 최종 판단은 고용센터·세무서·주민센터 등 접수 기관이 합니다. 로드맵은 고르신 목표 안의 행동만 계산합니다.</p>`:''}`; }

/* ── 오늘 동선 · 출발 전(온라인) → 들를 곳 순서 → 챙길 것 ── */
const PLACE_OF={bank:'은행', center:'주민센터', office:'기관 방문'};
function viewRoute(){
  const c=ctx(); const fit=fitOf(c);
  const goal=S.scen&&fit.includes(S.scen)?S.scen:fit[0];
  const acts=[];
  if(goal){ SCEN[goal].steps(c).forEach(st=>{ [st.act,st.act2].forEach(a=>{ if(a&&ACT[a]&&ACT[a].ch!=='self'&&!acts.includes(a)) acts.push(a); }); }); }
  /* 로드맵에서 오늘 할 수 있는 것: 되돌리기 어려운 행동(사업자등록·폐업·법인 전환)은 동선에 자동으로 넣지 않습니다 */
  const today=acts.filter(a=>!ACT[a].irrev);
  const pre=today.filter(a=>ACT[a].ch==='online');
  const stops=[]; today.filter(a=>ACT[a].ch==='visit').forEach(a=>{ const p=ACT[a].place; let s=stops.find(x=>x.p===p); if(!s) stops.push(s={p,acts:[],items:[]}); s.acts.push(a); });
  /* 같은 곳에서 함께 처리할 수 있는 '받을 수 있음' 제도 · 금액 큰 순 3건 */
  const J=judgeAll(c), ok=J.flatMap(s=>s.res.filter(x=>x.s==='ok'));
  /* 전국 공통분(nat)은 방문처가 기관마다 달라 주민센터로 묶지 않습니다 · 규칙 101건과 우리 동네 것만 */
  /* 앱이 대신 제출하는 것(auto·one)은 동선에 넣지 않습니다 · 본인이 직접 가거나 챙겨야 하는 것만 */
  const mine=x=>{ const a=agency(x); return a!=='auto'&&a!=='one'; };
  const byApp=ok.filter(x=>!mine(x)&&moneyKind(x)!=='svc');   /* 돈이 되는 것만 셉니다 · 서비스는 제출할 게 아님 */
  const okS=J.flatMap(s=>s.k==='nat'?[]:s.res.filter(x=>x.s==='ok'&&mine(x)));
  const onl=listN(ok.filter(x=>x.visit==='online'&&mine(x)),3);
  const center=listN(okS.filter(x=>x.visit==='center'),3);
  const bank=listN(okS.filter(x=>x.visit==='bank'),2);
  if(bank.length){ let s=stops.find(x=>x.p==='은행'); if(!s) stops.push(s={p:'은행',acts:[],items:[]}); s.items=bank; }
  if(center.length) stops.push({p:'주민센터',acts:[],items:center});
  const docsOf=r=>((r.guide&&r.guide.doc)||[]).filter(d=>d[1]!=='auto').map(d=>d[0]);
  const bring=[...new Set(today.flatMap(a=>ACT[a].docs||[]))];
  const bring2=[...new Set(stops.flatMap(s=>s.items.flatMap(docsOf)))].filter(d=>!bring.includes(d));
  const warns=goal?SCEN[goal].steps(c).filter(s=>s.warn&&s.act&&today.includes(s.act)):[];
  const row=(t,sub,tag)=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-top:1px solid var(--rule-2)"><div><p style="font-size:14px;font-weight:600">${t}</p>${sub?`<p style="font-size:12px;opacity:.8">${sub}</p>`:''}</div>${tag?`<span style="font-size:12px;white-space:nowrap;opacity:.85">${tag}</span>`:''}</div>`;
  const amt=r=>r.amt?escH(r.amt):'';
  let n=0;
  return `<h2 class="sec" style="margin-top:0">오늘 동선</h2>
    <p style="font-size:13.5px;opacity:.85;margin-bottom:10px">${goal?`목표 <b>${SCEN[goal].n}</b> 기준으로 오늘 할 수 있는 것만 순서대로 묶었습니다.`:'오늘 바로 처리할 수 있는 것을 들를 곳 순서로 묶었습니다.'} <a href="#" id="to-road">로드맵에서 목표 바꾸기 ›</a></p>
    ${goal==='quit'&&c.work.on?`<div class="notice" style="margin-bottom:8px;background:var(--rule-2)"><p style="font-size:13.5px">아직 재직 중이라 <b>퇴사한 다음 첫 평일</b> 기준 동선입니다. 퇴사 전에는 회사에 이직확인서 제출을 요청해 두세요.</p></div>`:''}
    ${warns.map(w=>`<div class="notice n-warn" style="margin-bottom:8px"><p style="font-size:13.5px"><b>먼저</b> · ${escH(ACT[w.act].n)} — ${w.d||''}</p></div>`).join('')}
    <div class="card pad"><h3>${++n}. 출발 전 · 집에서</h3>
      ${pre.map(a=>row(escH(ACT[a].n), escH(ACT[a].place)+(ACT[a].note?' · '+escH(ACT[a].note):''), '온라인')).join('')}
      ${onl.length?`<p style="font-size:12px;opacity:.75;margin-top:8px">시간 나면 · 온라인으로 끝나는 것</p>${onl.map(r=>row(escH(r.n), escH(r.where||''), amt(r))).join('')}`:''}
      ${byApp.length?`<p style="font-size:12.5px;margin-top:10px;opacity:.85">앱이 연동 서류로 대신 제출하는 <b>${byApp.length}건</b>은 동선에 넣지 않았습니다 · <a href="#" id="to-todo">할 일에서 한 번에 제출 ›</a></p>`:''}
      ${!pre.length&&!onl.length&&!byApp.length?'<p style="font-size:13px;opacity:.7;margin-top:6px">집에서 할 것이 없습니다</p>':''}
    </div>
    ${stops.map(s=>`<div class="card pad" style="margin-top:8px"><h3>${++n}. ${escH(s.p)}</h3>
      ${s.acts.map(a=>row(escH(ACT[a].n), ACT[a].note?escH(ACT[a].note):'', '')).join('')}
      ${s.acts.map(a=>ACT[a].report?`<p style="font-size:12.5px;color:var(--stop);margin-top:4px"><b>신고 의무</b> · ${escH(ACT[a].report)}</p>`:'').join('')}
      ${s.items.length?`<p style="font-size:12px;opacity:.75;margin-top:8px">간 김에 함께</p>${s.items.map(r=>row(escH(r.n), escH(r.where||''), amt(r))).join('')}`:''}
    </div>`).join('')}
    <div class="card pad" style="margin-top:8px"><h3>챙길 것</h3>
      ${bring.length?`<p style="font-size:13.5px;margin-top:4px"><b>오늘 목표</b> · ${bring.map(escH).join(' · ')}</p>`:'<p style="font-size:13px;opacity:.7">목표 행동에 따로 챙길 서류가 없습니다</p>'}
      ${bring2.length?`<p style="font-size:12.5px;margin-top:4px;opacity:.85"><b>간 김에 함께 하려면</b> · ${bring2.map(escH).join(' · ')}</p>`:''}
      <p style="font-size:12px;opacity:.7;margin-top:6px">연동으로 자동 제출되는 서류는 빼고 적었습니다</p></div>
    ${acts.some(a=>ACT[a].irrev)?`<p style="font-size:12.5px;margin-top:10px;opacity:.85">되돌리기 어려운 행동(${acts.filter(a=>ACT[a].irrev).map(a=>escH(ACT[a].n)).join(' · ')})은 동선에 자동으로 넣지 않습니다. 로드맵에서 순서를 확인한 뒤 결정하세요.</p>`:''}
    ${visitBundles(J)}`; }

function bindPlan(){
  document.querySelectorAll('.scen').forEach(b=>b.onclick=()=>{ S.scen=b.dataset.k; draw(); });
  document.querySelectorAll('.hq').forEach(b=>b.onclick=()=>{ const y=window.scrollY; S.hq=S.hq||{}; S.hq[b.dataset.q]=b.dataset.v; draw(); window.scrollTo({top:y,behavior:'instant'}); });
  const t=$('to-road'); if(t) t.onclick=e=>{ e.preventDefault(); S.view='road'; drawNav(); draw(); };
  const u=$('to-todo'); if(u) u.onclick=e=>{ e.preventDefault(); S.view='todo'; drawNav(); draw(); window.scrollTo({top:0,left:0,behavior:'instant'}); }; }
