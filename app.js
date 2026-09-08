/* ═══════════ 상태 ═══════════ */
let PID='d';
let MINE=null;                       /* 직접 입력한 사람 */
const S={stage:'landing', view:'check', ans:{}, ob:0, open:{}, sec:{}, asked:[], ti:0, type:null};
const $=id=>document.getElementById(id);
const nav=$('nav'), main=$('main');
const VIEWS=[['check','점검'],['todo','할 일'],['me','내 정보'],['ask','물어보기']];

const me=()=>PID==='me'?MINE:CTX[PID];
const roles=()=>Object.keys(ROLE).filter(k=>ROLE[k].on(me()));
const R0=()=>roles()[0];

function ctx(){ const c=JSON.parse(JSON.stringify(me())), a=S.ans;
  if(a.leave==='soon') c.work.quit=a.why||'end';
  if(a.why) c.work.quit=a.why;
  if(a.close&&a.close!=='no') c.biz.close=true;
  if(a.hire==='yes') c.biz.hire=true;
  if(a.plan==='yes') c.fam.pregnant=true;
  if(a.moving==='yes') c.admin.moving=true;
  return c; }
function judgeAll(){ const c=ctx();
  return SECTORS.map(s=>({...s, res:s.items.map(it=>({n:it.n, type:it.type||'cash', where:it.where, visit:it.visit, chk:it.chk||null, ...it.f(c)}))})); }

/* 출처 한 줄 · 확인한 것과 확인하지 않은 것을 구분해 보여줍니다 */
const srcLine=r=> r.chk
  ? `<div class="src">확인 ${r.chk.d} · <a href="${r.chk.u}" target="_blank" rel="noopener">${r.chk.src}</a></div>`
  : `<div class="src nochk">출처 미확인 · 금액과 요건을 다시 확인해야 합니다</div>`;

/* 계획 문답 — 연동으로 알 수 없는 것만 */
const PLANQ=[
 {k:'hire', need:c=>c.biz.on, q:'올해 안에 직원을 뽑을 계획이 있나요?',
  s:'채용 전에만 신청할 수 있는 지원이 있습니다', a:[['no','없습니다'],['yes','있습니다']]},
 {k:'close', need:c=>c.biz.on, q:'사업을 정리할 계획이 있으신가요?',
  s:'폐업 신고 전에만 받을 수 있는 지원이 있습니다', a:[['no','계속 운영합니다'],['maybe','고민 중입니다'],['yes','정리하려고 합니다']]},
 {k:'leave', need:c=>c.work.on, q:'퇴사를 계획하고 계신가요?',
  s:'퇴사 전에만 할 수 있는 것이 있습니다', a:[['no','아닙니다'],['plan','준비 중입니다'],['soon','곧 퇴사합니다']]},
 {k:'why', need:c=>c.work.on||c.work.insured>0, q:'퇴사한다면 사유가 어떻게 되나요?',
  s:'실업급여 수급 자격이 여기서 갈립니다', a:[['none','해당 없음'],['self','자발적 퇴사'],['end','계약 만료 또는 권고사직']]},
 {k:'plan', need:c=>c.fam.married||c.age<45, q:'출산 계획이 있으신가요?',
  s:'출산 전에만 신청할 수 있는 지원이 있습니다', a:[['no','없습니다'],['yes','있습니다 또는 임신 중']]},
 {k:'moving', need:c=>c.home.rent, q:'이사나 재계약 계획이 있으신가요?',
  s:'계약 전에 확인해야 하는 것이 있습니다', a:[['no','없습니다'],['yes','있습니다']]}
];
const planq=()=>{const c=me(); return PLANQ.filter(q=>q.need(c));};

/* ═══════════ 스테이지 ═══════════ */
function stage(s){ S.stage=s;
  $('landing').classList.toggle('hide', s!=='landing');
  $('onboard').classList.toggle('hide', s!=='onboard');
  $('app-shell').classList.toggle('hide', s!=='app');
  window.scrollTo(0,0);
  if(s==='onboard') drawOb();
  if(s==='app'){ ident(); drawNav(); draw(); } }
document.querySelectorAll('.start').forEach(b=>b.onclick=()=>{ S.ob=0; stage('onboard'); });

/* ═══════════ 온보딩 ═══════════ */
const SRC_ALL=[
 ['공공 마이데이터','주민등록 · 가족관계 · 사업자등록 · 법인등기 · 납세증명 · 4대보험 · 소득금액','신청 시점'],
 ['홈택스 · 위택스','부가세 신고 · 원천징수 · 미환급금 조회','신고 주기'],
 ['건강보험공단','자격 · 본인부담상한제 · 장기요양','분기'],
 ['고용보험','가입 이력 · 피보험 단위기간 · 이직 사유','변동 시'],
 ['신용정보','신용점수 · 연체 · 상환 부담 · 다중채무','월 1회'],
 ['카드매출 · 오픈마켓','일 단위 매출 추이','매일'],
 ['키프리스','특허 · 상표 출원과 등록','매일'],
 ['서민금융진흥원 · 통합연금포털','휴면예금 · 미청구 보험금 · 미청구 연금','분기'],
 ['공고 게시판','기업마당 · K-Startup · LH · SH · 지자체 · 복지로','매일']
];

function drawOb(){ const ob=$('ob-body');
  if(S.ob===0){
    ob.innerHTML=`<h2>본인 확인</h2>
    <p class="sub">실제 서비스에서는 간편인증 한 번으로 끝납니다.
      아래에서 사례를 고르시거나 <b>직접 입력</b>해 보실 수 있습니다.</p>
    ${Object.entries(CTX).map(([k,v])=>`<button class="pick" data-p="${k}">
      <b>${v.name}</b><span>${v.sub}</span></button>`).join('')}
    <button class="pick" data-p="me" style="border-color:var(--ink);border-width:1.5px">
      <b>직접 입력해 보기</b><span>내 상황을 넣고 판정 결과를 확인합니다</span></button>`;
    ob.querySelectorAll('.pick').forEach(b=>b.onclick=()=>{
      const p=b.dataset.p;
      S.ans={}; S.open={}; S.sec={}; S.asked=[]; S.ti=0; S.type=null;
      if(p==='me'){ S.ob=3; drawOb(); return; }
      PID=p; S.ob=1; drawOb(); runConnect(); });
    return; }

  if(S.ob===1){
    ob.innerHTML=`<h2>정보를 가져오는 중입니다</h2>
    <p class="sub">한 번만 인증하면 <b>연결 가능한 모든 곳을 조회</b>합니다. 이후에는 배경에서 갱신됩니다.</p>
    <div class="card pad" id="conn-list">
      ${SRC_ALL.map((x,i)=>`<div class="conn" data-i="${i}"><span class="dot"></span>
        <span class="n">${x[0]}<div class="s">${x[1]}</div></span>
        <span class="s" data-st="${i}">대기</span></div>`).join('')}</div>`;
    return; }

  if(S.ob===3){ ob.innerHTML=formHTML(); bindForm(); return; }

}

function runConnect(){ const n=SRC_ALL.length; let i=0;
  const step=()=>{ const L=$('conn-list'); if(!L) return;
    if(i>0){ const d=L.querySelector(`.conn[data-i="${i-1}"] .dot`), s=L.querySelector(`[data-st="${i-1}"]`);
      if(d)d.className='dot on'; if(s)s.textContent='완료'; }
    if(i<n){ const d=L.querySelector(`.conn[data-i="${i}"] .dot`), s=L.querySelector(`[data-st="${i}"]`);
      if(d)d.className='dot load'; if(s)s.textContent='조회 중'; i++; setTimeout(step,330); }
    else setTimeout(()=>{ S.view='check'; stage('app'); },260); };
  setTimeout(step,260); }

/* ═══════════ 직접 입력 ═══════════ */
function formHTML(){ return `<h2>직접 입력해 보기</h2>
  <p class="sub">실제 서비스에서는 연동으로 자동 채워지는 항목입니다.
    시연을 위해 <b>몇 가지만 넣으시면</b> ${RULE_COUNT}건을 판정합니다.</p>
  <div class="card pad">
    <div class="form-row"><label for="f-age">나이</label><input id="f-age" type="number" value="33" min="15" max="99"></div>
    <div class="form-row"><label for="f-region">거주지</label>
      <select id="f-region"><option>서울</option><option>경기</option><option>인천</option>
        <option>부산</option><option>대구</option><option>광주</option><option>대전</option><option>기타</option></select></div>
    <div class="form-row"><label>일하는 형태</label>
      <div class="chips" id="f-work">
        <button class="chip" data-v="none">없음</button>
        <button class="chip" data-v="worker" aria-pressed="true">직장인</button>
        <button class="chip" data-v="free">프리랜서</button>
        <button class="chip" data-v="corp">법인 대표</button>
        <button class="chip" data-v="solo">개인 점포</button>
        <button class="chip" data-v="online">온라인 판매</button></div></div>
    <div class="form-row"><label for="f-income">중위소득 대비</label>
      <select id="f-income"><option value="45">45% 이하</option><option value="58">50~60%</option>
        <option value="80">60~90%</option><option value="118" selected>90~120%</option>
        <option value="145">120~150%</option><option value="180">150% 초과</option></select></div>
    <div class="form-row"><label>주거</label>
      <div class="chips" id="f-home">
        <button class="chip" data-v="rent" aria-pressed="true">임차</button>
        <button class="chip" data-v="own">자가</button></div></div>
    <div class="form-row"><label for="f-deposit">보증금 (만원)</label><input id="f-deposit" type="number" value="3000"></div>
    <div class="form-row"><label for="f-monthly">월세 (만원)</label><input id="f-monthly" type="number" value="55"></div>
    <div class="form-row"><label>가족</label>
      <div class="chips" id="f-fam">
        <button class="chip" data-v="married">배우자</button>
        <button class="chip" data-v="kids">자녀</button>
        <button class="chip" data-v="infant">만 2세 이하</button>
        <button class="chip" data-v="single">한부모</button></div></div>
    <div class="form-row"><label>해당 사항</label>
      <div class="chips" id="f-misc">
        <button class="chip" data-v="welfare">기초생활수급</button>
        <button class="chip" data-v="disabled">장애 등록</button>
        <button class="chip" data-v="arrears">채무 연체</button>
        <button class="chip" data-v="death">부모 사망</button></div></div>
  </div>
  <button class="btn btn-fill btn-wide btn-lg" id="f-go">이 조건으로 판정하기</button>
  <button class="btn btn-wide" id="f-back">사례 목록으로</button>`; }

function bindForm(){
  document.querySelectorAll('#f-work .chip').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('#f-work .chip').forEach(x=>x.setAttribute('aria-pressed','false'));
    b.setAttribute('aria-pressed','true'); });
  document.querySelectorAll('#f-home .chip').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('#f-home .chip').forEach(x=>x.setAttribute('aria-pressed','false'));
    b.setAttribute('aria-pressed','true'); });
  ['#f-fam','#f-misc'].forEach(sel=>document.querySelectorAll(sel+' .chip').forEach(b=>b.onclick=()=>{
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed')==='true'?'false':'true'); }));
  $('f-back').onclick=()=>{ S.ob=0; drawOb(); };
  $('f-go').onclick=()=>{
    const pick=sel=>document.querySelector(sel+' .chip[aria-pressed="true"]')?.dataset.v;
    const many=sel=>[...document.querySelectorAll(sel+' .chip[aria-pressed="true"]')].map(x=>x.dataset.v);
    const w=pick('#f-work'), h=pick('#f-home'), fam=many('#f-fam'), ms=many('#f-misc');
    const age=+$('f-age').value||33, inc=+$('f-income').value;
    const o={name:'직접 입력', sub:`만 ${age}세 · ${$('f-region').value}`, tag:'직접 입력',
      age, region:$('f-region').value,
      home:{own:h==='own', rent:h==='rent', deposit:+$('f-deposit').value||0,
            monthly:+$('f-monthly').value||0, incomeRate:inc, car:0},
      fam:{married:fam.includes('married'), kids:fam.includes('kids')||fam.includes('infant')?
            (fam.includes('infant')?1:1):0, infant:fam.includes('infant')},
      misc:{welfare:ms.includes('welfare'), disabled:ms.includes('disabled'), single:fam.includes('single')},
      credit:{score:ms.includes('arrears')?540:790, drop:ms.includes('arrears')?-80:0,
              arrears:ms.includes('arrears')?95:0, multi:ms.includes('arrears'), dsr:ms.includes('arrears')?85:25},
      event:{death:ms.includes('death'), deathDays:38},
      refund:{tax:24, local:3, medical:ms.includes('welfare')?18:0, dormant:7, pension:0}};
    if(w==='worker') o.work={on:true, sme:true, smeType:true, insured:900, hired:'2023-01-02'};
    if(w==='free') o.work={freelance:true};
    if(w==='corp') o.biz={on:true, kind:'corp', label:'법인', ksic:'62010 소프트웨어 개발', years:2, rev:8000, emp:1, opened:'2024-01-01'};
    if(w==='solo') o.biz={on:true, kind:'solo', label:'개인 점포', ksic:'56211 일반음식점', years:3, rev:18000, emp:1, opened:'2023-01-01'};
    if(w==='online') o.biz={on:true, kind:'online', label:'온라인 스토어', ksic:'47912 전자상거래', years:2, rev:4000, opened:'2024-01-01', tongsin:true};
    MINE=mk(o); PID='me'; S.ob=1; drawOb(); runConnect(); }; }

/* ═══════════ 셸 ═══════════ */
function ident(){ const c=me();
  $('entity-name').textContent=c.name; $('entity-sub').textContent=c.sub;
  $('av').textContent=c.name.charAt(0);
  $('bell-cnt').textContent=((PID==='me'?[]:NOTI[PID])||[]).length; }
function drawNav(){ nav.innerHTML=VIEWS.map(([k,l])=>
    `<button class="nav-i" data-v="${k}" aria-current="${S.view===k}"><span>${l}</span></button>`).join('');
  nav.querySelectorAll('.nav-i').forEach(b=>b.onclick=()=>{ S.view=b.dataset.v; drawNav(); draw(); }); }
$('who').onclick=()=>{ S.ob=0; stage('onboard'); };
$('bell').onclick=()=>{ const N=(PID==='me'?[]:NOTI[PID])||[];
  $('sheet-b').innerHTML=N.length?`<div class="ledger">${N.map(x=>`<div class="lrow">
    <div><div class="t">${x[0]}</div><div class="d">${x[1]}</div></div>
    <div class="r"><span class="tag t-${x[3]}">${x[2]}</span></div></div>`).join('')}</div>
    <p style="font-size:12.5px;color:var(--ink-2);margin-top:10px">
      상태가 바뀌거나 자격이 사라지기 전에 먼저 알려드립니다.</p>`
    :'<div class="card pad"><p style="font-size:13.5px;color:var(--ink-2)">알림이 없습니다</p></div>';
  $('sheet').classList.remove('hide'); };
$('sheet-x').onclick=()=>$('sheet').classList.add('hide');
$('sheet').onclick=e=>{ if(e.target.id==='sheet') $('sheet').classList.add('hide'); };

/* ═══════════ 점검 — 시각 요약 + 분야 상세 ═══════════ */
/* 금액 집계 · 성격이 다른 돈을 섞지 않습니다
   y 연 환산 반복 / once 한 번 / cap 대출 한도 / max 선정 시 최대
   금액이 정해지지 않은 항목은 none 으로 세고 합계에서 뺍니다 */
function tally(list){ const t={y:0,once:0,cap:0,max:0,none:0,n:{y:0,once:0,cap:0,max:0}};
  (list||[]).forEach(x=>{ const m=x.mv;
    if(!m){ t.none++; return; }
    for(const k in m){ if(k in t.n){ t[k]+=m[k]; t.n[k]++; } } });
  return t; }
const won=v=>v>=10000?(Math.round(v/1000)/10)+'억':Math.round(v).toLocaleString()+'만';

function viewCheck(){
  const c=ctx(), J=judgeAll(), all=J.flatMap(s=>s.res);
  const ok=all.filter(x=>x.s==='ok'), chk=all.filter(x=>x.s==='chk'),
        no=all.filter(x=>x.s==='no'), lost=all.filter(x=>x.s==='lost');
  const lostT=tally(lost), lostSum=lostT.y+lostT.once+lostT.max;
  const Q=planq(), left=Q.filter(q=>!(q.k in S.ans));
  const seg=[[ok.length,'var(--go)','받을 수 있는 것'],[chk.length,'var(--warn)','확인 필요'],
             [lost.length,'var(--stop)','놓침'],[no.length,'#D3D9DC','자격 미달']];
  const tot=all.length; let acc=0;
  const donut=seg.map(([v,col])=>{const r=52,C=2*Math.PI*r,len=C*v/tot,off=C*acc/tot;acc+=v;
    return `<circle cx="66" cy="66" r="${r}" fill="none" stroke="${col}" stroke-width="21"
      stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 66 66)"/>`;}).join('');
  const maxOk=Math.max(...J.map(s=>s.res.filter(x=>x.s==='ok').length),1);
  const shade=n=>n===0?'background:var(--paper);color:var(--ink-3)'
    :`background:rgba(15,110,92,${0.10+0.7*(n/maxOk)});color:${n/maxOk>0.5?'#fff':'var(--go)'};border-color:transparent`;

  const dl=[];
  if(c.event.death) dl.push(['상속포기 · 한정승인','사망 후 3개월',Math.max(0,90-c.event.deathDays)+'일','hot']);
  if(c.event.death) dl.push(['상속세 신고','사망한 달 말일부터 6개월',Math.max(0,180-c.event.deathDays)+'일','warn']);
  if(c.work.on&&!c.work.taxRelief) dl.push(['소득세 감면 제도 일몰','2026년 12월','3개월','hot']);
  if(c.credit.arrears>0&&c.credit.arrears<90) dl.push(['채무조정 구간','연체 90일 전',(90-c.credit.arrears)+'일','hot']);
  if(!c.biz.on&&(c.biz.plan||c.work.freelance)) dl.push(['예비창업패키지','사업자등록 전','등록 전','hot']);
  if(c.biz.on&&c.biz.kind==='corp'&&c.biz.years<3) dl.push(['초기창업 구간','업력 3년까지',(3-c.biz.years)+'년','warn']);
  if(c.age<=34) dl.push(['청년 대상 사업','만 35세까지',(35-c.age)+'년','']);
  else if(c.age<=39) dl.push(['청년 대상 사업','만 40세까지',(40-c.age)+'년','warn']);
  if(c.admin.moving) dl.push(['전입신고 · 확정일자','이사 후 14일','14일','warn']);
  if(c.admin.passport&&c.admin.passport<6) dl.push(['여권 갱신','잔여 6개월 미만',c.admin.passport+'개월','warn']);
  if(c.admin.license&&c.admin.licenseDue<6) dl.push(['운전면허 갱신','기한 경과 시 과태료',c.admin.licenseDue+'개월','warn']);
  if(c.home.car&&c.admin.carCheck<3) dl.push(['자동차 정기검사','기한 경과 시 과태료',c.admin.carCheck+'개월','warn']);

  const sig=c.credit.arrears>0||c.credit.drop<-40||c.credit.dsr>70||c.credit.multi;

  const TY={cash:'현금으로 받는 것',save:'감면으로 아끼는 것',loan:'빌릴 수 있는 한도',
            compete:'선발되어야 받는 것',admin:'해두면 좋은 것'};
  const byType={}; J.forEach(sc=>sc.res.filter(x=>x.s==='ok').forEach(x=>{(byType[x.type]=byType[x.type]||[]).push({...x, sec:sc.n})}));
  const cT=tally(byType.cash);

  const facts=[`만 ${c.age}세`, c.region.split(' ')[0],
    c.work.on?'재직 중':c.work.freelance?'프리랜서':c.work.insured>0?'구직 중':null,
    c.biz.on?c.biz.label:null,
    c.fam.married?'기혼':null, c.fam.kids?`자녀 ${c.fam.kids}명`:null,
    c.misc.single?'한부모':null, c.misc.welfare?'수급 가구':null,
    c.home.own?'자가':'무주택', `중위소득 ${c.home.incomeRate}%`].filter(Boolean);

  const rn=roles().map(r=>ROLE[r].n);
  const cross=(PID==='me'?[]:CROSS[PID])||[];
  const found=[];
  if(c.refund.tax) found.push(['국세 미환급금', c.refund.tax+'만']);
  if(c.refund.local) found.push(['지방세 미환급금', c.refund.local+'만']);
  if(c.refund.medical) found.push(['본인부담상한제 환급금', c.refund.medical+'만']);
  if(c.refund.dormant) found.push(['휴면예금 · 미청구 보험금', c.refund.dormant+'만']);
  if(c.refund.pension) found.push(['미청구 연금', c.refund.pension+'만']);

  return `
  <div class="card pad" style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:7px">
      <span style="font-size:12px;color:var(--ink-2)">이 조건으로 판정했습니다</span>
      <span style="font-size:12.5px;color:var(--ink-2)">확인된 역할 · <b style="color:var(--ink)">${rn.join(' + ')}</b></span>
    </div>
    <div style="display:flex;gap:5px;flex-wrap:wrap">
      ${facts.map(f=>`<span class="tag t-mute" style="font-size:12.5px;padding:3px 10px">${f}</span>`).join('')}
    </div>
  </div>

  ${found.length?`<div class="notice n-go" style="margin-bottom:12px">
    <h3>조회 중 미수령 금액 ${found.length}건을 찾았습니다</h3>
    <p>${found.map(f=>`${f[0]} <b>${f[1]}</b>`).join(' · ')}</p></div>`:''}

  ${cross.length?`<div class="notice n-warn" style="margin-bottom:12px">
    <h3>역할이 겹쳐 생기는 문제 ${cross.length}건</h3>
    ${cross.map(x=>`<p style="margin-top:5px"><b>${x[0]}</b><br>${x[1]}</p>`).join('')}</div>`:''}

  <div class="viz">
    <h3>성격이 다른 것을 나누어 보여드립니다</h3>
    ${(()=>{const A={v:cT.y,n:cT.n.y,l:'해마다 반복해서 받는 것',t:' · <b>연 환산</b>'},
             B={v:cT.once,n:cT.n.once,l:'한 번만 받는 것',t:''};
      const big=A.v>=B.v?A:B, small=big===A?B:A;
      return `<div style="display:flex;align-items:flex-end;gap:18px;flex-wrap:wrap;margin-bottom:8px">
      <div><div class="hero-num num" style="color:${big.v?'var(--go)':'var(--ink-3)'}">${big.v?won(big.v):'—'}</div>
        <div style="font-size:13px;color:var(--ink-2)">${big.v?`${big.l} ${big.n}건${big.t}`
          :'현금으로 바로 받는 항목은 없습니다 · 아래 유형을 확인하세요'}</div></div>
      ${small.v?`<div style="padding-left:16px;border-left:1px solid var(--rule)">
        <div class="num" style="font-size:24px;font-weight:600">${won(small.v)}</div>
        <div style="font-size:12.5px;color:var(--ink-2)">${small.l} ${small.n}건</div></div>`:''}`;})()}
      ${lostSum?`<div style="padding-left:16px;border-left:1px solid var(--rule)">
        <div class="num" style="font-size:24px;font-weight:600;color:var(--stop)">−${won(lostSum)}</div>
        <div style="font-size:12.5px;color:var(--stop)">이미 놓친 ${lost.length}건</div></div>`:''}
    </div>
    <p style="font-size:12px;color:var(--ink-3);line-height:1.55;margin-bottom:12px">
      월 단위 급여는 12개월로 환산했고 한 번만 받는 돈은 따로 뒀습니다.
      '최대' 로 고시된 제도는 그 상한을 썼습니다.${cT.none?` 금액이 정해지지 않은 ${cT.none}건은 합계에서 뺐습니다.`:''}
      대출 한도와 선정돼야 받는 사업비는 받는 돈이 아니므로 아래에 분리했습니다.</p>
    <div class="ledger">
      ${['save','loan','compete','admin'].filter(t=>byType[t]&&byType[t].length).map(t=>{
        const T=tally(byType[t]);
        const v={save:T.y, loan:T.cap, compete:T.max, admin:0}[t];
        const unit={save:'연 절감', loan:'한도 합', compete:'선정 시 최대', admin:''}[t];
        const note={save:'세금과 공과금에서 줄어듭니다', loan:'받는 돈이 아니라 빌리는 돈입니다',
                    compete:'경쟁을 거쳐 선정돼야 받습니다', admin:'해두면 다른 자격이 열립니다'}[t];
        return `<button class="lrow typebtn" data-t="${t}" style="width:100%;text-align:left">
          <div><div class="t">${TY[t]}</div><div class="d">${note}</div></div>
          <div class="r"><b>${v?won(v):byType[t].length+'건'}</b>
            <div style="font-size:11.5px;margin-top:2px">${v?unit+' · '+byType[t].length+'건 · 보기':'보기'} ›</div></div></button>`;}).join('')}
    </div>
  </div>

  ${S.type==='loan'?(()=>{
    const CAT={biz:'사업 자금', credit:'신용 대출', jeonse:'전세 자금'};
    const pol=(byType.loan||[]).map(x=>({...x, pl:POLICY_LOAN[x.n]||null}));
    const cmp={};
    pol.forEach(p=>{ if(!p.pl||!p.pl.rate||!p.mv||!p.mv.cap) return;
      const rival=PRIV.filter(v=>v.cat===p.pl.cat&&v.need(c)).sort((a,b)=>a.rate-b.rate)[0];
      if(!rival) return;
      const amt=Math.min(p.mv.cap, rival.max);
      cmp[p.n]={rival, amt, gap:Math.round(amt*(rival.rate-p.pl.rate)/100*5)}; });
    const best=Object.entries(cmp).sort((a,b)=>b[1].gap-a[1].gap)[0];
    const priv=PRIV.filter(x=>x.need(c)).sort((a,b)=>a.rate-b.rate);
    return `
    <div class="notice n-go" style="margin-bottom:10px">
      <h3>정책자금을 먼저 확인하세요</h3>
      <p>${best?`같은 용도로 빌려도 금리가 다릅니다.
        <b>${best[0]}</b>(연 ${POLICY_LOAN[best[0]].rate}%)와
        <b>${best[1].rival.n}</b>(연 ${best[1].rival.rate}%)를 겹치는 한도
        ${won(best[1].amt)} 기준으로 비교하면 5년 이자 차이가
        <b>약 ${best[1].gap.toLocaleString()}만 원</b>입니다.`
       :`받으실 수 있는 정책 대출을 아래에 정리했습니다. 같은 용도의 민간 상품이 조회되지 않아 금리 비교는 생략했습니다.`}
        저희는 어느 쪽으로 연결해도 수수료를 받지 않습니다.</p></div>
    <div class="ledger" style="margin-bottom:10px">
      ${pol.map(x=>{const k=cmp[x.n];
        return `<div class="lrow rrow r-ok">
        <div><div class="t">${x.n}${x.pl?` <span class="tag t-mute">${CAT[x.pl.cat]||''}</span>`:''}</div>
          <div class="d">${x.why||''} · <span style="color:var(--ink-3)">${x.where||''}</span>
            ${k?`<br>민간 최저 ${k.rival.n} 대비 · 한도 ${won(k.amt)} 기준 5년 <b style="color:var(--go)">${k.gap.toLocaleString()}만 절약</b>`:''}</div></div>
        <div class="r"><b>${x.amt}</b>
          <div style="font-size:12px;margin-top:2px;color:var(--go)">${x.pl&&x.pl.rate?`연 ${x.pl.rate}%`:'금리 없음'}</div></div></div>`;}).join('')}
    </div>
    ${priv.length?`
    <div style="font-size:12.5px;color:var(--ink-2);margin:0 0 6px 2px">참고 · 민간 대출 · 같은 용도끼리만 비교했습니다</div>
    <div class="ledger" style="margin-bottom:8px">
      ${priv.map(x=>`<div class="lrow">
        <div><div class="t" style="color:var(--ink-2)">${x.n} <span class="tag t-mute">${CAT[x.cat]||''}</span></div>
          <div class="d">${x.where}</div></div>
        <div class="r"><b style="color:var(--ink-2)">최대 ${won(x.max)}</b>
          <div style="font-size:12px;margin-top:2px;color:var(--warn)">연 ${x.rate}%</div></div></div>`).join('')}
      <div class="lrow" style="justify-content:center">
        <button class="btn btn-sm" id="type-close" style="margin:0 auto">닫기</button></div>
    </div>
    <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:14px">
      민간 대출은 비교를 위해 함께 보여드립니다. 각 금융사에서 직접 신청하시면 되고,
      저희를 거치셔도 수수료가 붙지 않습니다.</p>`:''}`;})()
  :S.type?(()=>{const list=byType[S.type]||[];
    return `<div class="notice n-go" style="margin-bottom:12px">
      <h3>${TY[S.type]} ${list.length}건</h3></div>
    <div class="ledger" style="margin-bottom:14px">
      ${list.map(x=>`<div class="lrow rrow r-ok">
        <div><div class="t">${x.n}</div>
          <div class="d">${x.why||''}${x.where?` · <span style="color:var(--ink-3)">${x.where}</span>`:''}</div>
          ${srcLine(x)}</div>
        <div class="r">${x.amt?`<b>${x.amt}</b>`:''}
          <div style="font-size:11.5px;margin-top:2px">${x.sec}</div></div></div>`).join('')}
      <div class="lrow" style="justify-content:center">
        <button class="btn btn-sm" id="type-close" style="margin:0 auto">닫기</button></div>
    </div>`;})():''}

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(258px,1fr));gap:12px;margin-bottom:12px">
    <div class="viz" style="margin:0"><h3>${SECTOR_COUNT}개 분야 · 제도 ${tot}건 전부 대조</h3>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label="판정 결과 비율">${donut}
          <text x="66" y="63" text-anchor="middle" style="font-size:25px;font-weight:600;fill:var(--ink)">${ok.length}</text>
          <text x="66" y="80" text-anchor="middle" style="font-size:11px;fill:var(--ink-2)">가능</text></svg>
        <div>${seg.map(([v,col,lab])=>`<div style="display:flex;align-items:center;gap:7px;padding:3px 0">
          <span style="width:10px;height:10px;border-radius:2px;background:${col};display:inline-block"></span>
          <span style="font-size:13px">${lab}</span>
          <span class="num" style="font-size:13px;color:var(--ink-2);margin-left:auto">${v}</span></div>`).join('')}</div>
      </div></div>
    <div class="viz" style="margin:0"><h3>사라지기 전에 해야 할 것</h3>
      ${dl.length?`<div class="tline">${dl.map(d=>`<div class="tl-i ${d[3]}">
        <div><div style="font-size:14px">${d[0]}</div><div style="font-size:12px;color:var(--ink-2)">${d[1]}</div></div>
        <span class="num" style="font-size:14px;font-weight:600;color:${d[3]==='hot'?'var(--stop)':d[3]==='warn'?'var(--warn)':'var(--ink-2)'}">${d[2]}</span>
      </div>`).join('')}</div>`:'<p style="font-size:13px;color:var(--ink-2)">곧 사라지는 자격이 없습니다</p>'}
    </div>
  </div>

  ${lost.length?`<div class="notice n-stop" style="margin-bottom:12px">
    <h3>이미 놓친 것 ${lost.length}건</h3>
    ${lost.map(x=>`<p>${x.n} · ${x.amt} — ${x.why}</p>`).join('')}</div>`:''}

  ${sig?`<div class="notice n-warn" style="margin-bottom:12px">
    <h3>상환에 관한 제도를 함께 확인했습니다</h3>
    <p>신용정보에서 ${[c.credit.arrears>0?`연체 ${c.credit.arrears}일`:null,
      c.credit.drop<-40?`신용점수 ${Math.abs(c.credit.drop)}점 하락`:null,
      c.credit.dsr>70?`상환 부담 ${c.credit.dsr}%`:null, c.credit.multi?'다중 채무':null].filter(Boolean).join(' · ')}이
      확인되어 함께 살펴봤습니다. <b>신용회복위원회 상담과 신청은 비용이 들지 않고</b>, 중위소득 125% 이하이면
      법률구조공단에서 회생 신청서 작성까지 지원받으실 수 있습니다.
      법무법인에 맡기면 수임료 200~300만 원이 드는 절차입니다.<br>
      이 판단은 저장된 신용정보만으로 계산했으며 외부에 알리지 않습니다.</p></div>`:''}

  ${left.length?`<div class="notice n-warn" style="margin-bottom:12px">
    <h3>${left.length}가지만 더 알려주시면 판정이 정확해집니다</h3>
    <p>연동으로는 알 수 없는 <b>계획과 의도</b>입니다. 답하지 않으셔도 위 결과는 그대로 유효합니다.</p>
    <div style="margin-top:9px">
      <p style="font-size:15px;font-weight:600;margin-bottom:2px">${left[0].q}</p>
      <p style="font-size:12.5px;color:var(--warn);margin-bottom:8px">${left[0].s}</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${left[0].a.map(([v,l])=>`<button class="btn btn-sm qopt" data-k="${left[0].k}" data-v="${v}">${l}</button>`).join('')}
      </div></div></div>`
  :`<div class="notice n-go" style="margin-bottom:12px">
    <h3>추가로 여쭤볼 것이 없습니다</h3>
    <p>계획까지 모두 반영했습니다.
      <button class="btn btn-sm" id="re-q" style="margin-left:4px">다시 답하기</button></p></div>`}

  <div class="viz"><h3>분야별 가능 건수 · 색이 진할수록 많습니다</h3>
    <div class="grid13">${J.map(sec=>{const n=sec.res.filter(x=>x.s==='ok').length;
      return `<button class="cellx jump" data-k="${sec.k}" style="${shade(n)};text-align:left;width:100%">
        <div class="cn">${sec.n}</div><div class="cv num">${n}</div></button>`;}).join('')}</div>
    <p style="font-size:12.5px;color:var(--ink-2);margin-top:10px">
      0으로 표시된 분야도 검토는 끝났습니다. 눌러서 안 되는 이유를 보실 수 있습니다.</p></div>

  <h2 class="sec">분야별 상세 · 눌러서 펼치기</h2>
  ${(()=>{const pct=Math.round(CHECK_COUNT/RULE_COUNT*100);return `
  <div class="card pad" style="margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap">
      <div><div style="font-size:14px">제도 ${RULE_COUNT}건 중 <b>${CHECK_COUNT}건</b>은 기관 자료로 금액과 요건을 확인했습니다</div>
        <div style="font-size:12.5px;color:var(--ink-2)">최근 확인 ${CHECK_LATEST} · 나머지 ${RULE_COUNT-CHECK_COUNT}건은 각 항목에 <span style="color:var(--warn)">출처 미확인</span>으로 표시했습니다</div></div>
      <div class="num" style="font-size:22px;font-weight:600">${pct}%</div></div>
    <div class="rmbar" style="margin-bottom:0"><span style="width:${pct}%"></span></div>
  </div>`;})()}
  ${J.map(sec=>{
    const o=sec.res.filter(x=>x.s==='ok').length, k=sec.res.filter(x=>x.s==='chk').length;
    return `<details class="acc" id="sec-${sec.k}" ${S.sec[sec.k]?'open':''} data-k="${sec.k}">
      <summary><div><div class="ttl">${sec.n}</div>
        <div class="meta">${sec.res.length}건 검토 · ${o?`가능 ${o}건`:'가능 없음'}${k?` · 확인 필요 ${k}건`:''}</div></div>
        <div class="rt">${o?`<span class="tag t-go">${o}</span>`:`<span class="tag t-mute">0</span>`}
          <span class="chev">›</span></div></summary>
      ${(()=>{const ord={ok:0,chk:1,lost:2,no:3};
        return [...sec.res].sort((x,y)=>ord[x.s]-ord[y.s]).map(r=>{
        const tg={ok:['t-go','가능'],chk:['t-warn','확인 필요'],no:['t-mute','불가'],lost:['t-stop','놓침']}[r.s];
        return `<div class="lrow rrow r-${r.s}">
          <div><div class="t">${r.n}</div>
            <div class="d">${r.why||''}${r.s==='ok'&&r.where?` · <span style="color:var(--ink-3)">${r.where}</span>`:''}</div>
            ${r.s==='no'?'':srcLine(r)}</div>
          <div class="r">${r.amt?`<b>${r.amt}</b>`:''}
            <div style="margin-top:3px"><span class="tag ${tg[0]}">${tg[1]}</span></div></div></div>`;}).join('');})()}
    </details>`;}).join('')}`;
}

/* ═══════════ 할 일 — 사건 · 로드맵 · 방문 묶음 ═══════════ */
function viewTodo(){
  const c=ctx(), J=judgeAll(), ok=J.flatMap(s=>s.res.filter(x=>x.s==='ok'));
  const byVisit={};
  ok.forEach(x=>{ const v=x.visit||'online'; (byVisit[v]=byVisit[v]||[]).push(x); });
  const evs=roles().filter(r=>EVENTS[r]).map(r=>EVENTS[r](c));
  /* ROLE 선언 순서가 아니라 RUN_ORDER 로 고르고, 판정이 '불가'인 제도는 건너뜁니다 */
  const flat=J.flatMap(s=>s.res);
  const runRole=RUN_ORDER.find(r=>{
    if(!roles().includes(r)||!RUN[r]) return false;
    const R=RUN[r];
    if(R.guard&&!R.guard(c)) return false;
    if(R.key){ const j=flat.find(x=>x.n===R.key); if(j&&j.s==='no') return false; }
    return true; });
  const roads=roles().filter(r=>ROAD[r]).map(r=>ROAD[r](c));
  const icon=s=>s==='done'?'✓':s==='now'?'!':s==='lost'?'×':'';
  const cl=s=>s==='done'?'done':s==='now'?'now':s==='lost'?'lost':s==='cond'?'lock':'todo';

  return `
  ${evs.map(e=>`
    <div class="notice ${e.urgent?'n-stop':'n-warn'}" style="margin-bottom:10px">
      <h3>${e.label}</h3><p>${e.sub}</p></div>
    <div class="ledger" style="margin-bottom:18px">
      ${e.items.map(x=>`<div class="lrow">
        <div style="display:flex;gap:10px;align-items:center">
          <span class="ck ${cl(x[1])}">${icon(x[1])}</span>
          <span><div class="t" style="${x[1]==='lost'?'color:var(--ink-2);text-decoration:line-through':''}">${x[0]}</div>
            <div class="d">${x[2]}</div></span></div>
        <div class="r"><b style="color:${x[1]==='lost'?'var(--stop)':x[1]==='now'?'var(--ink)':'var(--ink-2)'}">${x[3]}</b></div>
      </div>`).join('')}
    </div>`).join('')}

  ${roads.length?roads.map(R=>{
    const all=R.stages.flatMap(x=>x.items);
    const done=all.filter(x=>x[1]==='done').length, lost=all.filter(x=>x[1]==='lost').length;
    const now=all.filter(x=>x[1]==='now').length, free=all.filter(x=>x[1]==='free').length;
    const pct=Math.round(done/all.length*100);
    return `
    <div class="rmhead"><div><p style="font-size:18px;font-weight:600;letter-spacing:-0.02em">${R.label}</p>
      <p style="font-size:13px;color:var(--ink-2)">지금 할 수 있는 일 ${now+free}건 ·
        조건이 갖춰져야 하는 일 ${all.filter(x=>x[1]==='cond').length}건</p></div>
      <div style="text-align:right"><div class="num" style="font-size:26px;font-weight:600">${pct}%</div>
        <div style="font-size:12px;color:var(--ink-2)" class="num">${all.length}개 중 ${done}개</div></div></div>
    <div class="rmbar"><span style="width:${pct}%"></span></div>
    <div style="display:flex;gap:14px;font-size:12.5px;color:var(--ink-2);margin-bottom:12px" class="num">
      <span>완료 ${done}</span><span style="color:var(--ink)">지금 ${now}</span>
      <span style="color:var(--go)">상시 ${free}</span>${lost?`<span style="color:var(--stop)">놓침 ${lost}</span>`:''}</div>
    ${R.stages.map((st,i)=>{
      const dn=st.items.every(x=>x[1]==='done'||x[1]==='lost'), cur=i===R.cur;
      const cnt=st.items.filter(x=>x[1]==='done').length;
      return `<div class="stg ${dn?'done':''} ${cur?'cur':''}">
        <span class="node">${dn?'✓':i+1}</span>
        <div class="sh"><div><span class="sn">${st.n}</span>
          <span class="sd" style="margin-left:7px">${st.d}</span></div>
          <span class="cnt num">${cnt} / ${st.items.length}</span></div>
        <div class="items">${st.items.map(x=>`<div class="it ${x[1]==='cond'?'lockrow':''} ${x[1]==='lost'?'lostrow':''}">
          <span class="ck ${cl(x[1])}">${icon(x[1])}</span>
          <span class="tx"><span class="tn">${x[0]}</span>
            ${x[1]==='cond'&&x[2]?`<div class="td">${x[2]}</div>`:''}</span>
          ${x[1]==='free'?'<span class="tag t-go">상시</span>':''}
          ${x[1]==='now'?'<span class="tag t-logic">지금</span>':''}
          ${x[1]==='cond'?'<span class="tag t-mute">조건</span>':''}
          ${x[2]==='전문가'?'<button class="btn btn-sm" style="margin-left:6px">전문가 연결</button>':''}
        </div>`).join('')}</div></div>`;}).join('')}
    ${R.later&&R.later.length?`<div class="card pad" style="margin-bottom:18px">
      <p style="font-size:13px;color:var(--ink-2)">이후 단계는 해당 상황이 되면 나타납니다 · ${R.later.join(' · ')}</p></div>`:''}`;
  }).join('<div style="height:22px"></div>')
  :`<div class="card pad"><p style="font-size:13.5px;color:var(--ink-2)">
     연속적인 경로가 있는 역할이 아니라 로드맵 대신 위의 체크리스트로 안내합니다.</p></div>`}

  ${runRole?runBlock(RUN[runRole]):''}

  <h2 class="sec">한 번에 처리할 것 · 재방문을 줄입니다</h2>
  ${['center','bank','office','company','online'].filter(v=>byVisit[v]&&byVisit[v].length).map(v=>`
    <details class="acc" ${v!=='online'?'open':''}>
      <summary><div><div class="ttl">${VISIT[v].n}</div>
        <div class="meta">${VISIT[v].tip}</div></div>
        <div class="rt"><span class="tag ${v==='online'?'t-mute':'t-logic'}">${byVisit[v].length}건</span>
          <span class="chev">›</span></div></summary>
      ${byVisit[v].map(x=>`<div class="lrow">
        <div><div class="t">${x.n}</div><div class="d">${x.where||''}</div></div>
        <div class="r">${x.amt?`<b>${x.amt}</b>`:''}</div></div>`).join('')}
    </details>`).join('')}
  <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 18px">
    주민센터나 은행에 한 번 갈 때 같은 묶음의 항목을 함께 처리하시면 재방문을 줄일 수 있습니다.</p>

`;
}

function runBlock(R){
  const paid=R.paid?`
  <div class="card pad">
    <p style="font-size:14px;line-height:1.7">판정과 서류 준비, 초안 작성, 제출 안내, 사후관리는 서비스가 합니다.
      초안을 받아보신 뒤 손봐야겠다고 판단하실 때만 전문가 검수를 선택하시면 됩니다.</p>
    <div class="grid3" style="margin-top:11px">
      ${[['검수','30만','항목별 코멘트와 보완 지점','반나절'],
         ['검수와 수정','150만','본문을 직접 고쳐 돌려드립니다','1~2일'],
         ['완결과 미팅','500만','발표 준비까지 함께합니다','수일']]
        .map((x,i)=>`<div class="card pad" style="${i===0?'border-color:var(--ink);border-width:1.5px':''}">
          ${i===0?'<span class="tag t-go" style="margin-bottom:4px">가장 많이 선택</span>':''}
          <div style="font-size:13.5px">${x[0]}</div>
          <div class="num" style="font-size:22px;font-weight:600">${x[1]}</div>
          <div style="font-size:12.5px;color:var(--ink-2);line-height:1.5;margin-top:2px">${x[2]}<br>${x[3]}</div>
        </div>`).join('')}</div>
    <p style="font-size:12.5px;color:var(--ink-2);margin-top:10px">
      정액 요금이며 성공보수를 받지 않습니다. 해당 분야 심사 경험이 있는 전문가가 맡습니다.</p></div>`
  :`<div class="notice n-stop">
    <h3>이 영역에는 전문가 검수를 두지 않습니다</h3>
    <p>심사 대상이 자격 요건이라 글을 고쳐서 바뀌는 것이 없기 때문입니다.
       정책자금은 보증료 외에 어떤 비용도 들지 않습니다.
       컨설팅 명목으로 대출금의 8~12%를 요구하고 부결되어도 청구하는 사례가 보고되고 있으며,
       허위 매출증명을 만든 브로커가 형사 고소된 사례도 있습니다. 이 화면에는 광고도 넣지 않습니다.</p>
    <div style="display:flex;gap:8px;margin-top:9px;flex-wrap:wrap">
      <button class="btn btn-sm">제3자 부당개입 신고</button>
      <button class="btn btn-sm">상담 1533-0100</button></div></div>`;
  return `
  <h2 class="sec">진행 중인 건</h2>
  <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:8px">
    <div><p style="font-size:17px;font-weight:600">${R.title}</p>
      <p style="font-size:13.5px;color:var(--ink-2)">${R.amt} · ${R.lead}</p></div>
    <span class="num" style="font-size:14px;color:var(--warn)">${R.dday}</span></div>
  <div class="ledger" style="margin-bottom:12px">${R.steps.map(x=>`<div class="lrow">
    <div><div class="t">${x[0]} ${x[2]==='now'?'<span class="tag t-logic" style="margin-left:4px">지금</span>':''}</div>
      <div class="d">${x[1]}</div></div>
    <div class="r"><span class="tag t-mute">${x[2]==='done'?'완료':x[2]==='now'?'진행':'대기'}</span></div></div>`).join('')}</div>
  ${paid}`;
}

/* ═══════════ 내 정보 — 사실 + 연결 + 변화 ═══════════ */
function viewMe(){
  const c=me(), F=[];
  F.push(['기본',[['나이',c.age+'세'],['거주지',c.region]]]);
  if(c.work.on||c.work.insured>0||c.work.freelance) F.push(['근로',[
    ['재직 상태', c.work.on?`중소기업${c.work.smeType?' · 감면 대상 업종':''}`:c.work.freelance?'프리랜서':'자격 상실'],
    ...(c.work.hired?[['취업일',c.work.hired]]:[]),
    ...(c.work.insured?[['피보험 단위기간',c.work.insured+'일']]:[]),
    ['소득세 감면', c.work.taxRelief?'적용 중':'미신청']]]);
  if(c.biz.on) F.push(['사업',[['형태',c.biz.label],['업종',c.biz.ksic],['개업일',c.biz.opened],
    ['직전 매출',c.biz.rev.toLocaleString()+'만'],['상시근로자',c.biz.emp+'명'],
    ['노란우산',c.biz.noran?'가입':'미가입'],...(c.biz.ip?[['지식재산권',c.biz.ip]]:[])]]);
  F.push(['주거',[['주택 소유',c.home.own?'자가':'무주택'],
    ['임차', c.home.rent?`보증금 ${c.home.deposit.toLocaleString()}만${c.home.monthly?` · 월세 ${c.home.monthly}만`:''}`:'해당 없음'],
    ['소득 구간','중위소득 '+c.home.incomeRate+'%'],
    ['자동차 가액', c.home.car?c.home.car.toLocaleString()+'만':'없음']]]);
  F.push(['가구',[['혼인',c.fam.married?'기혼':'미혼'],
    ['자녀',c.fam.kids+'명'+(c.fam.infant?' · 만 2세 이하 포함':'')],
    ...(c.misc.single?[['한부모','해당']]:[]), ...(c.misc.welfare?[['기초생활수급','해당']]:[])]]);
  F.push(['신용',[['신용점수',c.credit.score+'점'+(c.credit.drop<-30?` · 최근 ${Math.abs(c.credit.drop)}점 하락`:'')],
    ['연체',c.credit.arrears?c.credit.arrears+'일':'없음'],
    ['소득 대비 상환 부담',c.credit.dsr+'%']]]);
  const rf=[]; if(c.refund.tax)rf.push(['국세 미환급금',c.refund.tax+'만']);
  if(c.refund.local)rf.push(['지방세 미환급금',c.refund.local+'만']);
  if(c.refund.medical)rf.push(['본인부담상한제',c.refund.medical+'만']);
  if(c.refund.dormant)rf.push(['휴면예금 · 보험금',c.refund.dormant+'만']);
  if(c.refund.pension)rf.push(['미청구 연금',c.refund.pension+'만']);
  if(rf.length) F.push(['조회된 미수령액',rf]);
  if(c.event.death) F.push(['사건',[['부친 사망',`${c.event.deathDays}일 경과`]]]);
  F.push(['행정',[['모바일 주민등록증',c.admin.idLatest?'발급 가능':'실물 재발급 필요'],
    ['공동인증서',c.admin.cert?'보유':'미발급'],
    ['여권', c.admin.passport?`만료까지 ${c.admin.passport}개월`:'미보유'],
    ...(c.admin.license?[['운전면허',`갱신까지 ${c.admin.licenseDue}개월`]]:[]),
    ...(c.home.car?[['자동차 검사',`기한까지 ${c.admin.carCheck}개월`]]:[])]]);

  const total=F.flatMap(x=>x[1]).length;
  return `
  <div class="notice n-go">
    <h3>한 번 연결하면 계속 갱신됩니다</h3>
    <p>${total}개 항목을 <b>연결 가능한 모든 곳에서 조회</b>했습니다.
       상태가 바뀌면 그에 따라 열리거나 닫히는 자격을 알려드립니다.
       내려받은 파일은 내려받은 순간에서 멈추지만, 여기 기록은 오늘 상태입니다.</p></div>

  ${F.map(([g,items])=>`<h2 class="sec">${g}</h2><div class="ledger">
    ${items.map(x=>`<div class="lrow">
      <div><div class="t">${x[0]} · <span style="color:var(--ink-2)">${x[1]}</span></div></div>
      <div class="r"><span class="tag t-go">자동</span></div></div>`).join('')}</div>`).join('')}

  <h2 class="sec">내려받기</h2>
  <div class="card pad">
    <p style="font-size:14px;line-height:1.7">저장된 정보를 파일로 내려받아 다른 곳에서 쓰실 수 있습니다.</p>
    <button class="btn btn-sm" style="margin-top:9px">전체 내려받기</button></div>

  <h2 class="sec">연결된 곳</h2>
  <div class="ledger">${SRC_ALL.map(x=>`<div class="lrow">
    <div><div class="t">${x[0]}</div><div class="d">${x[1]}</div></div>
    <div class="r"><span class="tag t-go">연결됨</span>
      <div style="font-size:11.5px;margin-top:3px">갱신 ${x[2]}</div></div></div>`).join('')}</div>
  <p style="font-size:12.5px;color:var(--ink-2);margin-top:8px">
    처음 한 번만 인증하면 나머지는 배경에서 갱신됩니다. 항목별로 연결을 끊거나 다시 이을 수 있습니다.</p>`;
}

/* ═══════════ 물어보기 ═══════════ */
function viewAsk(){
  const A=roles().flatMap(r=>ASK[r]||[]).slice(0,4);
  return `
  <div class="notice n-go" style="margin-bottom:13px">
    <h3>내 정보를 다시 설명하지 않아도 됩니다</h3>
    <p>연결된 정보를 근거로 답합니다. 계산으로 답할 수 있는 것은 규칙으로 즉시 처리하고, 글과 전략만 AI가 맡습니다.</p></div>
  <div class="qa"><input id="ask-in" placeholder="예 · 지금 내가 받을 수 있는 게 뭐야?" aria-label="질문 입력">
    <button class="btn btn-fill" id="ask-go">묻기</button></div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
    ${A.map((x,i)=>`<button class="btn btn-sm ask-sample" data-i="${i}">${x.q}</button>`).join('')}</div>
  <div id="thread">${S.asked.length?S.asked.map(i=>{const x=A[i]; if(!x)return ''; return `
    <div class="msg" style="background:#F7F9FA"><div class="w">질문</div><p>${x.q}</p></div>
    <div class="msg"><div class="w"><span>답변</span>
      <span class="tag ${x.mode==='logic'?'t-logic':'t-mute'}">${x.mode==='logic'?'규칙으로 계산':'AI가 작성'}</span></div>
      <p>${x.a}</p><div class="cite">근거 · ${x.cite}</div></div>`;}).join('')
  :`<div class="card pad"><p style="font-size:13.5px;color:var(--ink-2)">위의 예시를 눌러보시면 어떻게 답하는지 확인할 수 있습니다.</p></div>`}</div>`;
}

/* ═══════════ 렌더 ═══════════ */
function draw(){
  main.innerHTML = S.view==='check'?viewCheck() : S.view==='todo'?viewTodo()
    : S.view==='me'?viewMe() : viewAsk();
  bind(); }
function bind(){
  main.querySelectorAll('.qopt').forEach(b=>b.onclick=()=>{ S.ans[b.dataset.k]=b.dataset.v; draw(); });
  const r=$('re-q'); if(r) r.onclick=()=>{ S.ans={}; draw(); };
  main.querySelectorAll('.acc').forEach(d=>d.addEventListener('toggle',()=>{ S.sec[d.dataset.k]=d.open; }));
  main.querySelectorAll('.typebtn').forEach(b=>b.onclick=()=>{
    S.type = S.type===b.dataset.t ? null : b.dataset.t; draw(); });
  const tc=$('type-close'); if(tc) tc.onclick=()=>{ S.type=null; draw(); };
  main.querySelectorAll('.jump').forEach(b=>b.onclick=()=>{
    const k=b.dataset.k; S.sec[k]=true; draw();
    setTimeout(()=>$('sec-'+k)?.scrollIntoView({behavior:'smooth',block:'center'}),40); });
  main.querySelectorAll('.ask-sample').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i; if(!S.asked.includes(i)) S.asked.push(i); draw(); });
  const ag=$('ask-go'); if(ag) ag.onclick=()=>{ if(!S.asked.includes(0)) S.asked.push(0); draw(); }; }

stage('landing');
