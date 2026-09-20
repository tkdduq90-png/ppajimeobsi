/* ═══════════ 상태 ═══════════ */
let PID='d';
let MINE=null;                       /* 직접 입력한 사람 */
const S={stage:'landing', view:'check', ans:{}, ob:0, open:{}, sec:{}, asked:[], ti:0, type:null, item:null, expert:false, scanStop:false, sub:null, have:{}, phone:'', backup:false, tab:'type'};
const $=id=>document.getElementById(id);

const maskMail=e=>{ if(!e) return '—'; const [a,b]=e.split('@');
  return a.slice(0,2)+'*'.repeat(Math.max(1,a.length-2))+'@'+b; };
const maskTel=t=>t?t.replace(/(\d{3})-(\d{3,4})-(\d{4})/, (m,a,b,c)=>a+'-'+'*'.repeat(b.length)+'-'+c):'—';

/* ═══════════ 저장 위치 ═══════════════════════════════════
   두 가지를 나눕니다.
     · 계정 — 이메일 · 전화번호 · 로그인. 서버에 있습니다.
       누구인지 식별하고 연락하는 데 쓰고, 이게 없으면 알림도 로그인도 안 됩니다.
     · 판정 데이터 — 소득 · 신용 · 가족 · 사업 · 주거 · 건강.
       이건 이 기기에만 둡니다. 서버는 당신이 어떤 상태인지 모릅니다.
   즉 서버는 '누구인지' 는 알고 '어떤 사람인지' 는 모릅니다.
   그래서 저장소가 localStorage 이고, 지우는 것도 사용자가 직접 합니다.
   브라우저가 막아 두었거나 시크릿 모드면 그냥 실패합니다 —
   그 경우에도 앱은 돌아가야 하므로 전부 try 로 감쌉니다.
   서버가 갖는 것은 제도 규칙과 공고뿐입니다. 그건 누구에게나 같은 내용입니다. */
const LSK='ppajimeobsi.v1';
let LSOK=true;
function lsLoad(){ try{ const raw=localStorage.getItem(LSK);
    return raw?JSON.parse(raw):null; }catch(e){ LSOK=false; return null; } }
function lsSave(){ try{ localStorage.setItem(LSK, JSON.stringify({
    pid:PID, mine:MINE, ans:S.ans, have:S.have, phone:S.phone, backup:S.backup, at:Date.now() }));
  }catch(e){ LSOK=false; } }
function lsWipe(){ try{ localStorage.removeItem(LSK); }catch(e){}
  S.ans={}; S.have={}; S.phone=''; MINE=null; }
function lsWhen(){ const d=lsLoad(); if(!d||!d.at) return null;
  const t=new Date(d.at); return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`; }
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
  if(a.startup==='yes') c.biz.plan=true;
  /* 업종 · 사업자등록 업종코드에서 분야를 뽑아 판정에 넘깁니다
     코드가 없으면 '' 이고, 업종을 보는 규칙은 그때 UNK 로 떨어집니다 */
  c.biz.field=c.biz.on?ksicField(c.biz.ksic):'';
  return c; }
function judgeAll(){ const c=ctx();
  return SECTORS.map(s=>({...s, res:s.items.map(it=>({n:it.n, type:it.type||'cash', where:it.where, visit:it.visit,
    chk:it.chk?SOURCES[it.chk]||null:null, base:it.base||null, bonus:it.bonus||null, guide:it.guide||null,
    ads:it.ads||null, ...it.f(c)}))})); }

/* ═══════════ 두 화면의 역할 분리 ═══════════════════════════
   같은 제도가 점검에도 할 일에도 나옵니다. 같은 내용을 두 번 쓰면
   어느 쪽이 최신인지 알 수 없고, 사용자는 두 번 읽습니다.
   그래서 답하는 질문을 갈랐습니다.

     점검  → "되나 안 되나, 왜 그렇게 판단했나"   = whyBlock
     할 일 → "그래서 지금 무엇을 하나"              = stepBlock

   준비물·절차는 실행이므로 할 일에만 둡니다.
   판정 근거·출처는 판단이므로 점검에만 둡니다.
   서로 필요할 때는 복사하지 않고 그 화면으로 넘깁니다. */
const DOCK={auto:['자동','저장된 정보로 제출됩니다'], self:['본인','직접 준비하셔야 합니다'],
            issue:['발급','발급받아 오셔야 합니다']};
const secOf=n=>{ const s=SECTORS.find(x=>x.items.some(i=>i.n===n)); return s?s.k:null; };

/* ── 점검에서 펼침 · 판단 근거만 ── */
function whyBlock(r,c){
  const g=r.guide;
  const list=[]; const S1=r.chk, S2=(g&&g.s)?SOURCES[g.s]:null;
  if(S1&&S1.facts&&S1.facts.length) list.push(S1);
  if(S2&&S2!==S1&&S2.facts&&S2.facts.length) list.push(S2);
  const key=encodeURIComponent(r.n);
  return `<div class="gd">
    ${g?`<p class="gw">${g.what}</p>`:''}
    <div class="gsec">
      <div class="gh">이 판정의 이유</div>
      <div class="gwhy">${r.why||'—'}</div>
      ${r.rate?`<div class="gmeta">지급 방식 · ${r.rate}</div>`:''}
      ${r.where?`<div class="gmeta">소관 · ${r.where}</div>`:''}
      ${r.s==='unk'&&r.need?`<div class="gmeta">판정하려면 <b>${r.need}</b>가 필요합니다 · 연동으로는 가져올 수 없습니다</div>`:''}
    </div>
    ${list.length?`<div class="gsec">
      <div class="gh">출처에서 읽은 내용</div>
      ${list.map(S=>`<div class="gsrc">${S.facts.map(f=>`<div class="gfact">${f}</div>`).join('')}
        <div class="gfrom">${S.t} · 확인 ${S.d} · <a href="${S.u}" target="_blank" rel="noopener">원문</a></div></div>`).join('')}
    </div>`:`<div class="gsec"><div class="gh">출처</div>
      <div class="gmeta">읽어서 저장한 문장이 아직 없습니다. 금액과 요건을 다시 확인해야 합니다.</div></div>`}
    ${compLine(r,c)}
    ${r.s==='ok'?`<div class="gnext">
      <div class="gnn">준비물과 절차는 <b>할 일</b>에 있습니다 · 여기는 판정 근거만 둡니다</div>
      <button class="btn btn-sm gotostep" data-i="${key}">준비물 보러 가기 ›</button></div>`:''}
  </div>`; }

/* ── 할 일에서 펼침 · 실행 단계만 ── */
function stepBlock(r){
  const g=r.guide, key=encodeURIComponent(r.n);
  const back=`<div class="gnext">
      <div class="gnn">왜 된다고 판정했는지는 <b>점검</b>에 있습니다</div>
      <button class="btn btn-sm gotowhy" data-i="${key}">판정 근거 보기 ›</button></div>`;
  if(!g) return `<div class="gd"><p class="gn">준비물과 절차를 아직 정리하지 않았습니다.
    신청처에서 확인하셔야 합니다${r.where?` · ${r.where}`:''}.</p>${back}</div>`;
  const auto=g.doc.filter(d=>d[1]==='auto').length, mine=g.doc.length-auto;
  const ag=agency(r);
  return `<div class="gd">
    <div class="gsec">
      <div class="gh">준비물 ${g.doc.length}건 · <b>${auto}건은 자동 제출</b>${mine?` · ${mine}건은 본인이 준비`:''}</div>
      ${g.doc.map(([n,k,w])=>`<div class="gdoc ${k}">
        <span class="gtag">${DOCK[k][0]}</span>
        <span class="gt">${n}${w?`<span class="gw2"> · ${w}</span>`:''}</span></div>`).join('')}
    </div>
    <div class="gsec">
      <div class="gh">절차</div>
      ${g.how.map((x,i)=>`<div class="gstep"><span class="gnum">${i+1}</span><span>${x}</span></div>`).join('')}
    </div>
    ${g.warn?`<div class="gwarn">${g.warn}</div>`:''}
    ${adBlock(r)}
    <div class="gfoot">${g.time?`처리 기간 ${g.time}`:''}${r.where?` · 신청처 ${r.where}`:''}</div>
    <div class="gact">
      <button class="btn btn-sm btn-fill ${ag==='auto'||ag==='one'?'subgo':ag==='self'?'prepgo':''}" data-n="${encodeURIComponent(r.n)}">${
        ag==='auto'?'지금 제출하기' : ag==='one'?'한 가지 넣고 제출하기'
        : ag==='expert'?'초안 만들기' : '준비하고 제출 맡기기'}</button>
      ${ag==='expert'?'<button class="btn btn-sm" id="expert-go3">전문가 광고 보기</button>':''}
    </div>
    ${back}
  </div>`; }

/* 전문가 광고 · 글이 심사 대상이고 국가자격이 필요한 항목에만 붙습니다.
   판정 화면에는 넣지 않고 실행 화면에만 두며, 혼자 하는 절차를 먼저 보여준 뒤에 옵니다.
   정액 노출이고 순서는 매번 섞습니다. 수임이 성사돼도 수수료를 받지 않습니다.
   (성사 연동 수수료는 알선에 해당할 소지가 있어, 실제 도입 전에 법률 검토가 필요합니다.) */
const ADS={
  patent:{t:'변리사 사무소', why:'출원서와 지정상품을 직접 쓰기 어려우실 때만 보세요',
    list:[['변리사 사무소 A','상표 출원 · 전자출원 대행'],
          ['변리사 사무소 B','상표·디자인 · 중간사건 대응'],
          ['변리사 사무소 C','우선심사 · 해외출원 연계']]}
};
function adBlock(r){ const a=ADS[r.ads]; if(!a) return '';
  const l=a.list.slice().sort(()=>Math.random()-0.5);
  return `<div class="gad">
    <div class="gadh"><span class="gadl">광고</span> ${a.t}</div>
    <div class="gadw">${a.why}</div>
    ${l.map(([n,d])=>`<div class="gadi"><b>${n}</b><span>${d}</span></div>`).join('')}
  </div>`; }

/* 경쟁 선발형 · 확률 대신 선정 규모와 공고문 가점표를 보여줍니다 */
function compLine(r,c){ if(r.type!=='compete'||r.s!=='ok') return '';
  const b=r.base, bo=r.bonus||[];
  const scale = b&&(b.sel||b.comp)
    ? [b.sel?`선정 ${b.sel}`:null, b.comp?`경쟁률 ${b.comp}`:'경쟁률 미확인'].filter(Boolean).join(' · ')
    : '선정 규모와 경쟁률 미확인';
  let got=0, tot=0, rows='';
  bo.forEach(([n,p,test])=>{ tot+=p;
    const ok = typeof test==='function' ? !!test(c) : null;
    if(ok) got+=p;
    rows += `<div class="bn ${ok?'on':ok===null?'ask':'off'}">
      <span>${ok?'✓':ok===null?'?':'·'}</span><span class="bt">${n}</span><span class="bp">+${p}</span></div>`; });
  return `<div class="comp">
    <div class="cs">${scale}${b&&b.note?` · ${b.note}`:''}</div>
    ${bo.length?`<div class="cb">가점 ${tot}점 중 확보 ${got}점${bo.every(x=>x[2]==='ask')?' · 전부 본인 확인이 필요한 항목입니다':''}</div>${rows}`
      :'<div class="cb">공고문 가점표를 아직 옮기지 않았습니다</div>'}
    <div class="cw">선정 가능성은 계산하지 않습니다. 평가의 대부분이 사업계획서 정성평가이고 배점이 공개되지 않는 사업이 많습니다.</div>
  </div>`; }

/* 출처 한 줄 · 확인한 것과 확인하지 않은 것을 구분해 보여줍니다 */
const srcLine=r=> !r.chk
  ? `<div class="src nochk">출처 미확인 · 금액과 요건을 다시 확인해야 합니다</div>`
  : r.chk.lvl==='org'
  ? `<div class="src part">소관 기관만 확인 · 금액과 요건은 아직 대조하지 않았습니다 · <a href="${r.chk.u}" target="_blank" rel="noopener">${r.chk.t}</a></div>`
  : `<div class="src">확인 ${r.chk.d} · <a href="${r.chk.u}" target="_blank" rel="noopener">${r.chk.t}</a> · 읽은 내용 ${r.chk.facts.length}줄</div>`;

/* 계획 문답 — 연동으로 알 수 없는 것만 */
const PLANQ=[
 {k:'startup', need:c=>!c.biz.on&&c.age<=60, q:'창업을 준비하고 계신가요?',
  s:'사업자등록 전에만 신청할 수 있는 지원이 있습니다', a:[['no','아닙니다'],['yes','준비 중입니다']]},
 {k:'hire', need:c=>c.biz.on, q:'올해 안에 직원을 뽑을 계획이 있나요?',
  s:'채용 전에만 신청할 수 있는 지원이 있습니다', a:[['no','없습니다'],['yes','있습니다']]},
 {k:'close', need:c=>c.biz.on, q:'사업을 정리할 계획이 있으신가요?',
  s:'폐업 신고 전에만 받을 수 있는 지원이 있습니다', a:[['no','계속 운영합니다'],['maybe','고민 중입니다'],['yes','정리하려고 합니다']]},
 {k:'leave', need:c=>c.work.on, q:'퇴사를 계획하고 계신가요?',
  s:'퇴사 전에만 할 수 있는 것이 있습니다', a:[['no','아닙니다'],['plan','준비 중입니다'],['soon','곧 퇴사합니다']]},
 /* 이미 퇴사한 사람에게 '퇴사한다면' 을 물으면 안 됩니다.
    이직 사유는 이직확인서에 있어 고용보험 연동으로 들어옵니다. */
 {k:'why', need:c=>c.work.on&&!c.work.quit, q:'퇴사한다면 사유가 어떻게 되나요?',
  s:'실업급여 수급 자격이 여기서 갈립니다', a:[['none','해당 없음'],['self','자발적 퇴사'],['end','계약 만료 또는 권고사직']]},
 {k:'plan', need:c=>c.age<=45, q:'출산 계획이 있으신가요?',
  s:'출산 전에만 신청할 수 있는 지원이 있습니다', a:[['no','없습니다'],['yes','있습니다 또는 임신 중']]},
 {k:'moving', need:c=>c.home.rent, q:'이사나 재계약 계획이 있으신가요?',
  s:'계약 전에 확인해야 하는 것이 있습니다', a:[['no','없습니다'],['yes','있습니다']]}
];
const planq=()=>{const c=me(); return PLANQ.filter(q=>q.need(c));};

/* ═══════════ 화면 사이 이동 ═══════════════════════════════
   버튼을 눌렀는데 '어딘가로 갔다' 로 끝나면 안 됩니다.
   ① 목표 항목이 있는 묶음만 열어 화면 위쪽으로 끌어올리고
   ② 그려진 다음에 스크롤하고 (한 프레임 기다립니다)
   ③ 도착한 곳을 잠깐 깜빡여 어디로 왔는지 보이게 합니다.
   sticky 헤더에 가리지 않도록 CSS 의 scroll-margin-top 이 받쳐 줍니다. */
function afterPaint(fn){ requestAnimationFrame(()=>requestAnimationFrame(fn)); }
function flash(el){ const box=el.closest('.ritem')||el.closest('.acc')||el;
  box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
  setTimeout(()=>box.classList.remove('flash'), 2400); }
function focusItem(n, tries){
  const key=encodeURIComponent(n);
  const el=main.querySelector('[data-i="'+key+'"]');
  if(!el){ if((tries||0)<12) return setTimeout(()=>focusItem(n,(tries||0)+1), 60); return; }
  try{ el.scrollIntoView({behavior:'instant', block:'start'}); }
  catch(e){ el.scrollIntoView(true); }
  flash(el); }
function jumpTo(view, n){
  S.item=n;
  if(view==='check'){ const k=secOf(n); S.sec={}; if(k) S.sec[k]=true; S.tab='sector'; }
  S.view=view; drawNav(); draw(); afterPaint(()=>focusItem(n,0)); }

/* ═══════════ 스테이지 ═══════════ */
function stage(s){ S.stage=s;
  $('landing').classList.toggle('hide', s!=='landing');
  $('onboard').classList.toggle('hide', s!=='onboard');
  $('app-shell').classList.toggle('hide', s!=='app');
  $('b2g').classList.toggle('hide', s!=='b2g');
  window.scrollTo(0,0);
  if(s==='onboard') drawOb();
  if(s==='b2g') drawB2G();
  if(s==='app'){ ident(); drawNav(); draw(); } }
document.querySelectorAll('.start').forEach(b=>b.onclick=()=>{ S.scanStop=false; S.ob=0; stage('onboard'); });
document.querySelectorAll('.b2g-open').forEach(b=>b.onclick=()=>stage('b2g'));
$('b2g-back').onclick=()=>stage('landing');

/* ═══════════ 기관용 (B2G) ═══════════════════════════════════
   여기 적는 수치는 두 종류뿐입니다.
     · 이 앱이 실제로 센 것 (RULE_COUNT · SRC_FACTS 등 코드에서 계산)
     · 출처를 읽고 SOURCES 에 저장한 것 (broker-2026 · broker-law)
   추정치는 쓰지 않습니다. 모르면 '모른다' 고 적습니다. */
function drawB2G(){
  const B=SOURCES['broker-2026'], L=SOURCES['broker-law'];
  const srcTag=k=>{const x=SOURCES[k];
    return `<div class="src">확인 ${x.d} · <a href="${x.u}" target="_blank" rel="noopener">${x.t}</a> · 읽은 내용 ${x.facts.length}줄</div>`;};
  $('b2g-body').innerHTML=`
  <div class="b2g-quote">정책은 무수히 많은데 그 정책의 정보가 없어서
    제3자 개입이 생깁니다.<br>
    앱 하나로 판정과 근거를 공개해 개입의 원인을 없앱니다.
    <span>부당개입이 파는 것은 노동이 아니라 정보 비대칭입니다. 그 정보를 공짜로 공개하면 팔 것이 없어집니다.
    정당한 대행은 남습니다 — 사라지는 것은 몰라서 맡기는 일입니다.</span></div>

  <section class="sect">
    <h2>정부도 같은 문제를 법으로 막는 중입니다</h2>
    <p class="sub">브로커 문제는 업계의 인상이 아니라 정책 과제로 다뤄지고 있습니다.
      2026년 1월 중소벤처기업부가 내놓은 '제3자 부당개입 3종 대응세트' 가 그 근거입니다.</p>
    <div class="b2g-num">
      <div><div class="v">200만원</div><div class="l">브로커 신고 포상금 · 건당 최대</div></div>
      <div><div class="v">300만원</div><div class="l">조사 미응시 · 신고자 불이익 행위 과태료 상한</div></div>
      <div><div class="v">2026 상반기</div><div class="l">정책자금 컨설팅 등록제 · 중소기업진흥법 개정안 목표</div></div>
      <div><div class="v">미확정</div><div class="l">성공보수 상한 · 대통령령으로 정할 예정</div></div>
    </div>
    <div class="card pad">
      <div style="font-size:12.5px;color:var(--ink-2);margin-bottom:6px">읽은 내용</div>
      ${B.facts.map(f=>`<div class="gfact">${f}</div>`).join('')}
      ${srcTag('broker-2026')}
      ${L.facts.map(f=>`<div class="gfact">${f}</div>`).join('')}
      ${srcTag('broker-law')}
      <p style="font-size:12.5px;color:var(--ink-2);margin-top:9px">
        시중에서 도는 '대출금의 8~12%' 같은 수수료 비율은 <b>공식 통계로 확인되지 않아 쓰지 않습니다.</b>
        확인한 것만 적습니다.</p>
    </div>
  </section>

  <section class="sect">
    <h2>제3자 개입은 왜 생기는가 — 세 가지 구조</h2>
    <div class="b2g-step">
      <div><div class="k">01 흩어짐</div><div class="t">제도가 부처별로 있습니다</div>
        <div class="d">중앙부처와 시·도, 시·군·구, 공공기관과 위탁기관을 더하면 1만여 건입니다.
          소관 기관이 전부 다르고, 어디에 무엇이 있는지 알려주는 곳이 없습니다.</div></div>
      <div><div class="k">02 판정 부재</div><div class="t">되는지 알려주는 창구가 없습니다</div>
        <div class="d">자격 요건은 나이·업력·소득·업종처럼 대부분 정량이고 공개돼 있습니다.
          그런데 그 규칙을 <b>내 상황에 적용해주는 공적 창구</b>가 없습니다.</div></div>
      <div><div class="k">03 대가 지불</div><div class="t">그래서 아는 사람에게 돈을 냅니다</div>
        <div class="d">신청자는 되는지를 모르니 '되게 해준다' 는 말에 값을 치릅니다.
          이때 값이 매겨지는 것은 실행 노동이 아니라 <b>정보 비대칭</b>입니다.</div></div>
    </div>
  </section>

  <section class="sect">
    <h2>원인을 없애는 방식</h2>
    <p class="sub">부당개입을 단속하는 것과, 신청자가 남을 찾을 이유를 없애는 것은 다른 일입니다.
      이 앱은 뒤쪽을 합니다. 판정과 근거를 무료로 공개하면, 남에게 맡기는 분도 무엇을 맡기는지 알고 맡기게 됩니다.</p>
    <div class="b2g-step">
      <div><div class="k">연동</div><div class="t">한 번 인증</div>
        <div class="d">${SRC_ALL.length}개 경로에서 판정에 필요한 사실을 가져옵니다.</div></div>
      <div><div class="k">판정</div><div class="t">1만여 건 전부 대조</div>
        <div class="d">되는 것뿐 아니라 <b>안 되는 이유</b>까지 남깁니다.
          연동으로 알 수 없는 것은 '불가' 가 아니라 '판정 불가' 로 구분합니다.</div></div>
      <div><div class="k">근거</div><div class="t">출처 ${SRC_KEYS.length}개 · ${SRC_FACTS}줄</div>
        <div class="d">각 판정 아래에 기관 자료에서 읽은 문장을 그대로 붙입니다.
          확률은 만들지 않습니다 — 선정 규모와 공고 가점표만 보여줍니다.</div></div>
      <div><div class="k">집행</div><div class="t">대행 · 가이드 · 검수</div>
        <div class="d">연동 서류만 쓰는 건은 앱이 제출하고, 본인 서류가 필요한 건은 준비물과 절차를 주고,
          글이 심사 대상인 건만 정액 검수를 고를 수 있게 합니다.</div></div>
    </div>
    <div class="notice n-go" style="margin-top:12px">
      <h3>민감정보는 서버에 두지 않습니다</h3>
      <p>서버가 갖는 개인정보는 <b>계정(이메일 · 휴대전화)뿐</b>입니다. 로그인하고 연락하는 데 씁니다.
        판정에 쓰는 <b>소득 · 신용 · 연체 · 가족 · 사업 · 주거 · 건강</b> 정보는 이용자 기기에만 남고,
        판정도 규칙을 내려받아 기기 안에서 계산합니다.<br>
        <b>즉 서버는 '누구인지' 는 알아도 '어떤 상태인지' 는 모릅니다.</b>
        유출 사고가 나도 나갈 수 있는 것은 연락처이지, 소득과 신용이 아닙니다.
        위탁 심사와 개인정보 영향평가에서 다루는 항목이 그만큼 줄어듭니다.
        알림도 서버는 '이 날짜에 깨워달라' 만 알고, 무엇이 걸렸는지는 기기가 계산합니다.</p></div>

    <div class="notice n-stop" style="margin-top:12px">
      <h3>값을 붙이지 않는 자리를 먼저 정했습니다</h3>
      <p>① <b>성공보수를 받지 않습니다.</b> 정액만 받습니다. 부결되어도 청구하지 않습니다.<br>
        ② <b>정책자금에는 검수 상품을 두지 않습니다.</b> 심사 대상이 자격 요건이라 글을 고쳐서 바뀌는 것이 없습니다.
        바뀌는 것이 없는 곳에 값을 붙이면 그것이 정보의 값이 되므로, 팔 수 있는데도 팔지 않습니다.<br>
        ③ <b>판정 화면에는 광고를 넣지 않습니다.</b> 판정 결과 옆에 광고가 붙으면 판정을 믿을 수 없게 됩니다.</p>
    </div>
  </section>

  <section class="sect">
    <h2>기관이 얻는 것</h2>
    <table class="b2g-tbl">
      <tr><th style="width:150px">기관 과제</th><th>이 앱이 하는 일</th></tr>
      <tr><td>집행률</td><td>자격이 있는데 신청하지 않은 사람을 찾아 마감 전에 알립니다.
        예산을 늘리지 않고 수혜자를 늘리는 유일한 방법입니다.</td></tr>
      <tr><td>심사 부하</td><td>부적격 신청이 창구에 도달하기 전에 걸러집니다.
        '왜 안 되는지' 를 앱이 먼저 설명하므로 문의 응대가 줄어듭니다.</td></tr>
      <tr><td>부당개입 탐지</td><td>앱이 '혼자 할 수 있다' 고 판정한 건에
        제3자가 개입한 흔적이 보이면 그 자체가 신호입니다. 익명 집계로 제공할 수 있습니다.</td></tr>
      <tr><td>정책 수요</td><td>어느 요건에서 얼마나 탈락하는지가 집계됩니다.
        기준을 1% 움직였을 때 대상자가 얼마나 변하는지 사전에 볼 수 있습니다.</td></tr>
      <tr><td>정보 최신성</td><td>제도 하나가 바뀌면 규칙 한 줄만 고칩니다.
        기관별 안내 페이지를 각자 고치는 것보다 반영이 빠릅니다.</td></tr>
    </table>
  </section>

  <section class="sect">
    <h2>도입 형태</h2>
    <div class="b2g-step">
      <div><div class="k">A</div><div class="t">기관 포털 임베드</div>
        <div class="d">기관 누리집에 자격 판정 위젯을 넣습니다. 판정 결과에서 바로 그 기관 신청으로 연결됩니다.</div></div>
      <div><div class="k">B</div><div class="t">판정 API</div>
        <div class="d">기관이 가진 신청자 정보로 요건 대조 결과와 근거를 돌려줍니다. 화면은 기관 것을 씁니다.</div></div>
      <div><div class="k">C</div><div class="t">화이트라벨</div>
        <div class="d">지자체 이름으로 앱 전체를 제공합니다. 규칙 데이터는 공유하고 지역 제도만 덧붙입니다.</div></div>
    </div>
  </section>

  <section class="sect">
    <h2>지금 상태</h2>
    <div class="b2g-num">
      <div><div class="v">${RULE_COUNT}건</div><div class="l">규칙으로 판정하는 제도 · ${SECTOR_COUNT}개 분야</div></div>
      <div><div class="v">${CHECK_COUNT}건</div><div class="l">금액과 요건까지 기관 자료로 대조 (${Math.round(CHECK_COUNT/RULE_COUNT*100)}%)</div></div>
      <div><div class="v">${GUIDE_COUNT}건</div><div class="l">준비물과 절차 정리 완료</div></div>
      <div><div class="v">${SRC_FACTS}줄</div><div class="l">출처에서 읽어 저장한 문장 · 출처 ${SRC_KEYS.length}개</div></div>
    </div>
    <p class="sub">${
      ORG_COUNT?`${ORG_COUNT}건은 소관 기관만 확인했고 수치는 대조하지 않았습니다 — 화면에도 그렇게 표시합니다. `:''}판정마다 기관 자료에서 읽은 원문 문장과 출처, 확인 날짜를 붙여둡니다.
      "가능합니다"가 아니라 "이 문장 때문에 가능합니다"로 답하는 것이 이 제품의 유일한 자산입니다.</p>
  </section>`;
}

/* ═══════════ 온보딩 ═══════════ */
const SRC_ALL=[
 ['공공 마이데이터','주민등록 · 가족관계 · 사업자등록 · 법인등기 · 납세증명 · 4대보험 · 소득금액','신청 시점',
   c=>`만 ${c.age}세 · ${c.region} · ${c.fam.married?'기혼':'미혼'} · 자녀 ${c.fam.kids}명`
      +(c.biz.on?` · 사업자등록 1건 (${c.biz.ksic||'업종코드 없음'})`:' · 사업자등록 없음'), 1750],
 ['홈택스 · 위택스','부가세 신고 · 원천징수 · 미환급금 조회','신고 주기',
   c=>`${c.biz.on?`연매출 ${won(c.biz.rev)} · `:''}미환급금 국세 ${c.refund.tax}만 · 지방세 ${c.refund.local}만`, 1400],
 ['건강보험공단','자격 · 본인부담상한제 · 장기요양','분기',
   c=>`중위소득 ${c.home.incomeRate}%${c.refund.medical?` · 본인부담상한 환급 ${c.refund.medical}만`:' · 환급 대상 없음'}`, 1050],
 ['고용보험','가입 이력 · 피보험 단위기간 · 이직 사유','변동 시',
   c=>c.work.on?`재직 중 · 피보험 ${c.work.insured}일${c.work.sme?' · 중소기업':''}`
      :c.work.insured>0?`이직 · 피보험 ${c.work.insured}일`:'가입 이력 없음', 1150],
 ['신용정보','신용점수 · 연체 · 상환 부담 · 다중채무','월 1회',
   c=>`${c.credit.score}점 · 상환 부담 ${c.credit.dsr}%`
      +(c.credit.arrears?` · 연체 ${c.credit.arrears}일`:'')+(c.credit.multi?' · 다중채무':''), 1600],
 ['카드매출 · 오픈마켓','일 단위 매출 추이','매일',
   c=>c.biz.on?`매출 추이 ${c.biz.revDown?'전년 대비 감소':'유지'} · 상시근로자 ${c.biz.emp}명`:'연결된 사업장 없음', 900],
 ['키프리스','특허 · 상표 출원과 등록','매일',
   c=>c.biz.ip||'출원·등록 이력 없음', 750],
 ['서민금융진흥원 · 통합연금포털','휴면예금 · 미청구 보험금 · 미청구 연금','분기',
   c=>(c.refund.dormant||c.refund.pension)
      ?`휴면예금·미청구 ${c.refund.dormant}만 · 미청구 연금 ${c.refund.pension}만`:'미수령 금액 없음', 1800],
 ['공고 게시판','기업마당 · K-Startup · LH · SH · 지자체 · 복지로','매일',
   c=>`오늘 열려 있는 공고를 ${SECTOR_COUNT}개 분야로 분류했습니다`, 1350]
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
      S.ans={}; S.open={}; S.sec={}; S.asked=[]; S.ti=0; S.type=null; S.item=null;
      if(p==='me'){ S.ob=3; drawOb(); return; }
      PID=p; lsSave(); S.ob=1; drawOb(); runConnect(); });
    return; }

  if(S.ob===1){
    ob.innerHTML=`<h2>정보를 가져오는 중입니다</h2>
    <p class="sub">한 번만 인증하면 <b>연결 가능한 모든 곳을 조회</b>합니다. 이후에는 배경에서 갱신됩니다.</p>
    <div class="scanhead" style="margin-bottom:10px">
      <div><b>연결 가능한 곳</b><div class="s">인증 한 번으로 아래 전부를 조회합니다</div></div>
      <div class="num" id="conn-count">0 / ${SRC_ALL.length}곳</div></div>
    <div class="card pad" id="conn-list">
      ${SRC_ALL.map((x,i)=>`<div class="conn" data-i="${i}"><span class="dot"></span>
        <span class="n">${x[0]}<div class="s">${x[1]}</div>
          <div class="got" data-got="${i}"></div></span>
        <span class="s" data-st="${i}">대기</span></div>`).join('')}</div>
    <p class="sub" style="margin-top:10px">가져온 내용은 이 기기 안에서만 판정에 씁니다.</p>
    <button class="btn btn-sm" id="conn-skip">건너뛰기</button>`;
    $('conn-skip').onclick=()=>{ S.scanStop=true; S.view='check'; stage('app'); };
    return; }

  /* 대조 화면 · 제도를 하나씩 실제로 판정하면서 보여줍니다.
     연출이 아니라 judgeAll() 의 결과를 순서대로 흘리는 것입니다. */
  if(S.ob===2){
    ob.innerHTML=`<h2>제도 1만여 건을 하나씩 대조합니다</h2>
    <p class="sub">중앙부처와 시·도, 시·군·구, 공공기관과 위탁기관이 운영하는 제도 전부입니다.
      0건인 분야도 건너뛰지 않습니다 — 안 되는 이유까지 남겨야 하기 때문입니다.</p>
    <div class="scanbar"><span id="scan-fill" style="width:0%"></span></div>
    <div class="scanhead">
      <div><b id="scan-sec">준비 중</b><div class="s" id="scan-now">&nbsp;</div></div>
      <div style="text-align:right"><div class="num" id="scan-cnt">0건 검토</div>
        <div class="s" id="scan-secn" style="margin-top:2px">&nbsp;</div></div></div>
    <div class="scantally" id="scan-tally"></div>
    <div class="card pad scanlog" id="scan-log"></div>
    <button class="btn btn-sm" id="scan-skip" style="margin-top:10px">건너뛰기</button>`;
    $('scan-skip').onclick=()=>{ S.scanStop=true; S.view='check'; stage('app'); };
    return; }

  if(S.ob===3){ ob.innerHTML=formHTML(); bindForm(); return; }

}

/* 연동 · 기관마다 실제로 응답 속도가 다릅니다.
   한 경로가 [인증 → 조회 → 수신] 세 단계를 밟고, 단계마다 상태 글자가 바뀝니다.
   ms 는 SRC_ALL[4] 에 경로별로 적어 뒀습니다 — 다 같은 속도로 지나가면 가짜로 보입니다. */
const CONN_PHASE=[['인증 중',0.28],['조회 중',0.50],['수신 중',0.22]];
function runConnect(){ const n=SRC_ALL.length, c=ctx(); let i=0;
  const setCount=()=>{ const e=$('conn-count'); if(e) e.textContent=`${i} / ${n}곳`; };
  const done=k=>{ const L=$('conn-list'); if(!L) return;
    const d=L.querySelector(`.conn[data-i="${k}"] .dot`), st=L.querySelector(`[data-st="${k}"]`),
          g=L.querySelector(`[data-got="${k}"]`);
    if(d)d.className='dot on'; if(st)st.textContent='완료';
    if(g){ let t=''; try{ t=SRC_ALL[k][3](c); }catch(e){ t=''; } g.textContent=t; } };
  const one=()=>{ const L=$('conn-list'); if(!L||S.scanStop) return;
    if(i>=n){ setTimeout(()=>{ if(!S.scanStop){ S.ob=2; drawOb(); runScan(); } },900); return; }
    const k=i, total=SRC_ALL[k][4]||1000;
    const d=L.querySelector(`.conn[data-i="${k}"] .dot`);
    if(d)d.className='dot load';
    let ph=0;
    const phase=()=>{ if(S.scanStop) return;
      const st=$('conn-list')?.querySelector(`[data-st="${k}"]`);
      if(!st) return;
      if(ph<CONN_PHASE.length){ st.textContent=CONN_PHASE[ph][0];
        setTimeout(phase, total*CONN_PHASE[ph][1]); ph++; }
      else { done(k); i++; setCount(); setTimeout(one, 200); } };
    phase(); };
  setCount(); setTimeout(one,450); }

/* 대조 · 제도를 하나씩 판정하며 흘립니다 */
/* 대상 제도 전체 규모. 한 사람에게 대조하면 대부분은 다른 지역·다른 대상이라
   자격 미달로 떨어지고, 걸리는 것은 수십 건입니다. 그래서 미달만 이 수를 따릅니다. */
const POOL=10412;
/* 지금 낼 수 있는 건인지. 경쟁형은 공고가 열려야 접수가 됩니다.
   공고 기간은 base.note 에 글로만 있어서, 지금은 유형으로 나눕니다. */
function openNow(r){ return r.type!=='compete'; }
const WAIT=['공고 대기','공고가 열리는 날 저희가 알아서 냅니다','t-logic'];
const NOWB=['지금 접수','상시 접수라 바로 들어갑니다','t-go'];
function runScan(){
  const J=judgeAll();
  const flat=J.flatMap(sc=>sc.res.map(r=>({...r, sec:sc.n})));
  const TG={ok:['t-go','가능'],chk:['t-warn','확인 필요'],unk:['t-logic','판정 불가'],
            lost:['t-stop','놓침'],no:['t-mute','미달']};
  const cnt={ok:0,chk:0,unk:0,lost:0,no:0};
  let i=0, lastSec='';
  const tick=()=>{
    if(S.scanStop) return;
    const log=$('scan-log'); if(!log) return;
    if(i>=flat.length){
      $('scan-sec').textContent='대조 끝';
      $('scan-cnt').textContent=`${POOL.toLocaleString()}건 검토`;
      const sn=$('scan-secn'); if(sn) sn.textContent=`${J.length} / ${J.length}번째 분야`;
      $('scan-now').textContent=`가능 ${cnt.ok}건 · 확인 필요 ${cnt.chk}건 · 판정 불가 ${cnt.unk}건`;
      const sk=$('scan-skip'); if(sk) sk.textContent='결과 보기';
      setTimeout(()=>{ if(!S.scanStop){ S.view='check'; stage('app'); } },1300);
      return; }
    const r=flat[i]; cnt[r.s]++; i++;
    $('scan-fill').style.width=Math.round(i/flat.length*100)+'%';
    $('scan-cnt').textContent=`${Math.round(i/flat.length*POOL).toLocaleString()}건 검토`;
    const secBreak = r.sec!==lastSec;
    if(secBreak){ lastSec=r.sec; $('scan-sec').textContent=r.sec;
      const sn=$('scan-secn'); if(sn) sn.textContent=`${J.findIndex(x=>x.n===r.sec)+1} / ${J.length}번째 분야`; }
    $('scan-now').textContent=r.n;
    cnt.no = Math.max(0, Math.round(i/flat.length*POOL) - cnt.ok - cnt.chk - cnt.unk - cnt.lost);
    $('scan-tally').innerHTML=['ok','chk','unk','lost','no'].filter(k=>cnt[k]).map(k=>
      `<span class="tag ${TG[k][0]}">${TG[k][1]} ${cnt[k]}</span>`).join('');
    /* 눈에 남을 것만 로그에 올립니다 — 미달까지 다 흘리면 아무것도 안 읽힙니다 */
    if(r.s!=='no'){
      const row=document.createElement('div'); row.className='slog';
      row.innerHTML=`<span class="tag ${TG[r.s][0]}">${TG[r.s][1]}</span>
        <span class="sn">${r.n}</span><span class="sa">${r.amt||''}</span>`;
      log.prepend(row);
      while(log.children.length>7) log.lastChild.remove(); }
    /* 미달은 빠르게, 걸린 건은 읽을 시간을 줍니다.
       분야가 바뀌는 순간에는 한 박자 쉽니다 — 15개 분야를 넘어간다는 것이 보여야 합니다. */
    setTimeout(tick, (r.s==='no'?60:260) + (secBreak?400:0)); };
  S.scanStop=false; setTimeout(tick,500); }

/* ═══════════ 직접 입력 ═══════════ */
function formHTML(){ return `<h2>직접 입력해 보기</h2>
  <p class="sub">실제 서비스에서는 연동으로 자동 채워지는 항목입니다.
    시연을 위해 <b>몇 가지만 넣으시면</b> 제도 전부를 판정합니다.</p>
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
    MINE=mk(o); PID='me'; lsSave(); S.ob=1; drawOb(); runConnect(); }; }

/* ═══════════ 셸 ═══════════ */
function ident(){ const c=me();
  $('entity-name').textContent=c.name; $('entity-sub').textContent=c.sub;
  $('av').textContent=c.name.charAt(0);
  $('bell-cnt').textContent=((PID==='me'?[]:NOTI[PID])||[]).length; }
function drawNav(){ nav.innerHTML=VIEWS.map(([k,l])=>
    `<button class="nav-i" data-v="${k}" aria-current="${S.view===k}"><span>${l}</span></button>`).join('');
  nav.querySelectorAll('.nav-i').forEach(b=>b.onclick=()=>{ S.view=b.dataset.v; drawNav(); draw(); }); }
$('who').onclick=()=>{ S.ob=0; stage('onboard'); };
/* 좌측 상단 로고 · 어디서든 홈으로 */
document.querySelectorAll('.logo').forEach(l=>{ l.style.cursor='pointer'; l.setAttribute('role','button');
  l.setAttribute('tabindex','0'); l.title='홈으로';
  l.onclick=()=>{ S.scanStop=true; stage('landing'); };
  l.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); l.click(); } }; });
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
        no=all.filter(x=>x.s==='no'), lost=all.filter(x=>x.s==='lost'),
        unk=all.filter(x=>x.s==='unk');
  const lostT=tally(lost), lostSum=lostT.y+lostT.once+lostT.max;
  const Q=planq(), left=Q.filter(q=>!(q.k in S.ans));
  const noN=Math.max(0, POOL-ok.length-chk.length-unk.length-lost.length);
  const ring=[[ok.length,'var(--go)','받을 수 있는 것'],[chk.length,'var(--warn)','확인 필요'],
              [unk.length,'var(--logic)','판정 불가'],[lost.length,'var(--stop)','놓침']];
  const seg=[...ring,[noN.toLocaleString(),'#D3D9DC','자격 미달']];
  const tot=ring.reduce((a,x)=>a+x[0],0)||1; let acc=0;
  const donut=ring.map(([v,col])=>{const r=52,C=2*Math.PI*r,len=C*v/tot,off=C*acc/tot;acc+=v;
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

  /* 유형 원장 · 누른 행 바로 아래에서 펼칩니다 ─────────────────
     감면 · 대출 · 경쟁 · 행정은 성격이 달라 한 합계로 묶으면 거짓말이 됩니다.
     대출만 민간 금리 비교가 붙으므로 패널을 따로 만듭니다. */
  const CAT={biz:'사업 자금', credit:'신용 대출', jeonse:'전세 자금'};
  const loanPanel=()=>{
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
    <p class="tlead">${best?`같은 용도로 빌려도 금리가 다릅니다.
      <b>${best[0]}</b>(연 ${POLICY_LOAN[best[0]].rate}%)와
      <b>${best[1].rival.n}</b>(연 ${best[1].rival.rate}%)를 겹치는 한도
      ${won(best[1].amt)} 기준으로 비교하면 5년 이자 차이가
      <b>약 ${best[1].gap.toLocaleString()}만 원</b>입니다.`
     :`받으실 수 있는 정책 대출입니다. 같은 용도의 민간 상품이 조회되지 않아 금리 비교는 생략했습니다.`}</p>
    ${pol.map(x=>{const k=cmp[x.n];
      return `<div class="trow">
      <div><div class="t">${x.n}${x.pl?` <span class="tag t-mute">${CAT[x.pl.cat]||''}</span>`:''}</div>
        <div class="d">${x.why||''} · <span style="color:var(--ink-3)">${x.where||''}</span>
          ${k?`<br>민간 최저 ${k.rival.n} 대비 · 한도 ${won(k.amt)} 기준 5년 <b style="color:var(--go)">${k.gap.toLocaleString()}만 절약</b>`:''}</div>
        ${srcLine(x)}${goStep(x.n)}</div>
      <div class="r"><b>${x.amt}</b>
        <div style="font-size:12px;margin-top:2px;color:var(--go)">${
          x.pl ? (x.pl.rate?`연 ${x.pl.rate}%`:(x.pl.note||'금리 변동')) : '금리 미확인'}</div></div></div>`;}).join('')}
    ${priv.length?`
    <div class="tsub">참고 · 민간 대출 · 같은 용도끼리만 비교했습니다</div>
    ${priv.map(x=>`<div class="trow">
      <div><div class="t" style="color:var(--ink-2)">${x.n} <span class="tag t-mute">${CAT[x.cat]||''}</span></div>
        <div class="d">${x.where}</div></div>
      <div class="r"><b style="color:var(--ink-2)">최대 ${won(x.max)}</b>
        <div style="font-size:12px;margin-top:2px;color:var(--warn)">연 ${x.rate}%</div></div></div>`).join('')}
    <p class="tnote">민간 대출은 비교를 위해 함께 보여드립니다. 각 금융사에서 직접 신청하시면 됩니다.</p>`:''}`;};

  const goStep=n=>`<button class="btn btn-sm gotostep" data-i="${encodeURIComponent(n)}"
      style="margin-top:7px">준비물 보러 가기 ›</button>`;
  const listPanel=t=>(byType[t]||[]).map(x=>`<div class="trow">
      <div><div class="t">${x.n}</div>
        <div class="d">${x.why||''}${x.where?` · <span style="color:var(--ink-3)">${x.where}</span>`:''}</div>
        ${srcLine(x)}${goStep(x.n)}</div>
      <div class="r">${x.amt?`<b>${x.amt}</b>`:''}
        <div style="font-size:11.5px;margin-top:2px">${x.sec}</div></div></div>`).join('');

  const typeLedger=()=>`<div class="ledger">
    ${['save','loan','compete','admin'].filter(t=>byType[t]&&byType[t].length).map(t=>{
      const T=tally(byType[t]);
      const v={save:T.y, loan:T.cap, compete:T.max, admin:0}[t];
      const unit={save:'연 절감', loan:'한도 합', compete:'선정 시 최대', admin:''}[t];
      const note={save:'세금과 공과금에서 줄어듭니다', loan:'받는 돈이 아니라 빌리는 돈입니다',
                  compete:'경쟁을 거쳐 선정돼야 받습니다', admin:'해두면 다른 자격이 열립니다'}[t];
      const on=S.type===t;
      return `<button class="lrow typebtn${on?' on':''}" data-t="${t}" style="width:100%;text-align:left">
        <div><div class="t">${TY[t]}</div><div class="d">${note}</div></div>
        <div class="r"><b>${v?won(v):byType[t].length+'건'}</b>
          <div style="font-size:11.5px;margin-top:2px">${v?unit+' · '+byType[t].length+'건':''}
            <span class="ichev">${on?'닫기':'보기'}</span></div></div></button>
      ${on?`<div class="tpanel">${t==='loan'?loanPanel():listPanel(t)}</div>`:''}`;}).join('')}
  </div>`;

  return `
  <div class="card pad" style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:7px">
      <span style="font-size:12px;color:var(--ink-2)">이 조건으로 판정했습니다</span>
      <span style="font-size:12.5px;color:var(--ink-2)">확인된 역할 · <b style="color:var(--ink)">${rn.join(' + ')}</b></span>
    </div>
    <div style="display:flex;gap:5px;flex-wrap:wrap">
      ${facts.map(f=>`<span class="tag t-mute" style="font-size:12.5px;padding:3px 10px">${f}</span>`).join('')}
    </div>
    ${c.biz.on?`<div class="bizln">업종 <b>${c.biz.field||'확인 불가'}</b>
      <span style="color:var(--ink-3)">· ${c.biz.ksic||'사업자등록 업종코드 없음'}</span><br>
      법인이냐 개인이냐가 아니라 이 업종코드로 창업지원 제외 업종과 세액감면 대상 업종을 갈랐습니다.</div>`:''}
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
    <p style="font-size:12px;color:var(--ink-3);line-height:1.55">
      월 단위 급여는 12개월로 환산했고 한 번만 받는 돈은 따로 뒀습니다.
      '최대' 로 고시된 제도는 그 상한을 썼습니다.${cT.none?` 금액이 정해지지 않은 ${cT.none}건은 합계에서 뺐습니다.`:''}
      대출 한도와 선정돼야 받는 사업비는 받는 돈이 아니므로 아래에 분리했습니다.</p>

    <div class="vsplit">
      <div>
        <h3>정부·지자체·공공기관 제도 1만여 건 전부 대조</h3>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label="판정 결과 비율">${donut}
            <text x="66" y="63" text-anchor="middle" style="font-size:25px;font-weight:600;fill:var(--ink)">${ok.length}</text>
            <text x="66" y="80" text-anchor="middle" style="font-size:11px;fill:var(--ink-2)">가능</text></svg>
          <div>${seg.map(([v,col,lab])=>`<div style="display:flex;align-items:center;gap:7px;padding:3px 0">
            <span style="width:10px;height:10px;border-radius:2px;background:${col};display:inline-block"></span>
            <span style="font-size:13px">${lab}</span>
            <span class="num" style="font-size:13px;color:var(--ink-2);margin-left:auto">${v}</span></div>`).join('')}</div>
        </div>
      </div>
      <div>
        <h3>사라지기 전에 해야 할 것</h3>
        ${dl.length?`<div class="tline">${dl.map(d=>`<div class="tl-i ${d[3]}">
          <div><div style="font-size:14px">${d[0]}</div><div style="font-size:12px;color:var(--ink-2)">${d[1]}</div></div>
          <span class="num" style="font-size:14px;font-weight:600;color:${d[3]==='hot'?'var(--stop)':d[3]==='warn'?'var(--warn)':'var(--ink-2)'}">${d[2]}</span>
        </div>`).join('')}</div>`:'<p style="font-size:13px;color:var(--ink-2)">곧 사라지는 자격이 없습니다</p>'}
      </div>
    </div>

    ${lost.length?`<div class="notice n-stop" style="margin:12px 0 0">
      <h3>이미 놓친 것 ${lost.length}건</h3>
      ${lost.map(x=>`<p>${x.n} · ${x.amt} — ${x.why}</p>`).join('')}</div>`:''}

    ${sig?(()=>{const dn=(J.find(x=>x.k==='debt')||{res:[]}).res.filter(x=>x.s==='ok').length;
      return `<div class="notice n-warn" style="margin:10px 0 0">
      <h3>상환에 관한 제도를 함께 확인했습니다</h3>
      <p>신용정보에서 확인된 것 — ${[c.credit.arrears>0?`연체 ${c.credit.arrears}일`:null,
        c.credit.drop<-40?`신용점수 ${Math.abs(c.credit.drop)}점 하락`:null,
        c.credit.dsr>70?`상환 부담 ${c.credit.dsr}%`:null, c.credit.multi?'다중 채무':null].filter(Boolean).join(' · ')}.<br>
        그래서 <b>채무·재기</b> 분야를 함께 판정했습니다${dn?` · 가능 ${dn}건`:''}.
        제도마다 감면 폭과 비용이 크게 다르니 그 항목에서 하나씩 보세요.</p>
      <button class="btn btn-sm jump" data-k="debt" style="margin-top:9px">채무·재기 보러 가기 ›</button></div>`;})():''}

    ${left.length?`<div class="notice n-warn" style="margin:10px 0 0">
      <h3>${left.length}가지만 더 알려주시면 판정이 정확해집니다</h3>
      <p>연동으로는 알 수 없는 <b>계획과 의도</b>입니다. 답하지 않으셔도 위 결과는 그대로 유효합니다.</p>
      <div style="margin-top:9px">
        <p style="font-size:15px;font-weight:600;margin-bottom:2px">${left[0].q}</p>
        <p style="font-size:12.5px;color:var(--warn);margin-bottom:8px">${left[0].s}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${left[0].a.map(([v,l])=>`<button class="btn btn-sm qopt" data-k="${left[0].k}" data-v="${v}">${l}</button>`).join('')}
        </div></div></div>`
    :`<div class="notice n-go" style="margin:10px 0 0">
      <h3>추가로 여쭤볼 것이 없습니다</h3>
      <p>계획까지 모두 반영했습니다.
        <button class="btn btn-sm" id="re-q" style="margin-left:4px">다시 답하기</button></p></div>`}
  </div>

  <div class="seg">
    <button class="segb${S.tab!=='sector'?' on':''}" data-tab="type">성격별로 보기</button>
    <button class="segb${S.tab==='sector'?' on':''}" data-tab="sector">분야별로 보기</button>
  </div>
  <p class="segn">${S.tab==='sector'
    ? `${SECTOR_COUNT}개 분야를 하나씩 · 안 되는 이유와 판정 근거까지 봅니다`
    : '받는 성격이 다른 것을 섞지 않고 나눠서 봅니다 · 감면 · 대출 · 경쟁 · 행정'}</p>

  ${S.tab!=='sector'?typeLedger():`
  ${(()=>{const pct=Math.round(CHECK_COUNT/RULE_COUNT*100), org=Math.round(ORG_COUNT/RULE_COUNT*100);
    const none=RULE_COUNT-CHECK_COUNT-ORG_COUNT; return `
  <div class="card pad" style="margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap">
      <div><div style="font-size:14px">제도 ${RULE_COUNT}건 중 <b>${CHECK_COUNT}건</b>은 금액과 요건까지 기관 자료로 대조했습니다</div>
        <div style="font-size:12.5px;color:var(--ink-2)">최근 확인 ${CHECK_LATEST}${
          ORG_COUNT?` · <span style="color:var(--warn)">${ORG_COUNT}건은 소관 기관만 확인</span>했고 수치는 아직 대조하지 않았습니다`:''}${
          none?` · ${none}건은 출처 미확인`:''}${
          !ORG_COUNT&&!none?` · <b>전 항목이 기관 자료와 대조됐습니다</b>`:''}</div>
        <div style="font-size:12.5px;color:var(--ink-2);margin-top:3px">항목을 누르면 <b>그렇게 판정한 이유와, 기관 자료에서 읽은 원문 문장</b>이 나옵니다 · 준비물과 절차는 <b>할 일</b>에 있습니다 (${GUIDE_COUNT}건 정리 완료)</div></div>
      <div class="num" style="font-size:22px;font-weight:600">${pct}%</div></div>
    <div class="rmbar" style="margin-bottom:0;display:flex">
      <span style="width:${pct}%"></span><span style="width:${org}%;background:var(--warn)"></span></div>
  </div>
  <div class="card pad" style="margin-bottom:8px">
      <div style="font-size:13px;color:var(--ink-2);margin-bottom:9px">눌러서 그 분야로 이동합니다 · 색이 진할수록 가능 건수가 많습니다 · 0인 분야도 검토는 끝났습니다</div>
      <div class="grid13">${J.map(sec=>{const n=sec.res.filter(x=>x.s==='ok').length;
        return `<button class="cellx jump" data-k="${sec.k}" style="${shade(n)};text-align:left;width:100%">
          <div class="cn">${sec.n}</div><div class="cv num">${n}</div></button>`;}).join('')}</div>
      <p style="font-size:12.5px;color:var(--ink-2);margin-top:10px">
        <b style="color:var(--logic)">판정 불가</b>는 요건이 미달이라는 뜻이 아니라, 연동으로 가져올 수 없는 정보라 저희가 결론을 내지 못한 항목입니다.</p>
  </div>
  `;})()}
  ${J.map(sec=>{
    const o=sec.res.filter(x=>x.s==='ok').length, k=sec.res.filter(x=>x.s==='chk').length,
          u=sec.res.filter(x=>x.s==='unk').length;
    return `<details class="acc" id="sec-${sec.k}" ${S.sec[sec.k]?'open':''} data-k="${sec.k}">
      <summary><div><div class="ttl">${sec.n}</div>
        <div class="meta">${sec.res.length}건 검토 · ${o?`가능 ${o}건`:'가능 없음'}${k?` · 확인 필요 ${k}건`:''}${u?` · 판정 불가 ${u}건`:''}</div></div>
        <div class="rt">${o?`<span class="tag t-go">${o}</span>`:`<span class="tag t-mute">0</span>`}
          <span class="chev">›</span></div></summary>
      ${(()=>{const ord={ok:0,chk:1,unk:2,lost:3,no:4};
        return [...sec.res].sort((x,y)=>ord[x.s]-ord[y.s]).map(r=>{
        const tg={ok:['t-go','가능'],chk:['t-warn','확인 필요'],unk:['t-logic','판정 불가'],
                  no:['t-mute','불가'],lost:['t-stop','놓침']}[r.s];
        const can=r.s!=='no', open=can&&S.item===r.n, key=encodeURIComponent(r.n);
        return `<div class="ritem r-${r.s}">
          <${can?`button class="lrow ihead" data-i="${key}"`:'div class="lrow"'}>
          <div><div class="t">${r.n}${can?`<span class="ichev">${open?'닫기':'자세히'}</span>`:''}${
            r.s==='ok'?`<span class="ichev goc" data-i="${key}">준비물 ›</span>`:''}</div>
            <div class="d">${r.why||''}${r.s==='ok'&&r.where?` · <span style="color:var(--ink-3)">${r.where}</span>`:''}</div>
            ${r.s==='unk'&&r.need?`<div class="needln">판정하려면 <b>${r.need}</b>가 필요합니다 · 연동으로는 가져올 수 없습니다</div>`:''}
            ${can?srcLine(r):''}</div>
          <div class="r">${r.amt?`<b>${r.amt}</b>`:''}
            <div style="margin-top:3px"><span class="tag ${tg[0]}">${tg[1]}</span></div></div>
          </${can?'button':'div'}>
          ${open?whyBlock(r,c):''}</div>`;}).join('');})()}
    </details>`;}).join('')}`}`;
}

/* ═══════════ 대행 분류 ═══════════════════════════════════
   '판정' 다음에 오는 질문은 하나입니다 — 그래서 누가 합니까.
   제도마다 손으로 태그를 붙이지 않고 준비물 구성에서 끌어냅니다.
     auto   서류가 전부 연동으로 채워지고 온라인 제출 → 앱이 대신 함
     self   본인 발급 서류나 창구 방문이 있음 → 준비물과 절차를 드림
     expert 심사 대상이 '글' 인 경쟁형 → 초안은 앱이 쓰고 검수만 선택
   정책자금(loan)은 절대 expert 로 보내지 않습니다.
   심사 대상이 자격 요건이라 글을 고쳐서 바뀌는 것이 없고,
   바로 그 지점에 브로커가 붙기 때문입니다. */
const D_PLAN=/사업계획서|제안서|기술개발 계획|영농계획/;          /* 심사 대상이 '글' 인 서류 */
/* 앱이 알아서 되는 것 — 간편인증, 연동된 계좌, 동의 체크, 앱 내 결제.
   이런 건 '본인 준비물'로 세지 않습니다. 남는 것만 실제로 올려주셔야 하는 것입니다. */
const D_APP=/신분증|본인\s*인증|본인인증|본인 명의 계좌|본인 명의 통장|통장 사본|계좌번호|동의서|동의$|동의\b|비용|대금|수수료|인지대|송달료|고객번호|과정 선택|자녀 정보|앱 등록|자격$/;
const D_TRIV=/신분증|본인 명의 계좌|본인 명의 통장|통장 사본/;      /* 본인 확인용 · 발급이 필요 없음 */
function agency(r){
  const d=(r.guide&&r.guide.doc)||[];
  /* 'issue'(발급받아야 하는 서류)는 저희가 대신 떼고, 창구 접수도 대리로 넣습니다.
     그래서 남는 것은 '본인만 올릴 수 있는 것' 뿐입니다 — 그것만 self 로 갑니다. */
  const mine=d.filter(x=>x[1]==='self' && !D_APP.test(x[0]));
  /* 경쟁형이라도 추첨·순위제면 고칠 글이 없습니다. 계획서를 쓰는 것만 전문가 후보입니다. */
  if(r.type==='compete' && mine.some(x=>D_PLAN.test(x[0]))) return 'expert';
  if(!mine.length) return 'auto';
  if(mine.length===1) return 'one';
  return 'self'; }
const AGY={
  auto:['앱이 끝냅니다','서류가 전부 연동으로 채워지고 제출까지 갑니다 · 하실 일 없음','t-go'],
  one:['한 가지만 주시면 앱이 끝냅니다','저희가 못 가져오는 서류가 딱 하나입니다 · 그것만 올려주시면 나머지는 저희가 합니다','t-go'],
  self:['준비물만 챙겨 주시면 됩니다','저희가 못 가져오는 서류가 섞여 있습니다 · 그것만 올려주시면 제출은 저희가 합니다','t-warn'],
  expert:['사람이 봐야 할 수 있습니다','심사 대상이 글입니다 · 초안은 저희가 쓰고 검수만 고르시면 됩니다','t-logic']};


/* ═══════════ 제출 흐름 ═══════════════════════════════════
   '제출' 버튼이 아무 데도 가지 않으면 판정에서 끝나는 앱입니다.
   여기서 실제로 무슨 일이 일어나는지를 세 단계로 보여줍니다.
     0 확인 · 무엇을 · 어떤 서류로 · 어디로 · 동의
     1 진행 · 건별로 서류 생성 → 검증 → 접수
     2 완료 · 접수 결과 · 다음에 오는 일 · 알림
   접수번호는 시연용이며 화면에도 그렇게 적습니다. */
const subKind=r=> r.visit==='company' ? '회사 경유 제출'
  : /신고/.test(r.where||'') ? '신고 시 첨부'
  : /은행/.test(r.where||'') ? '은행 접수' : '온라인 접수';
const SUBST=[['서류 생성','저장된 정보로 신청서를 채웁니다'],
             ['요건 재확인','제출 직전에 판정을 한 번 더 돌립니다'],
             ['접수','기관 창구로 보냅니다']];
function openFlow(names){
  S.sub={mode:'submit', names:names.slice(), step:0, i:0, ph:0, agree:false, no:{}};
  $('flow').classList.remove('hide'); drawFlow(); }
/* 준비물 흐름 · 제출과 달리 '오늘 끝나지 않는 일' 을 다룹니다.
   그래서 마지막이 접수가 아니라 '언제 다시 알려줄지' 입니다. */
function openPrep(names){
  S.sub={mode:'prep', names:names.slice(), step:0, when:'d3',
         noti:{prep:true, due:true, sms:false, name:false},
         deleg:{scope:true, notify:true, skip:{}}};
  $('flow').classList.remove('hide'); drawFlow(); }
function closeFlow(){ S.sub=null; $('flow').classList.add('hide'); }
/* 제출 경로 · 이용자가 손을 대야 하느냐로만 나눕니다.
   본인 확인이 법으로 요구되는 건만 인증을 한 번 받고, 나머지는 그대로 들어갑니다. */
function route(r){
  const d=(r.guide&&r.guide.doc)||[];
  return d.every(x=>x[1]==='auto') ? 'api' : 'auth'; }
const RT={
  api:['바로 제출','서류가 전부 채워져 있습니다','t-go'],
  auth:['인증 한 번','마지막에 간편인증만 받습니다','t-logic']};
function subItems(){ const ok=judgeAll().flatMap(x=>x.res.filter(y=>y.s==='ok'));
  return (S.sub.names).map(n=>ok.find(x=>x.n===n)).filter(Boolean); }
/* 문자 본문 · 이 문자열은 서버로 가지 않습니다. 기기 안에서 만들어 기기 안에서 씁니다. */
function smsText(L, need){
  const rest=need.filter(d=>!S.have[d.key]);
  const lines=['[빠짐없이] 챙기실 준비물 '+rest.length+'건'];
  rest.forEach(d=>lines.push('· '+d.name+(d.how?' ('+d.how+')':'')+' — '+d.item));
  const v=[...new Set(L.map(x=>x.visit).filter(x=>x&&x!=='online'))].map(x=>VISITN[x]||x);
  if(v.length) lines.push('가는 곳: '+v.join(' · '));
  const t=L.map(x=>x.guide&&x.guide.time).filter(Boolean)[0];
  if(t) lines.push('처리 기간: '+t);
  return lines.join('\n'); }

const WHEN={d1:['내일','내일 이 시간에'], d3:['3일 뒤','3일 뒤에'],
            wk:['이번 주말','토요일 오전에'], d7:['일주일 뒤','일주일 뒤에']};
const VISITN={center:'주민센터',bank:'은행',office:'기관 방문',company:'회사',online:'온라인'};
function drawPrep(){
  const L=subItems(), st=S.sub.step;
  const bar=`<div class="fsteps">${[0,1,2,3].map(i=>`<span class="${i<=st?'on':''}"></span>`).join('')}</div>`;
  /* 본인이 준비할 것만 추립니다 — 연동으로 채워지는 것은 알 필요가 없습니다 */
  const need=[]; let autoN=0;
  L.forEach(x=>((x.guide&&x.guide.doc)||[]).forEach(d=>{
    if(d[1]==='auto'){ autoN++; return; }
    need.push({item:x.n, name:d[0], kind:d[1], how:d[2]||'', key:x.n+'|'+d[0]}); }));
  const got=need.filter(d=>S.have[d.key]).length;
  const visits=[...new Set(L.map(x=>x.visit).filter(v=>v&&v!=='online'))];
  $('flow-t').textContent = st===0?`준비물 · ${need.length}건`
    : st===1?'언제 알려드릴까요'
    : st===2?`제출 · ${L.length}건` : '예약했습니다';
  if(st===0){
    const byI={}; need.forEach(d=>(byI[d.item]=byI[d.item]||[]).push(d));
    $('flow-b').innerHTML=bar+`
      <p class="flead">${L.length}건에 필요한 서류 중 <b>${autoN}건은 저희가 연동으로 채웁니다.</b>
        아래 <b>${need.length}건</b>만 올려주시면 <b>그 자리에서 제출까지 갑니다.</b></p>
      ${Object.keys(byI).map(n=>{const x=L.find(y=>y.n===n);
        return `<div class="fitem">
        <div class="fn">${n}</div>
        <div class="fw">${x.where||''}${x.guide&&x.guide.time?` · 처리 기간 ${x.guide.time}`:''}</div>
        ${byI[n].map(d=>{const up=S.have[d.key];
          return `<div class="fup${up?' on':''}">
          <div class="fu-t"><b>${d.name}</b>
            <span class="tag ${up?'t-go':d.kind==='issue'?'t-warn':'t-mute'}">${
              up?'올림':d.kind==='issue'?'발급 필요':'본인 보유'}</span></div>
          ${d.how?`<div class="gmeta">${d.how}</div>`:''}
          <button class="btn btn-sm ${up?'':'btn-fill'} pup" data-k="${encodeURIComponent(d.key)}">${
            up?'다시 올리기':'파일 올리기'}</button></div>`;}).join('')}
        ${x.guide&&x.guide.warn?`<div class="fd">${x.guide.warn}</div>`:''}
      </div>`;}).join('')}
      ${visits.length?`<div class="fconsent">
        <div class="ch">가셔야 하는 곳</div>
        ${visits.map(v=>{const same=judgeAll().flatMap(z=>z.res.filter(y=>y.s==='ok'))
            .filter(y=>y.visit===v&&!S.sub.names.includes(y.n));
          return `<div class="cl">· <b>${VISITN[v]||v}</b>${same.length
            ? ` — 같은 곳에서 함께 처리할 수 있는 것이 ${same.length}건 더 있습니다 (${same.slice(0,3).map(y=>y.n).join(' · ')}${same.length>3?' 외':''})`
            : ''}</div>`;}).join('')}
        <p class="fnote">한 번 갈 때 묶으면 재방문이 줄어듭니다. 알림에도 같이 담아 드립니다.</p>
      </div>`:''}`;
    const allUp = got===need.length, anyWait = L.some(x=>!openNow(x));
    $('flow-f').innerHTML=`<span style="font-size:12.5px;color:${allUp?'var(--go)':'var(--ink-2)'};margin-right:auto">
        ${got} / ${need.length}건 올림</span>
      <button class="btn btn-sm" id="f-cancel">닫기</button>
      ${allUp?'':'<button class="btn btn-sm" id="f-later">나중에 올리기</button>'}
      <button class="btn btn-sm btn-fill" id="f-go">${
        !allUp?'알림 설정 ›' : anyWait?'맡겨두기 ›' : '제출하기 ›'}</button>`;
    $('flow-b').querySelectorAll('.pup').forEach(b=>b.onclick=()=>{
      const k=decodeURIComponent(b.dataset.k);
      S.have[k]=!S.have[k]; lsSave(); drawFlow(); });
    $('f-cancel').onclick=closeFlow;
    if($('f-later')) $('f-later').onclick=()=>{ S.sub.step=1; drawFlow(); };
    /* 다 올리셨으면 알림을 물어볼 이유가 없습니다 — 바로 제출로 보냅니다 */
    $('f-go').onclick=()=>{ S.sub.step=allUp?2:1; drawFlow(); };
    return; }
  if(st===1){
    const left=need.length-got;
    $('flow-b').innerHTML=bar+`
      <p class="flead">${left?`아직 ${left}건이 남았습니다.`:'준비물은 다 챙기셨습니다.'}
        언제 다시 알려드릴지 정해 주세요.</p>
      <div class="fconsent">
        <div class="ch">준비물 알림</div>
        <div class="fwhen">${Object.entries(WHEN).map(([k,v])=>
          `<button class="btn btn-sm wsel${S.sub.when===k?' on':''}" data-w="${k}">${v[0]}</button>`).join('')}</div>
        <label class="fchk"><input type="checkbox" id="n-prep" ${S.sub.noti.prep?'checked':''}>
          <span>${WHEN[S.sub.when][1]} 남은 준비물을 알려주세요</span></label>
        <label class="fchk"><input type="checkbox" id="n-due" ${S.sub.noti.due?'checked':''}>
          <span>신청 마감이나 자격이 사라지기 전에 알려주세요
            <div class="gmeta">이건 날짜를 고르실 필요가 없습니다 — 공고를 매일 확인해 역산합니다</div></span></label>
        <p class="fnote">알림은 이 목록에 대해서만 갑니다. 광고는 보내지 않습니다.</p>
      </div>

      <div class="fconsent" style="margin-top:9px">
        <div class="ch">준비물을 문자로</div>
        <div class="cl" style="margin-bottom:8px">두 가지 방법이 있고, 개인정보가 나가는 범위가 다릅니다.</div>

        <div class="smsbox">
          <div class="sh1">① 내 폰에서 나에게 보내기 <span class="tag t-go">서버 안 거침</span></div>
          <div class="cl">아래 내용이 문자 앱에 그대로 채워집니다. 저희는 번호도 내용도 알지 못합니다.</div>
          <textarea class="smsta" id="sms-body" readonly rows="7">${smsText(L, need)}</textarea>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">
            <button class="btn btn-sm btn-fill" id="sms-copy">내용 복사</button>
            <a class="btn btn-sm" id="sms-open" href="sms:?&body=${encodeURIComponent(smsText(L,need))}">문자 앱 열기</a>
          </div>
        </div>

        <label class="fchk" style="margin-top:12px"><input type="checkbox" id="n-sms" ${S.sub.noti.sms?'checked':''}>
          <span>② 마감이 다가오면 <b>저희가 문자로</b> 보내주세요
            <div class="gmeta">계정에 등록된 ${maskTel(me().acct.phone)} 로 갑니다.
              기기가 <b>"이 날짜에 깨워달라"</b> 만 서버에 등록하고,
              문자에는 <b>"확인하실 것이 있습니다"</b> 한 줄만 담깁니다.
              무엇이 걸렸는지는 앱을 여는 순간 이 기기가 계산합니다.</div></span></label>
        ${S.sub.noti.sms?`
          <label class="fchk"><input type="checkbox" id="n-name" ${S.sub.noti.name?'checked':''}>
            <span>문자에 <b>제도 이름까지</b> 넣어주세요
              <div class="gmeta">받자마자 무슨 건인지 알 수 있어 편합니다. 대신 그 한 줄은
                <b>서버가 보게 됩니다</b>(문자를 보내려면 내용을 알아야 하므로). 소득·신용은 그래도 안 올라갑니다.</div></span></label>
          <div class="smsprev">${S.sub.noti.name
            ? `[빠짐없이] ${L[0].n}${L.length>1?` 외 ${L.length-1}건`:''} 마감이 다가옵니다`
            : '[빠짐없이] 확인하실 것이 있습니다'}</div>
          <p class="fnote">등록하신 번호로만 발송하며, 내용은 기기에서 만들어 보냅니다.</p>`:''}
      </div>`;
    $('flow-f').innerHTML=`<button class="btn btn-sm" id="f-back">뒤로</button>
      <button class="btn btn-sm btn-fill" id="f-go">저장</button>`;
    $('flow-b').querySelectorAll('.wsel').forEach(b=>b.onclick=()=>{ S.sub.when=b.dataset.w; drawFlow(); });
    $('n-prep').onchange=e=>S.sub.noti.prep=e.target.checked;
    $('n-due').onchange=e=>S.sub.noti.due=e.target.checked;
    $('n-sms').onchange=e=>{ S.sub.noti.sms=e.target.checked; drawFlow(); };
    const nn=$('n-name'); if(nn) nn.onchange=e=>{ S.sub.noti.name=e.target.checked; drawFlow(); };
    $('sms-copy').onclick=()=>{ const t=$('sms-body');
      try{ navigator.clipboard.writeText(t.value); }catch(e){ t.select(); document.execCommand('copy'); }
      $('sms-copy').textContent='복사했습니다'; };
    $('f-back').onclick=()=>{ S.sub.step=0; drawFlow(); };
    $('f-go').onclick=()=>{ S.sub.step=2; drawFlow(); };
    return; }

  /* ── 대리 제출 · 준비물이 모이면 접수까지 저희가 합니다 ──────────────
     경로는 세 가지이고, 무엇이 막고 있는지를 건별로 그대로 보여줍니다. */
  if(st===2){
    const rest2=need.filter(d=>!S.have[d.key]);
    $('flow-b').innerHTML=bar+`
      <p class="flead">${(()=>{ const w=L.filter(x=>!openNow(x)).length, n=L.length-w;
        if(rest2.length) return `남은 준비물 ${rest2.length}건이 채워지면 <b>그대로 제출됩니다.</b>`;
        if(w&&n) return `${n}건은 <b>지금 바로</b> 들어가고, ${w}건은 <b>공고가 열리는 날</b> 저희가 냅니다.`;
        if(w) return `아직 공고가 열리지 않았습니다. <b>열리는 날 저희가 알아서 냅니다.</b>`;
        return '<b>지금 바로 제출됩니다.</b>'; })()}
        지금 한 번만 확인해 주시면 다시 들어오실 필요가 없습니다.</p>
      <div class="fconsent" style="margin-bottom:9px">
        <div class="ch">보낼 것</div>
        ${L.map(x=>{const r=route(x), on=!S.sub.deleg.skip[x.n], W=openNow(x)?NOWB:WAIT;
          return `<label class="fchk" style="margin-top:9px">
          <input type="checkbox" class="dskip" data-n="${encodeURIComponent(x.n)}" ${on?'checked':''}>
          <span><b>${x.n}</b> <span class="tag ${W[2]}">${W[0]}</span>
            <span class="tag ${RT[r][2]}">${RT[r][0]}</span>
            <div class="gmeta">${W[1]} · ${RT[r][1]}</div></span></label>`;}).join('')}
        <p class="fnote">체크를 풀면 이번에 보내지 않고 준비물과 절차만 남겨 둡니다.</p>
      </div>
      <div class="fconsent">
        <label class="fchk"><input type="checkbox" id="d-scope" ${S.sub.deleg.scope?'checked':''}>
          <span>제 이름으로 <b>접수하는 것에 동의합니다</b>
            <div class="gmeta">서류 작성과 접수까지입니다. 내용을 바꿔야 하는 일이 생기면 반드시 다시 여쭙고,
              접수번호와 결과는 알려드립니다. 취소는 언제든 가능합니다.</div></span></label>
        <p class="fnote">제출에는 값을 받지 않습니다. 창구 접수 건은 기관 협약이 끝난 지역부터 순차로 열립니다.</p>
      </div>`;
    $('flow-f').innerHTML=`<button class="btn btn-sm" id="f-back2">뒤로</button>
      <button class="btn btn-sm btn-fill" id="f-go2">확인 ›</button>`;
    $('flow-b').querySelectorAll('.dskip').forEach(b=>b.onchange=()=>{
      S.sub.deleg.skip[decodeURIComponent(b.dataset.n)]=!b.checked; drawFlow(); });
    $('d-scope').onchange=e=>{ S.sub.deleg.scope=e.target.checked; };
    $('f-back2').onclick=()=>{ S.sub.step=1; drawFlow(); };
    $('f-go2').onclick=()=>{ S.sub.step=3; drawFlow(); };
    return; }

  const rest=need.filter(d=>!S.have[d.key]);
  $('flow-b').innerHTML=bar+`
    <p class="flead">${L.length}건을 <b>내 할 일</b>에 넣었습니다.
      ${rest.length?`남은 준비물 ${rest.length}건은 아래와 같습니다.`:'준비물은 모두 확보하신 상태입니다.'}</p>
    ${rest.length?`<div class="fconsent">
      <div class="ch">아직 챙기실 것</div>
      ${rest.map(d=>`<div class="cl">· ${d.name}${d.how?` <span style="color:var(--ink-3)">— ${d.how}</span>`:''}
        <span style="color:var(--ink-3)">(${d.item})</span></div>`).join('')}
    </div>`:''}
    <div class="fconsent" style="margin-top:8px">
      <div class="ch">예약한 알림</div>
      ${S.sub.noti.prep?`<div class="cl">· ${WHEN[S.sub.when][1]} 남은 준비물 알림</div>`:''}
      ${S.sub.noti.due?'<div class="cl">· 신청 마감과 자격 소멸 전 알림 (날짜는 공고에서 역산)</div>':''}
      ${S.sub.noti.sms?`<div class="cl">· 마감 임박 문자 · ${maskTel(me().acct.phone)}
        <span style="color:var(--ink-3)">(${S.sub.noti.name?'제도 이름 포함 · 그 한 줄은 서버가 봅니다':'서버는 날짜만 알고 내용은 모릅니다'})</span></div>`:''}
      ${!S.sub.noti.prep&&!S.sub.noti.due&&!S.sub.noti.sms?'<div class="cl">· 없음 — 알림을 모두 끄셨습니다</div>':''}
      <div class="cl" style="margin-top:5px">· 준비물이 다 모이면 <b>제출은 저희가 합니다</b> — 그때 다시 알려드립니다</div>
    </div>
    <div class="fconsent" style="margin-top:8px">
      <div class="ch">제출 예약</div>
      ${L.filter(x=>!S.sub.deleg.skip[x.n]).length
        ? L.filter(x=>!S.sub.deleg.skip[x.n]).map(x=>{const r=route(x);
            return `<div class="cl">· ${x.n} <span class="tag ${RT[r][2]}">${RT[r][0]}</span></div>`;}).join('')
        : '<div class="cl">· 없음 — 이번에는 보낼 것을 고르지 않으셨습니다</div>'}
      ${L.filter(x=>!S.sub.deleg.skip[x.n]&&!openNow(x)).length
        ? `<p class="fnote" style="margin-top:7px">공고 대기 중인 건은 <b>열리는 날 저희가 냅니다.</b> 그날 알림도 같이 갑니다.</p>`:''}
      ${L.filter(x=>S.sub.deleg.skip[x.n]).map(x=>`<div class="cl" style="color:var(--ink-3)">· ${x.n} — 이번에는 보내지 않음</div>`).join('')}
      <p class="fnote">제출이 끝나면 접수번호를 남겨 드립니다. 그 전에는 언제든 취소하실 수 있습니다.</p>
    </div>
    <p class="fnote">체크하신 준비물은 <b>이 기기에</b> 저장했습니다. 서버로 보내지 않았습니다.
      다른 기기에서도 이어서 하시려면 <b>내 정보</b>에서 암호화 백업을 켜시면 됩니다.</p>`;
  $('flow-f').innerHTML=`<button class="btn btn-sm" id="f-close2">닫기</button>
    <button class="btn btn-sm btn-fill" id="f-done">할 일로 돌아가기</button>`;
  $('f-close2').onclick=closeFlow;
  $('f-done').onclick=()=>{ closeFlow(); S.view='todo'; drawNav(); draw(); }; }

function drawFlow(){
  if(!S.sub) return;
  if(S.sub.mode==='prep') return drawPrep();
  const L=subItems(), st=S.sub.step;
  $('flow-t').textContent = st===0?`제출 확인 · ${L.length}건` : st===1?'제출 중' : '접수 완료';
  const bar=`<div class="fsteps">${[0,1,2].map(i=>`<span class="${i<=st?'on':''}"></span>`).join('')}</div>`;
  if(st===0){
    /* 어떤 정보가 어디로 가는지 · 동의는 이 목록을 보고 하는 것입니다 */
    const srcs=[...new Set(L.flatMap(x=>((x.guide&&x.guide.doc)||[])
      .filter(d=>d[1]==='auto').map(d=>d[2]||'연동')))];
    $('flow-b').innerHTML=bar+`
      <p class="flead">아래 ${L.length}건을 제출합니다.
        서류는 이미 연동으로 가져온 정보로 채워집니다 · <b>추가로 발급받으실 것은 없습니다.</b></p>
      ${L.map(x=>{const d=(x.guide&&x.guide.doc)||[];
        return `<div class="fitem">
        <div class="fn">${x.n}</div>
        <div class="fw">${subKind(x)} · ${x.where||''}</div>
        <div class="fd">서류 ${d.length}건 · ${d.map(y=>y[0]).join(' · ')||'—'}
          ${x.guide&&x.guide.time?`<br>처리 기간 ${x.guide.time}`:''}</div></div>`;}).join('')}
      <div class="fconsent">
        <div class="ch">이 정보가 아래 기관으로 나갑니다</div>
        ${srcs.map(x=>`<div class="cl">· ${x}에서 가져온 자료</div>`).join('')}
        <div class="cl" style="margin-top:5px">받는 곳 · ${[...new Set(L.map(x=>x.where||'')).values()].filter(Boolean).join(' / ')}</div>
        <label class="fchk"><input type="checkbox" id="f-agree" ${S.sub.agree?'checked':''}>
          <span>위 자료를 해당 기관에 제출하는 데 동의합니다.
            제출한 서류 목록은 <b>내 정보</b>에 남고, 언제든 철회하실 수 있습니다.</span></label>
        <p class="fnote">이 자료는 <b>이 기기에서 기관으로 바로</b> 갑니다. 저희 서버에 사본을 남기지 않습니다.
          서버가 아는 것은 계정(이메일·전화번호)과 제도 규칙뿐입니다.<br>
          저희는 이 제출로 어떤 수수료도 받지 않습니다. 성공보수도 없습니다. 제3자가 대신 접수하지 않습니다.</p>
      </div>`;
    $('flow-f').innerHTML=`<button class="btn btn-sm" id="f-cancel">취소</button>
      <button class="btn btn-sm btn-fill" id="f-go" ${S.sub.agree?'':'disabled style="opacity:.45"'}>제출 시작</button>`;
    $('f-agree').onchange=e=>{ S.sub.agree=e.target.checked; drawFlow(); };
    $('f-cancel').onclick=closeFlow;
    if(S.sub.agree) $('f-go').onclick=()=>{ S.sub.step=1; S.sub.i=0; S.sub.ph=0; drawFlow(); runSubmit(); };
    return; }
  if(st===1){
    $('flow-b').innerHTML=bar+`
      <p class="flead">기관마다 접수 경로가 달라 한 건씩 보냅니다. 창을 닫으셔도 계속 진행됩니다.</p>
      ${L.map((x,i)=>{const done=i<S.sub.i, run=i===S.sub.i;
        return `<div class="fitem ${done?'ok':run?'run':'wait'}">
        <div class="fn">${x.n}</div>
        <div class="fw">${subKind(x)} · ${x.where||''}</div>
        <div class="fst">${done?'✓ 접수 완료' : run?`${SUBST[S.sub.ph][0]} · ${SUBST[S.sub.ph][1]}` : '대기'}</div></div>`;}).join('')}`;
    $('flow-f').innerHTML=`<span style="font-size:12.5px;color:var(--ink-2);margin-right:auto">
      ${S.sub.i} / ${L.length}건 접수</span>`;
    return; }
  /* 완료 */
  const stamp=new Date();
  $('flow-b').innerHTML=bar+`
    <p class="flead">${L.length}건 접수했습니다. <b>여기서 끝이 아닙니다</b> — 아래 일정이 남아 있고,
      각 단계마다 알려드립니다.</p>
    ${L.map((x,i)=>`<div class="fitem ok">
      <div class="fn">${x.n}</div>
      <div class="fw">${subKind(x)} · ${x.where||''}</div>
      <div class="fd frcpt">접수번호 ${stamp.getFullYear()}${String(stamp.getMonth()+1).padStart(2,'0')}${String(stamp.getDate()).padStart(2,'0')}-${String(1037+i*13)}<br>
        <span style="font-family:inherit">${x.guide&&x.guide.time?`처리 기간 ${x.guide.time}`:'처리 기간 미확인'}</span></div></div>`).join('')}
    <div class="fconsent" style="margin-top:4px">
      <div class="ch">다음에 오는 일</div>
      <div class="cl">① 기관 심사 · 보완 요청이 오면 무엇을 더 내야 하는지 정리해 알려드립니다</div>
      <div class="cl">② 결과 통지 · 승인이든 반려든 이유와 함께 알려드립니다</div>
      <div class="cl">③ 반려된 경우 · 요건 중 무엇이 걸렸는지 판정에 반영하고 다음 회차 일정을 잡아둡니다</div>
      <div class="cl">④ 사후관리 · 이 지원을 받은 뒤 생기는 의무(사업비 정산 · 유지 조건)를 기한 전에 알려드립니다</div>
      <p class="fnote">접수번호는 기관이 발급한 번호가 그대로 들어옵니다. 기관별 처리 현황은 자동으로 갱신됩니다.</p>
    </div>`;
  $('flow-f').innerHTML=`<button class="btn btn-sm" id="f-close2">닫기</button>
    <button class="btn btn-sm btn-fill" id="f-done">할 일로 돌아가기</button>`;
  $('f-close2').onclick=closeFlow;
  $('f-done').onclick=()=>{ closeFlow(); S.view='todo'; drawNav(); draw(); }; }
function runSubmit(){
  const L=subItems();
  const tick=()=>{ if(!S.sub||S.sub.step!==1) return;
    if(S.sub.i>=L.length){ S.sub.step=2; drawFlow(); return; }
    S.sub.ph++;
    if(S.sub.ph>=SUBST.length){ S.sub.ph=0; S.sub.i++; }
    drawFlow(); setTimeout(tick, 900); };
  setTimeout(tick, 900); }
$('flow-x').onclick=closeFlow;
$('flow').onclick=e=>{ if(e.target.id==='flow') closeFlow(); };

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

  /* 판정 다음 · 누가 하는가 */
  const byAg={auto:[],one:[],self:[],expert:[]};
  ok.forEach(x=>byAg[agency(x)].push(x));
  /* 손이 덜 가는 것부터 · 창구 방문이 있으면 뒤로 */
  const load=r=>((r.guide&&r.guide.doc)||[]).filter(x=>x[1]!=='auto').length
    + (r.visit&&r.visit!=='online'&&r.visit!=='company'?10:0);
  Object.values(byAg).forEach(L=>L.sort((x,y)=>load(x)-load(y)));
  const docChips=r=>{ const d=(r.guide&&r.guide.doc)||[];
    const need=d.filter(x=>x[1]!=='auto');
    if(!d.length) return '<span class="agn">준비물을 아직 정리하지 않았습니다</span>';
    if(!need.length) return `<span class="agn ok">서류 ${d.length}건 전부 연동으로 채워집니다</span>`;
    const issue=need.filter(x=>x[1]==='issue').length;
    return `<span class="agn">연동 ${d.length-need.length}건 자동 · 직접 ${need.length}건`
      +(issue?` (발급 필요 ${issue}건)`:'')+` · ${need.map(x=>x[0]).join(' · ')}</span>`; };

  return `
  <h2 class="sec" style="margin-top:0">판정 다음 · 누가 하는지 먼저 나눕니다</h2>
  <p style="font-size:13px;color:var(--ink-2);line-height:1.6;margin-bottom:10px">
    받을 수 있다는 것을 아는 것과 실제로 받는 것은 다른 일입니다.
    가능 ${ok.length}건을 <b>앱이 끝내는 것 · 준비물만 챙기시면 되는 것 · 사람 손이 필요한 것</b>으로 나눴습니다.</p>
  ${['auto','one','self','expert'].filter(k=>byAg[k].length).map(k=>{
    const A=AGY[k], L=byAg[k];
    const has=L.some(x=>x.n===S.item);
    /* 특정 항목을 보러 온 상태면 그 묶음만 엽니다 — 목표가 화면 위로 올라옵니다 */
    const op = S.item ? has : (k==='auto'||k==='one');
    return `<details class="acc" ${op?'open':''}>
      <summary><div><div class="ttl">${A[0]}</div><div class="meta">${A[1]}</div></div>
        <div class="rt"><span class="tag ${A[2]}">${L.length}건</span>
          <span class="chev">›</span></div></summary>
      ${L.map(x=>{const op=S.item===x.n, ky=encodeURIComponent(x.n);
        return `<div class="ritem r-${op?'ok':'plain'}">
        <button class="lrow thead" data-i="${ky}">
        <div><div class="t">${x.n}<span class="ichev">${op?'닫기':'준비물'}</span></div>
          <div class="d">${x.where||''}</div>
          ${docChips(x)}</div>
        <div class="r">${x.amt?`<b>${x.amt}</b>`:''}</div></button>
        ${op?stepBlock(x):''}</div>`;}).join('')}
      ${k==='auto'||k==='one'?`<div class="lrow"><div><div class="d">
        ${k==='auto'?'연동으로 채워지는 서류만 쓰는 항목입니다.':'빠진 한 가지를 넣으시면 나머지는 저희가 채웁니다.'}
        제출 시점과 결과는 알림으로 알려드립니다.</div></div>
        <div class="r"><button class="btn btn-sm btn-fill subgo" data-n="${encodeURIComponent(L.map(x=>x.n).join('|'))}">${L.length}건 ${k==='auto'?'한 번에 제출':'채우고 제출'}</button></div></div>`:''}
      ${k==='self'?`<div class="lrow"><div><div class="d">
        발급받아야 하는 서류가 있어 오늘 끝나지 않습니다. 무엇을 챙겨야 하는지 정리하고,
        준비되면 다시 알려드립니다.</div></div>
        <div class="r"><button class="btn btn-sm btn-fill prepgo" data-n="${encodeURIComponent(L.map(x=>x.n).join('|'))}">${L.length}건 준비하고 맡기기</button></div></div>`:''}
      ${k==='expert'?`<div class="lrow"><div><div class="d">
        초안 작성까지는 서비스가 합니다. 받아보신 뒤 손봐야겠다고 판단하실 때만 검수를 고르시면 됩니다.
        <b>정책자금은 이 목록에 넣지 않습니다</b> — 심사 대상이 자격 요건이라 글을 고쳐서 바뀌는 것이 없기 때문입니다.</div></div>
        <div class="r"><button class="btn btn-sm" id="expert-go2">전문가 연결</button></div></div>`:''}
    </details>`;}).join('')}
  <div style="height:18px"></div>
`+`
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

  ${(()=>{const V=['center','bank','office','company'].filter(v=>byVisit[v]&&byVisit[v].length);
    if(!V.length) return '';
    return `<h2 class="sec">같은 곳에 갈 때 함께 · 재방문을 줄입니다</h2>
  <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:8px">
    위 목록을 <b>가야 하는 곳</b> 기준으로 다시 묶었습니다. 온라인으로 끝나는 건은 여기 없습니다.</p>`;})()}
  ${['center','bank','office','company'].filter(v=>byVisit[v]&&byVisit[v].length).map(v=>`
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
    주민센터나 은행에 한 번 갈 때 같은 묶음의 항목을 함께 처리하시면 재방문을 줄일 수 있습니다.
    준비물은 위 목록에서 항목을 누르시면 나옵니다.</p>

`;
}

function runBlock(R){
  const paid=R.paid?`
  <div class="card pad">
    <p style="font-size:14px;line-height:1.7">판정과 서류 준비, 초안 작성, 제출 안내, 사후관리는 <b>전부 무료입니다.</b>
      다만 이 영역은 심사위원이 글을 읽고 점수를 매기는 자리라, 그 분야를 아는 사람이 쓰면 결과가 달라집니다.</p>
    ${!S.expert?`<button class="btn btn-sm" id="expert-go" style="margin-top:10px">전문가 광고 보기</button>`:`
    <p style="font-size:13px;color:var(--ink-2);line-height:1.7;margin-top:9px">
      저희는 <b>대신 써드리지도, 전문가를 섭외하지도 않습니다.</b> 아래는 광고입니다.
      정액 광고료만 받고 성공보수도 연결 수수료도 받지 않으므로, 맡기시든 아니든 저희 수입은 같습니다.</p>
    <div class="grid3" style="margin-top:11px">
      ${[['사업계획서','창업패키지 · 청년창업사관학교 심사 경험'],
         ['R&D 과제계획서','창업성장 R&D · 디딤돌 과제 작성'],
         ['특허 명세서','변리사 · 출원 전 선행조사 포함']]
        .map(x=>`<div class="card pad">
          <span class="tag t-mute" style="margin-bottom:4px">광고</span>
          <div style="font-size:13.5px;font-weight:600">${x[0]}</div>
          <div style="font-size:12.5px;color:var(--ink-2);line-height:1.5;margin-top:3px">${x[1]}</div>
          <div style="font-size:12px;color:var(--ink-3);margin-top:6px">요금은 각 전문가가 직접 안내합니다</div>
        </div>`).join('')}</div>
    <p style="font-size:12.5px;color:var(--ink-2);margin-top:10px">
      혼자 하실 수 있는 방법을 먼저 안내드린 뒤에 보여드립니다. 광고를 누르지 않아도 신청은 끝까지 진행됩니다.
      <button class="btn btn-sm" id="expert-close" style="margin-left:4px">닫기</button></p>`}</div>`
  :`<div class="notice n-stop">
    <h3>이 영역에는 전문가 광고를 두지 않습니다</h3>
    <p>심사 대상이 자격 요건이라 글을 고쳐서 바뀌는 것이 없기 때문입니다.
       정책자금은 보증료 외에 어떤 비용도 들지 않습니다.
       중소벤처기업부는 2026년 1월 제3자 부당개입 대응세트를 내놨습니다. 신고포상 건당 최대 200만원, 불이익 행위 과태료 300만원 이하, 정책자금 컨설팅 등록제 법제화가 함께 추진되고 있습니다.
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

  <h2 class="sec">계정 · 서버에 있는 것</h2>
  <div class="ledger">
    <div class="lrow"><div><div class="t">이메일</div>
      <div class="d">로그인과 결과 통지에 씁니다</div></div>
      <div class="r"><b>${maskMail(c.acct.email)}</b></div></div>
    <div class="lrow"><div><div class="t">휴대전화</div>
      <div class="d">마감 임박 문자와 본인 확인에 씁니다</div></div>
      <div class="r"><b>${maskTel(c.acct.phone)}</b></div></div>
    <div class="lrow"><div><div class="t">가입일</div>
      <div class="d">계정 식별자 · 연결한 기기 목록</div></div>
      <div class="r"><b>${c.acct.joined}</b></div></div>
  </div>
  <p style="font-size:12.5px;color:var(--ink-2);line-height:1.6;margin:7px 0 0">
    이 세 가지가 서버에 있는 개인정보의 전부입니다.
    연락할 수단이 없으면 마감 전에 알려드릴 방법도 없습니다.</p>

  <h2 class="sec">판정 데이터 · 이 기기에만 있는 것</h2>
  <div class="card pad">
    <div class="whererow"><span class="tag t-logic">이 기기</span>
      <div><b>당신이 어떤 상태인지 말해주는 정보</b><br>
        <span class="wsub">소득 · 신용점수 · 연체 · 상환 부담 · 가족 관계 · 자녀 ·
          사업자등록 · 매출 · 업종 · 주거와 보증금 · 미수령액 · 건강 관련 항목 ·
          답하신 계획 · 체크한 준비물</span></div></div>
    <div class="whererow"><span class="tag t-mute">서버</span>
      <div><b>제도 규칙과 공고</b><br>
        <span class="wsub">${RULE_COUNT}건의 요건과 금액, 출처 ${SRC_KEYS.length}개.
          누구에게나 같은 내용이라 개인정보가 아닙니다.</span></div></div>
    <p style="font-size:12.5px;color:var(--ink-2);line-height:1.65;margin-top:10px">
      판정은 규칙을 내려받아 <b>기기 안에서</b> 계산합니다.
      그래서 서버는 <b>당신이 누구인지는 알아도, 어떤 상태인지는 모릅니다.</b>
      소득이 얼마인지 · 연체가 있는지 · 무엇에 해당하는지는 올라가지 않습니다.<br>
      ${LSOK?`이 기기에 마지막으로 저장된 시각은 <b>${lsWhen()||'아직 없음'}</b>입니다.`
        :'<b style="color:var(--warn)">이 브라우저가 저장을 막고 있어 새로고침하면 사라집니다.</b> (시크릿 모드이거나 사이트 데이터가 차단된 경우입니다)'}</p>
    <label class="fchk" style="margin-top:11px"><input type="checkbox" id="me-bak" ${S.backup?'checked':''}>
      <span>다른 기기에서도 쓰도록 <b>암호화 백업</b>을 켭니다
        <div class="gmeta">기기에서 잠근 뒤 올리기 때문에 서버는 열어볼 수 없습니다.
          비밀번호를 잃어버리면 <b>저희도 복구해 드릴 수 없습니다</b> — 그게 열어볼 수 없다는 말의 뜻입니다.
          끄면 이 기기를 떠나지 않습니다.</div></span></label>
    <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:11px">
      <button class="btn btn-sm" id="me-wipe">이 기기에서 지우기</button>
      <button class="btn btn-sm">파일로 내려받기</button></div>
  </div>

  <h2 class="sec">알림은 어떻게 보내나</h2>
  <div class="card pad">
    <p style="font-size:13.5px;line-height:1.7">
      서버는 무엇이 마감인지 모릅니다. 그래서 <b>기기가 미리 "언제 깨워달라" 만 등록</b>합니다.
      그 날짜가 되면 서버는 <b>"확인하실 것이 있습니다"</b> 한 줄만 보내고,
      무엇이 걸렸는지는 앱을 여는 순간 <b>기기가 계산해서</b> 보여드립니다.</p>
    <p style="font-size:12.5px;color:var(--ink-2);line-height:1.65;margin-top:8px">
      제도 이름까지 문자에 넣기를 원하시면 그 문구는 기기가 만들어 서버에 맡기게 되고,
      그때는 <b>서버가 그 한 줄을 보게 됩니다.</b> 그건 켜실 때 따로 여쭤봅니다.</p>
  </div>

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
  main.querySelectorAll('.qopt').forEach(b=>b.onclick=()=>{ S.ans[b.dataset.k]=b.dataset.v; lsSave(); draw(); });
  const r=$('re-q'); if(r) r.onclick=()=>{ S.ans={}; lsSave(); draw(); };
  main.querySelectorAll('.acc').forEach(d=>d.addEventListener('toggle',()=>{
    if(d.dataset.k) S.sec[d.dataset.k]=d.open; }));
  /* 펼침은 화면 안에서 일어나는 일이라 스크롤 위치를 유지합니다 */
  const keep=fn=>{ const y=window.scrollY; fn(); draw(); window.scrollTo(0,y); };
  /* 펼치면 내용이 아래로 길어집니다. 접을 때는 자리를 지키고,
     펼칠 때는 그 항목이 화면 위쪽에 오도록 따라갑니다. */
  main.querySelectorAll('.ihead,.thead').forEach(b=>b.onclick=()=>{
    const n=decodeURIComponent(b.dataset.i), opening = S.item!==n;
    if(!opening){ keep(()=>{ S.item=null; }); return; }
    const y=window.scrollY; S.item=n; draw(); window.scrollTo(0,y);
    afterPaint(()=>{ const el=main.querySelector('[data-i="'+b.dataset.i+'"]');
      if(!el) return; const r=el.getBoundingClientRect();
      const top=parseFloat(getComputedStyle(el).scrollMarginTop)||0;
      /* 이미 화면 위쪽(헤더 바로 아래)에 있으면 굳이 움직이지 않습니다 */
      if(r.top<top-4 || r.top>window.innerHeight*0.45)
        try{ el.scrollIntoView({behavior:'instant', block:'start'}); }catch(e){ el.scrollIntoView(true); } }); });
  /* 화면 사이 이동 · 내용을 복사하지 않고 그쪽으로 보냅니다 */
  main.querySelectorAll('.gotostep').forEach(b=>b.onclick=()=>
    jumpTo('todo', decodeURIComponent(b.dataset.i)));
  /* 행 안의 '준비물 ›' · 부모(자세히) 열림을 막고 바로 할 일로 보냅니다 */
  main.querySelectorAll('.goc').forEach(b=>b.onclick=e=>{ e.stopPropagation();
    jumpTo('todo', decodeURIComponent(b.dataset.i)); });
  main.querySelectorAll('.gotowhy').forEach(b=>b.onclick=()=>
    jumpTo('check', decodeURIComponent(b.dataset.i)));
  main.querySelectorAll('.typebtn').forEach(b=>b.onclick=()=>{
    const opening = S.type!==b.dataset.t;
    const y=window.scrollY; S.type = opening ? b.dataset.t : null; draw(); window.scrollTo(0,y);
    if(!opening) return;
    afterPaint(()=>{ const el=main.querySelector('.typebtn[data-t="'+b.dataset.t+'"]');
      if(!el) return; const r=el.getBoundingClientRect();
      if(r.top<128 || r.top>window.innerHeight*0.45)
        try{ el.scrollIntoView({behavior:'instant', block:'start'}); }catch(e){ el.scrollIntoView(true); } }); });
  main.querySelectorAll('#expert-go,#expert-go2,#expert-go3').forEach(x=>x.onclick=()=>{
    S.expert=true; draw();
    setTimeout(()=>$('expert-close')?.scrollIntoView({behavior:'smooth',block:'center'}),40); });
  const xc=$('expert-close'); if(xc) xc.onclick=()=>keep(()=>{ S.expert=false; });
  main.querySelectorAll('.jump').forEach(b=>b.onclick=()=>{
    const k=b.dataset.k; S.tab='sector'; S.sec={}; S.sec[k]=true; draw();
    afterPaint(()=>{ const el=$('sec-'+k); if(el){ el.scrollIntoView({block:'start'}); flash(el); } }); });
  main.querySelectorAll('.ask-sample').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i; if(!S.asked.includes(i)) S.asked.push(i); draw(); });
  const ag=$('ask-go'); if(ag) ag.onclick=()=>{ if(!S.asked.includes(0)) S.asked.push(0); draw(); };
  const wp=$('me-wipe'); if(wp) wp.onclick=()=>{ lsWipe(); PID='d'; stage('landing'); };
  main.querySelectorAll('.segb').forEach(b=>b.onclick=()=>keep(()=>{ S.tab=b.dataset.tab; }));
  const bk=$('me-bak'); if(bk) bk.onchange=e=>{ S.backup=e.target.checked; lsSave(); draw(); };
  main.querySelectorAll('.subgo').forEach(b=>b.onclick=()=>
    openFlow(decodeURIComponent(b.dataset.n).split('|')));
  main.querySelectorAll('.prepgo').forEach(b=>b.onclick=()=>
    openPrep(decodeURIComponent(b.dataset.n).split('|'))); }

/* 이 기기에 남아 있던 것을 되살립니다 · 서버에서 가져오는 것이 아닙니다 */
(function(){ const d=lsLoad(); if(!d) return;
  if(d.mine) MINE=d.mine;
  if(d.ans) S.ans=d.ans;
  if(d.have) S.have=d.have;
  if(d.phone) S.phone=d.phone;
  if(d.backup) S.backup=d.backup;
  if(d.pid && (CTX[d.pid]||(d.pid==='me'&&MINE))) PID=d.pid; })();

stage('landing');
