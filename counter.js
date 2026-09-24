/* ═══════════ 창구 모드 · 행정복지센터 담당자가 방문 시민을 조회·신청 ═══════════
   인증까지는 이 파일, 연결·대조는 app.js 의 온보딩(runConnect·runScan)을 그대로 씁니다.
   판정 결과는 judgeAll() 로 그 자리에서 뽑습니다 — 시민용과 같은 엔진입니다. */
window.Counter=(function(){
const VIS=[['f','hbs','기초연금 문의로 방문'],['b','ksy','어린이집 보육료 문의'],['h','ygr','월세 지원 문의']];
const REGION='서울 동대문구', ORIG={};
let D={p:{},ddm:70,seoul:967};
function enterRegion(){ VIS.forEach(([pid])=>{ if(!(pid in ORIG)) ORIG[pid]=CTX[pid].region; CTX[pid].region=REGION; }); }
function leaveRegion(){ Object.entries(ORIG).forEach(([pid,r])=>{ CTX[pid].region=r; }); }
function buildData(){ const keep=PID, L=(window.LOCAL_BY||{})['서울']||[];
  D={p:{}, seoul:L.length||967, ddm:L.filter(r=>(r.where||'').includes('동대문구')).length||70};
  for(const [pid,al,visit] of VIS){ const c0=CTX[pid]; PID=pid; const J=judgeAll(); const rows=[], chk={}, chkRows=[];
    for(const s of J) for(const r of s.res){
      if(r.s==='chk'){ chk[s.k]=(chk[s.k]||0)+1;
        const gap=/분류돼 있지 않|확정하지 못했|코드로 등록돼 있지 않|찾지 못했/.test(r.why||'');
        chkRows.push({g:gap?'gap':'chk', from:s.k==='local'?'local':s.k==='nat'?'nat':'core', sn:s.n, n:r.n, s:'chk', a:String(r.amt||'').replace(/\|\|/g,' · '),
          w:r.why||'', wh:String(r.where||'').replace(/\|\|/g,' · '), l:(r.chk&&r.chk.lvl)||'', src:(r.chk&&(r.chk.t||r.chk.src))||'',
          d:(r.chk&&r.chk.d)||'', u:(r.chk&&r.chk.u)||'', x:(r.guide&&r.guide.what)||'', tm:(r.guide&&r.guide.time)||'', v:r.visit||'', y:0, o:0});
        continue; }
      if(r.s!=='ok' && r.s!=='lost') continue;
      const g=s.k==='local'?'local':s.k==='nat'?'nat':'core', cl=String;
      rows.push({g, sn:s.n, n:r.n, s:r.s, a:cl(r.amt||'').replace(/\|\|/g,' · '), w:r.why||'', wh:cl(r.where||'').replace(/\|\|/g,' · '),
        l:(r.chk&&r.chk.lvl)||'', src:(r.chk&&(r.chk.t||r.chk.src))||'', d:(r.chk&&r.chk.d)||'', u:(r.chk&&r.chk.u)||'',
        x:(r.guide&&r.guide.what)||'', tm:(r.guide&&r.guide.time)||'', v:r.visit||'',
        doc:(r.guide&&r.guide.doc)||[], how:(r.guide&&r.guide.how)||[], wn:(r.guide&&r.guide.warn)||'', t:r.type||'cash',
        y:(r.s==='ok'&&r.mv&&r.mv.y)||0, o:(r.s==='ok'&&r.mv&&r.mv.once)||0}); }
    D.p[al]={pid, name:c0.name, age:c0.age, sub:c0.sub, inc:c0.home.incomeRate, visit, rows, chk, chkRows}; }
  PID=keep; }

const K={view:'home',p:null,tab:'core',open:null,sel:new Set(),more:{},step:0,done:{},f:{name:'',birth:'',phone:'',reason:''},typed:false,ex:false};
const ROOT=document.getElementById('counter'); const $=id=>ROOT.querySelector('#'+id);
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const won=v=>v>=10000?(v/10000).toFixed(v%10000?1:0)+'억':Math.round(v).toLocaleString()+'만';
function toast(t){const e=$('ct-toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),1800);}
function go(v){K.view=v;draw();window.scrollTo(0,0);}
$('ct-desk').onclick=()=>{$('ct-desk').classList.add('on');$('ct-dash').classList.remove('on');go(K.p?'result':'home');};
$('ct-dash').onclick=()=>{$('ct-dash').classList.add('on');$('ct-desk').classList.remove('on');go('dash');};

/* 창구에서 신청을 받으면 제도마다 들어가는 길이 셋입니다 */
function route(r, x){
  if(x && missing(x).length) return ['hold','서류 보완 후 접수','시민 제출 서류가 빠져 있어 신청서만 먼저 만들어 두고, 서류를 받으면 접수합니다'];
  if(r.l==='api') return ['pass','담당 부서로 전달','담당 부서가 자격을 한 번 더 보고 연락합니다'];
  if(r.v==='center') return ['here','이 창구에서 바로 접수','행정복지센터가 받는 제도라 지금 접수됩니다'];
  if(r.v==='online') return ['online','온라인으로 대신 제출','시민 명의로 전자 제출합니다'];
  return ['pass','담당 기관으로 전달','방문이 필요한 기관이라 신청서를 먼저 보내고 방문 일정을 잡아 드립니다']; }
const RT={here:'t-ok',online:'t-go',pass:'t-warn',hold:'t-stop'};
/* 준비물 한 줄을 창구 기준으로 나눕니다.
   발급 서류는 행정복지센터에서 그 자리에서 뗄 수 있다는 게 창구의 장점입니다 */
function docKind(d){ const [name,kind]=d;
  if(kind==='auto') return ['auto','자동','t-go','연동으로 채웁니다'];
  if(/신분증/.test(name)) return ['id','신분증','t-mute','창구에서 확인'];
  if(/본인\s*인증|간편인증|동의서|동의$|계좌번호|본인 명의 계좌|통장 사본/.test(name)) return ['auto','자동','t-go','인증·연동으로 처리'];
  if(kind==='issue' && !/카드|계좌 개설|통장 개설|청약/.test(name)) return ['issue','창구 발급','t-ok','이 센터에서 바로 발급'];
  return ['self','시민 제출','t-warn','시민이 준비'];}
function docsOf(x){ return (x.r.doc||[]).map((d,j)=>({d, j, k:x.k+'|'+j, K:docKind(d)})); }
function missing(x){ return docsOf(x).filter(o=>(o.K[0]==='self'||o.K[0]==='id') && !(K.docs||{})[o.k]); }
function selItems(){ return [...K.sel].map(k=>{const [pk,g,i]=k.split(':'); return {k, r:D.p[pk].rows[+i]};}); }
function rcpt(k,i){ const d=new Date(); const n=String(1000+((k.length*37+i*113)%9000));
  return `DDM-${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${n}`; }

function apply(){ const p=D.p[K.p], L=selItems();
  const G={here:[],online:[],pass:[]}; L.forEach(x=>G[route(x.r)[0]].push(x));
  const head=`<div class="noprint" style="display:flex;gap:10px;margin-bottom:14px;align-items:center"><button id="ap-back">‹ 결과로</button>
    <div style="margin-left:auto;display:flex;gap:6px">${['확인','서명','제출','완료'].map((t,i)=>`<span class="tag ${i<=K.step?'t-go':'t-mute'}">${i+1} ${t}</span>`).join('')}</div></div>`;
  if(K.step===0){ const all=L.flatMap(docsOf), cnt=t=>all.filter(o=>o.K[0]===t).length, miss=L.filter(x=>missing(x).length).length;
   return head+`<h1>${esc(K.f.name||p.name)} 님 · 그 자리에서 신청</h1>
    <p class="sub">체크하신 ${L.length}건의 준비물과 절차입니다. 시민 제출 항목이 있는지 보고 <b>확인</b>에 체크하세요.</p>
    <div class="card" style="margin-top:14px;padding:14px 18px;display:flex;gap:18px;flex-wrap:wrap;align-items:center;font-size:14px">
     <b>준비물 ${all.length}건</b>
     <span><span class="tag t-go">자동</span> ${cnt('auto')}</span><span><span class="tag t-ok">창구 발급</span> ${cnt('issue')}</span>
     <span><span class="tag t-mute">신분증</span> ${cnt('id')}</span><span><span class="tag t-warn">시민 제출</span> ${cnt('self')}</span>
     ${miss?`<span style="margin-left:auto;color:var(--stop);font-weight:700">서류가 빠진 제도 ${miss}건 · 보완 후 접수로 넘어갑니다</span>`:`<span style="margin-left:auto;color:var(--ok);font-weight:700">빠진 서류 없음</span>`}</div>
    ${L.map(x=>{ const R=route(x.r,x), D=docsOf(x);
     return `<div class="card apc" style="margin-top:12px">
      <div class="aph"><b style="font-size:16px">${esc(x.r.n)}</b><span class="tag ${RT[R[0]]}">${R[1]}</span><span class="ra" style="margin-left:auto">${esc(x.r.a||'')}</span></div>
      <div class="apb">
       <div><div class="gh">준비물</div>${D.length?D.map(o=>`<div class="apd">
         <span class="tag ${o.K[2]}">${o.K[1]}</span><span class="an"><b>${esc(o.d[0])}</b>${o.d[2]?` <span class="am">${esc(o.d[2])}</span>`:''}<br><span class="am">${o.K[3]}</span></span>
         ${o.K[0]==='self'||o.K[0]==='id'?`<label class="got"><input type="checkbox" data-dk="${esc(o.k)}" ${(K.docs||{})[o.k]?'checked':''}> 확인</label>`:''}</div>`).join('')
         :'<div class="am">따로 낼 서류가 없습니다</div>'}</div>
       <div><div class="gh">절차</div>${(x.r.how||[]).length?`<ol class="aps">${x.r.how.map(h=>`<li>${esc(h)}</li>`).join('')}</ol>`:'<div class="am">신청서 제출 후 담당 부서가 안내합니다</div>'}
        ${x.r.tm?`<div class="am" style="margin-top:8px">처리 기간 · ${esc(x.r.tm)}</div>`:''}</div>
      </div>
      ${x.r.wn?`<div class="apw">${esc(x.r.wn)}</div>`:''}
      <div class="am" style="margin-top:8px">${R[2]}${x.r.wh?' · 신청처 '+esc(x.r.wh):''}</div></div>`;}).join('')}
    <div class="card" style="margin-top:14px"><label class="check" style="border:0"><input type="checkbox" id="ap-ok"><span><b>위 제도의 신청을 이 창구에 맡깁니다.</b><br>
      신청서는 시민 명의로 작성되고, 제출 전 시민이 직접 서명합니다. 서명하지 않으면 아무것도 제출되지 않습니다.</span></label>
      <button class="p" id="ap-sign" disabled style="width:100%;margin-top:6px">시민 태블릿으로 서명 요청</button></div>`; }
  if(K.step===1) return head+duo(`<h1>전자서명 대기</h1><p class="sub" id="sg-s">시민 태블릿에 신청 내용을 띄웠습니다. 시민이 확인하고 휴대폰으로 서명합니다.</p>
    <div class="card" style="margin-top:14px">${stRow('on',`신청 ${L.length}건 표시`)}<div class="st"><span class="dot load" id="sg-d"></span><span id="sg-t">시민 서명 대기</span></div></div>`,
   `<h3>이 ${L.length}건을<br>신청하시겠어요?</h3>
    ${L.map(x=>`<div class="ck" style="justify-content:space-between"><b>${esc(x.r.n)}</b><span style="color:#4E5968;font-size:14px">${esc(x.r.a||'')}</span></div>`).join('')}
    <div style="background:#F2F4F6;border-radius:14px;padding:16px;text-align:center;margin-top:14px;font-weight:700">휴대폰에서 서명 알림을 눌러 주세요</div>`);
  if(K.step===2) return head+`<h1>제출 중</h1><p class="sub">제도마다 정해진 길로 들어갑니다.</p>
    <div class="card" style="margin-top:16px">${L.map((x,i)=>`<div class="check" style="justify-content:space-between;align-items:center">
      <span><b>${esc(x.r.n)}</b><br><span class="sub" style="font-size:12.5px">${route(x.r,x)[1]}</span></span>
      <span class="tag t-mute" id="sb${i}">대기</span></div>`).join('')}</div>`;
  return head+`<h1>접수 완료</h1><p class="sub">${esc(K.f.name||p.name)} 님께 접수 결과를 문자로 보내고, 접수증을 출력해 드리세요.</p>
    <div class="card" style="margin-top:16px"><div class="scroll"><table class="low"><tr><th>제도</th><th>접수 방식</th><th>접수번호</th><th>다음 단계</th></tr>
    ${L.map((x,i)=>{const R=route(x.r,x); return `<tr><td><b>${esc(x.r.n)}</b></td><td><span class="tag ${RT[R[0]]}">${R[1]}</span></td>
      <td style="font-family:ui-monospace,Menlo,monospace;font-size:12.5px">${esc(K.done[x.k]||'')}</td>
      <td style="font-size:12.5px;color:var(--ink2)">${R[0]==='hold'?'빠진 서류: '+missing(x).map(o=>o.d[0]).join(', ')+' · 받으면 바로 접수':R[0]==='here'?'심사 후 문자 안내 (보통 2~4주)':R[0]==='online'?'기관 처리 후 문자 안내':'담당 부서가 자격 확인 후 연락'}</td></tr>`;}).join('')}</table></div></div>
    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap"><button id="ap-sms">문자로 보내기</button><button id="ap-letter">접수증 출력</button>
      <span style="margin-left:auto"></span><button class="p" id="ap-next">다음 시민</button></div>`; }

function runApply(){ const L=selItems();
  if(K.step===1){ setTimeout(()=>{ const d=$('sg-d'),t=$('sg-t'),s=$('sg-s'); if(!d) return; d.className='dot on'; t.textContent='서명 완료';
      s.textContent='간편인증으로 서명했습니다'; setTimeout(()=>{K.step=2;draw();runApply();},700); },1800); }
  if(K.step===2){ let left=L.length;
    L.forEach((x,i)=>{ const e=()=>$('sb'+i);
      setTimeout(()=>{ if(e()){e().className='tag t-warn';e().textContent='제출 중';} }, 250+i*220);
      setTimeout(()=>{ K.done[x.k]=rcpt(x.k,i); if(e()){e().className='tag t-ok';e().textContent='접수';}
        if(--left===0) setTimeout(()=>{K.step=3;draw();},600); }, 900+i*260+Math.random()*700); }); } }

/* 방문 사유 → 시연에서 불러올 예시 인물 (실제 서비스에서는 입력한 분의 정보를 그대로 가져옵니다) */
const REASONS=['기초연금','어르신 돌봄','보육료','출산·육아','월세','구직·실업','창업','기타'];
function pickDemo(f){ const r=f.reason, y=parseInt(String(f.birth).slice(0,4),10), age=y>1900?2026-y:null;
  if(/기초연금|어르신/.test(r)) return 'hbs'; if(/보육|출산/.test(r)) return 'ksy'; if(/월세|구직|창업/.test(r)) return 'ygr';
  if(age!=null) return age>=60?'hbs':age<=33?'ygr':'ksy'; return 'ksy'; }
function normBirth(v){ const d=String(v).replace(/\D/g,'');
  if(d.length===6){ const yy=+d.slice(0,2); return (yy>26?'19':'20')+d.slice(0,2)+'-'+d.slice(2,4)+'-'+d.slice(4,6); }
  if(d.length===8) return d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8); return v; }
function home(){ const f=K.f, ok=f.name.trim() && String(f.birth).replace(/\D/g,'').length>=6 && String(f.phone).replace(/\D/g,'').length>=10;
 return `<h1>새 상담</h1><p class="sub">방문하신 분의 신분증을 보고 입력하세요. 동의와 본인 인증 뒤, 이 자리에서 <b>1만여 건</b>을 한 번에 대조합니다.</p>
 <div class="grid g2" style="margin-top:16px">
  <div class="card"><h2>시민 정보</h2>
   <div class="field"><span>이름</span><input id="f-name" value="${esc(f.name)}" placeholder="홍길동" autocomplete="off"></div>
   <div class="field"><span>생년월일</span><input id="f-birth" value="${esc(f.birth)}" placeholder="580312 또는 1958-03-12" inputmode="numeric" autocomplete="off"></div>
   <div class="field"><span>휴대폰</span><input id="f-phone" value="${esc(f.phone)}" placeholder="010-0000-0000" inputmode="tel" autocomplete="off"></div>
   <p class="sub" style="font-size:12px;margin-top:6px">본인 인증에만 쓰고, 상담이 끝나면 지웁니다.</p></div>
  <div class="card"><h2>방문 사유 <span style="font-weight:500;color:var(--ink3);font-size:13px">선택</span></h2>
   <div class="prov">${REASONS.map(x=>`<button data-rs="${x}" class="${f.reason===x?'on':''}">${x}</button>`).join('')}</div>
   <p class="sub" style="font-size:12.5px">사유와 상관없이 1만여 건을 모두 대조합니다. 사유는 결과에서 관련 제도를 위로 올리는 데만 씁니다.</p>
   <button class="p" id="f-go" style="width:100%;margin-top:14px" ${ok?'':'disabled'}>동의 받기 ›</button></div>
 </div>
 <div style="margin-top:18px"><button id="ex-t" style="background:none;padding:6px 0;color:var(--go)">${K.ex?'예시 닫기':'예시로 보기 ›'}</button>
 ${K.ex?`<p class="sub" style="font-size:12.5px;margin:4px 0 10px">시연용 인물입니다. 고르시면 입력칸이 채워집니다.</p>
 <div class="grid g3">${Object.entries(D.p).map(([k,p])=>`<button class="visitor" data-k="${k}">
   <div class="n">${esc(p.name)} <span style="font-weight:600;color:var(--ink3);font-size:14px">만 ${p.age}세</span></div>
   <div class="m">${esc(p.visit)}</div><div class="r">입력칸 채우기 ›</div></button>`).join('')}</div>`:''}</div>
 <p class="sub" style="font-size:12px;margin-top:18px;color:var(--ink3)">대조 대상 · 행정안전부 공공서비스 정보 10,931건 (동대문구 ${D.ddm}건 포함) + 주요 제도 101건 · 2026-09-21 기준</p>`;}

function duo(staff,tablet){ K._tab=tablet; return staff; }

/* ── 시민 태블릿 · 담당자 화면마다 시민이 무엇을 보는지 ── */
function tabFor(){ const p=K.p&&D.p[K.p], nm=esc(K.f.name||(p&&p.name)||'');
  if(K.view==='home') return `<div class="k">회기동 행정복지센터</div><h3>어서 오세요</h3>
    <p style="color:#4E5968">담당자가 정보를 입력하고 있습니다. 잠시만 기다려 주세요.</p>
    <div class="tidle">빠짐없이</div>`;
  if(!p) return '';
  const ok=p.rows.filter(r=>r.s==='ok'), cash=r=>r.g==='core'&&r.t==='cash';
  const y=p.rows.filter(cash).reduce((a,r)=>a+(r.y||0),0), o=p.rows.filter(cash).reduce((a,r)=>a+(r.o||0),0);
  const sel=[...K.sel].map(k=>{const [pk,g,i]=k.split(':'); return D.p[pk].rows[+i];}).filter(Boolean);
  const li=L=>L.map(r=>`<div class="tli"><b>${esc(r.n)}</b><span>${esc(r.a||'')}</span></div>`).join('');
  if(K.view==='result'){
    const open=K.open&&K.open.split(':'); let cur=null;
    if(open){ const [pk,g,i]=open; cur = g==='chk'||g==='gap' ? (D.p[pk].chkRows||[])[+i] : D.p[pk].rows[+i]; }
    return `<div class="k">${nm} 님 조회 결과</div>
      <h3>받으실 수 있는 것<br><span class="tbig">${ok.length}건</span></h3>
      <div class="tsum"><div><span>해마다</span><b>${won(y)}</b></div><div><span>한 번</span><b>${won(o)}</b></div></div>
      ${cur?`<div class="tcur"><div class="k2">지금 설명 중</div><b>${esc(cur.n)}</b><div class="ta">${esc(cur.a||'')}</div>
        ${cur.x?`<p>${esc(cur.x).slice(0,140)}</p>`:''}</div>`
       : sel.length?`<div class="k2">담당자가 안내해 드린 것 ${sel.length}건</div>${li(sel)}`
       : (()=>{ const top=p.rows.filter(r=>r.g==='core'&&r.s==='ok'&&r.a).slice(0,4);
           return top.length?`<div class="k2">이런 것들이 있습니다</div>${li(top)}<p style="color:#8B95A1;font-size:14px;margin-top:10px">담당자가 하나씩 설명해 드립니다.</p>`
             :`<p style="color:#4E5968;margin-top:14px">담당자가 하나씩 설명해 드립니다.</p>`; })()}`; }
  if(K.view==='letter') return `<div class="k">안내문</div><h3>${nm} 님께 드릴<br>안내문입니다</h3>
      <div class="k2">담긴 제도 ${sel.length}건</div>${li(sel)}
      <p style="color:#4E5968;margin-top:12px">출력해 드리거나 문자로 보내 드립니다.</p>`;
  if(K.view==='apply'){ const L=selItems();
    if(K.step===0){ const miss=L.filter(x=>missing(x).length);
      return `<div class="k">신청 확인</div><h3>이 ${L.length}건을<br>신청하려고 합니다</h3>${li(L.map(x=>x.r))}
        ${miss.length?`<div class="twarn">준비하실 서류가 있습니다<br>${miss.map(x=>esc(x.r.n)+' · '+missing(x).map(o=>esc(o.d[0])).join(', ')).join('<br>')}</div>`
          :`<p style="color:#4E5968;margin-top:12px">담당자가 내용을 확인하고 있습니다.</p>`}`; }
    if(K.step===2) return `<div class="k">제출 중</div><h3>신청서를<br>보내고 있습니다</h3><p style="color:#4E5968">잠시만 기다려 주세요.</p>`;
    if(K.step===3) return `<div class="k">접수 완료</div><h3>${L.length}건이<br>접수됐습니다</h3>
      ${L.map(x=>`<div class="tli"><b>${esc(x.r.n)}</b><span style="font-family:ui-monospace,Menlo,monospace">${esc(K.done[x.k]||'')}</span></div>`).join('')}
      <button class="p big" id="t-sms" style="margin-top:16px">문자로 받기</button>
      <p style="color:#8B95A1;font-size:14px;margin-top:8px">접수번호와 다음 일정을 휴대폰으로 보내 드립니다.</p>`; }
  return ''; }
function stRow(state,txt){ return `<div class="st"><span class="dot ${state}"></span><span>${txt}</span></div>`; }

function consent(){ const f=K.f, done=!!K.agreed;
 const staff=`<h1>${esc(f.name)} 님 · 정보 조회 동의</h1>
  <p class="sub">시민 태블릿에 동의서를 띄웠습니다. 시민께서 직접 읽고 동의하시면 다음으로 넘어갑니다.</p>
  <div class="card" style="margin-top:14px">
   ${stRow('on','태블릿에 동의서 표시')}
   ${stRow(done?'on':'load', done?'시민 동의 완료':'시민이 읽는 중')}
   <div style="display:flex;gap:10px;margin-top:14px"><button id="back">취소</button>
    <button class="p" id="auth" ${done?'':'disabled'} style="flex:1">다음 · 본인 인증</button></div></div>`;
 const tab = done ? `<h3>동의해 주셔서 감사합니다</h3><p style="color:#4E5968">담당자가 다음 단계를 안내해 드립니다.</p>`
 : `<h3>${esc(f.name)} 님,<br>정보 조회에 동의해 주세요</h3>
  <p style="color:#4E5968;font-size:15px">받으실 수 있는 지원을 찾기 위해 필요합니다. 하나씩 읽고 눌러 주세요.</p>
  ${[['무엇을 위해','받으실 수 있는 정부·구청 지원을 찾으려고 조회합니다.'],
     ['무엇을 보나요','소득과 재산, 가족, 건강보험, 고용보험, 사업자 여부, 신용 상태'],
     ['어떻게 보관하나요','상담이 끝나면 지웁니다. 누가 언제 봤는지만 기록에 남습니다.']]
    .map(x=>`<label class="ck"><input type="checkbox" class="cc"><span><b>${x[0]}</b><br>${x[1]}</span></label>`).join('')}
  <button class="p big" id="t-agree" disabled>동의합니다</button>`;
 return duo(staff,tab); }

/* ── 본인 인증 · 창구 담당자가 시민 정보를 넣고, 시민이 자기 휴대폰으로 승인합니다 ── */
const PROV=['카카오톡','PASS','네이버','토스','KB국민인증서'];
function auth(){ const f=K.f, ph=String(f.phone).replace(/\D/g,''), mb=ph.length>=10?ph.slice(0,3)+'-****-'+ph.slice(-4):f.phone;
 const st = !K.sent ? stRow('load','시민이 인증 방식을 고르는 중')
   : K.am==='easy' ? stRow('load',`${K.prov}로 인증 요청 · 시민 휴대폰에서 승인 대기`)
   : stRow('load','인증번호 문자 발송 · 시민이 태블릿에 입력하는 중');
 const staff=`<h1>${esc(f.name)} 님 · 본인 인증</h1>
  <p class="sub">인증은 시민이 태블릿과 본인 휴대폰으로 직접 합니다. 담당자는 번호를 듣거나 대신 넣지 않습니다.</p>
  <div class="card" style="margin-top:14px"><h2>인증할 분</h2>
   <div class="field"><span>이름</span><b>${esc(f.name)}</b></div>
   <div class="field"><span>생년월일</span><b>${esc(normBirth(f.birth))}</b></div>
   <div class="field"><span>휴대폰</span><b>${esc(mb)}</b></div>
   <button id="au-edit" style="margin-top:8px">정보 고치기</button></div>
  <div class="card" style="margin-top:12px">${stRow('on','동의 완료')}${st}
   <p class="sub" style="font-size:12px;margin-top:8px">시연용 인증번호 <b>482913</b></p></div>`;
 const tab = `<h3>본인 인증</h3><p style="color:#4E5968;font-size:15px">편한 방법을 골라 주세요.</p>
  <div class="seg" style="display:inline-flex;margin:6px 0 4px"><button data-am="easy" class="${K.am==='easy'?'on':''}">인증 앱</button><button data-am="otp" class="${K.am==='otp'?'on':''}">문자 인증번호</button></div>
  ${K.am==='easy'?`
   <div class="prov">${PROV.map(x=>`<button data-pv="${x}" class="${K.prov===x?'on':''}">${x}</button>`).join('')}</div>
   ${!K.sent?`<button class="p big" id="au-send">${K.prov}로 인증하기</button>`
    :`<div style="background:#F2F4F6;border-radius:14px;padding:22px;text-align:center;margin-top:12px"><span class="dot load" id="au-d" style="display:inline-block;width:14px;height:14px"></span>
      <div style="font-weight:800;margin-top:10px;font-size:17px" id="au-t">휴대폰에서 ${K.prov} 알림을 눌러 주세요</div>
      <div style="color:#8B95A1;font-size:14px;margin-top:4px">남은 시간 <b id="au-c">2:59</b></div></div>`}`
  :`${!K.sent?`<p style="color:#4E5968;font-size:15px;margin:12px 0">휴대폰 ${esc(mb)}로 6자리 번호를 보내 드립니다.</p>
     <button class="p big" id="au-send">인증번호 받기</button>`
    :`<p style="color:#4E5968;font-size:15px;margin:12px 0">문자로 받으신 번호를 넣어 주세요. 남은 시간 <b id="au-c">2:59</b></p>
     <input class="otp" id="au-otp" inputmode="numeric" maxlength="6" placeholder="······" autocomplete="one-time-code">
     <button class="p big" id="au-ok">확인</button>
     <button id="au-re" style="width:100%;margin-top:8px;background:#F2F4F6">번호 다시 받기</button>
     <div id="au-err" style="color:#E5343D;font-size:14px;margin-top:8px"></div>`}`}`;
 return duo(staff,tab); }
function countdown(){ clearInterval(K.cd); let s=179; K.cd=setInterval(()=>{ const e=$('au-c'); if(!e){clearInterval(K.cd);return;} s--; e.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); if(s<=0) clearInterval(K.cd); },1000); }
function authDone(){ clearInterval(K.cd); toast('본인 인증 완료'); setTimeout(startOnboard,500); }
/* 연결·대조는 시민용 앱의 온보딩을 그대로 씁니다. 끝나면 obDone() 이 창구 결과로 돌려보냅니다 */
function startOnboard(){ const pid=D.p[K.p].pid;
  PID=pid; S.ans={}; S.open={}; S.sec={}; S.asked=[]; S.ti=0; S.type=null; S.item=null;
  S.counter=true; S.scanStop=false; S.ob=1; stage('onboard'); runConnect(); }

function row(r,i){const k=K.p+':'+r.g+':'+i, on=K.open===k, ck=K.sel.has(k), isChk=r.s==='chk';
 const st=r.s==='lost'?'<span class="tag t-stop">이미 놓침</span>':isChk?'<span class="tag t-warn">확인 필요</span>':'';
 const lv=r.l==='api'?'<span class="tag t-warn">자격 재확인</span>':'';
 const vi=r.v==='online'?'온라인':r.v==='center'?'창구 접수':r.v==='office'?'기관 방문':'';
 return `<div class="row"><div class="rh" data-o="${k}">
  <input type="checkbox" data-s="${k}" ${ck?'checked':''} ${r.s==='lost'||isChk?'disabled':''}>
  <div><div class="rn">${esc(r.n)} ${st}</div>
   ${isChk?`<div class="rm" style="color:var(--warn)">확인할 것 · ${esc(r.w||'요건 일부를 앱이 알 수 없습니다')}</div>`
          :`<div class="rm">${lv}${vi?`<span class="tag t-mute">${vi}</span>`:''}<span>${esc(r.wh)}</span></div>`}</div>
  <div class="ra">${esc(r.a||'—')}</div></div>
  ${on?`<div class="rb"><div><b>${isChk?'시민께 여쭤볼 것':'판정 이유'}</b> · ${esc(r.w||'요건을 충족합니다')}</div>
   ${r.x?`<div class="q"><b>제도 내용</b><br>${esc(r.x)}</div>`:''}
   <div style="margin-top:8px;font-size:12.5px;color:var(--ink3)">출처 ${esc(r.src)} · 확인 ${esc(r.d)} ${r.u?`· <a href="${esc(r.u)}" target="_blank" rel="noopener">원문 보기</a>`:''}${r.tm?` · 처리 ${esc(r.tm)}`:''}</div>
   ${r.l==='api'?'<div style="margin-top:6px;font-size:12.5px;color:var(--warn)">기관이 등록한 대상 설명으로 판정했습니다. 안내 전에 원문의 자격 요건을 한 번 봐 주세요.</div>':''}</div>`:''}</div>`;}

/* 시민용 점검 화면(viewCheck)에서 판정 카드와 성격별 보기를 그대로 꺼냅니다 */
function citizenCards(p){ const keepP=PID, keepT=S.tab; let html='';
  try{ PID=p.pid; S.tab='type'; html=viewCheck(); }catch(e){ html=''; } finally{ PID=keepP; S.tab=keepT; }
  const tmp=document.createElement('div'); tmp.innerHTML=html;
  const viz=tmp.querySelector('.viz'), led=tmp.querySelector('.ledger');
  /* 알림은 빼고, 계획 질문만 따로 꺼냅니다 — 창구에서는 담당자가 직접 여쭤보고 답을 누릅니다 */
  let ask='';
  if(viz) viz.querySelectorAll(':scope > .notice').forEach(n=>{
    if(n.querySelector('.qopt')||n.querySelector('#re-q')){
      const h=n.querySelector('h3'), m=h&&h.textContent.match(/(\d+)가지만/);
      if(m){ h.textContent=`${m[1]}가지만 여쭤보면 판정이 정확해집니다`;
        const p0=n.querySelector('p'); if(p0) p0.innerHTML='연동으로는 알 수 없는 <b>계획과 의도</b>입니다. 시민께 여쭤보고 답을 눌러 주세요. 답하지 않으셔도 결과는 그대로 유효합니다.'; }
      n.style.margin='0'; ask=n.outerHTML; }
    n.remove(); });
  return {viz:viz?viz.outerHTML:'', led:led?led.outerHTML:'', ask}; }

function result(){const p=D.p[K.p]; const cc=citizenCards(p);
 const demo=K.typed?`<div class="card" style="padding:12px 16px;margin-bottom:12px;background:var(--go-bg);box-shadow:none;font-size:13px;color:var(--go);line-height:1.6">
   <b>시연 환경입니다.</b> 실제 조회 대신 방문 사유와 나이가 비슷한 예시 인물(${esc(p.name)}, 만 ${p.age}세)의 정보로 대조했습니다.
   실제 서비스에서는 인증한 ${esc(K.f.name)} 님의 정보를 그대로 가져옵니다.</div>`:'';
 const G={all:[],local:[],core:[],nat:[],chk:[]}; p.rows.forEach((r,i)=>{ G[r.g].push([r,i]); G.all.push([r,i]); });
 G.gap=[]; (p.chkRows||[]).forEach((r,i)=>(r.g==='gap'?G.gap:G.chk).push([r,i]));
 const ok=g=>g==='chk'||g==='gap'?G[g].length:G[g].filter(([r])=>r.s==='ok').length, lost=p.rows.filter(r=>r.s==='lost').length;
 const chk=G.chk.length, gap=G.gap.length;
 const cash=r=>r.g==='core'&&r.t==='cash';
 const y=p.rows.filter(cash).reduce((a,r)=>a+(r.y||0),0), o=p.rows.filter(cash).reduce((a,r)=>a+(r.o||0),0);
 const T=[['all','전체'],['core','주요 제도'],['local','동대문구 제도'],['nat','전국 공통'],['chk','여쭤볼 것']];
 /* 방문 사유와 관련된 제도를 위로 — 대조 범위는 그대로, 순서만 바꿉니다 */
 const RX={'기초연금':/기초연금|노인|어르신|장기요양|노령/,'어르신 돌봄':/노인|어르신|돌봄|장기요양|치매|요양/,'보육료':/보육|어린이집|유아|아동/,
   '출산·육아':/출산|육아|임신|아동|부모|영아/,'월세':/월세|주거|임대|전세|주택/,'구직·실업':/구직|실업|취업|일자리|내일배움|고용/,'창업':/창업|사업|소상공인|자금/}[K.f.reason];
 const hit=r=>RX&&RX.test(r.n)?1:0;
 let L=(K.filter==='y'?G.core.filter(([r])=>r.t==='cash'&&r.y>0):K.filter==='o'?G.core.filter(([r])=>r.t==='cash'&&r.o>0):G[K.tab]).slice().sort((a,b)=>(a[0].s==='lost')-(b[0].s==='lost')||hit(b[0])-hit(a[0])||(!!b[0].a)-(!!a[0].a));
 const lim=K.more[K.tab+(K.filter||'')]?L.length:25, rest=L.length-lim;
 const on=(t,f)=>K.tab===t && (K.filter||null)===(f||null);
 return demo+`<div class="card"><div class="who"><div class="av">${esc(p.name[0])}</div>
   <div style="flex:1"><div style="font-size:19px;font-weight:800">${esc(p.name)} <span style="font-weight:600;color:var(--ink3);font-size:14px">${/^만/.test(p.sub)?'':'만 '+p.age+'세 · '}${esc(p.sub)}</span></div>
   <div class="sub" style="font-size:13px">${esc(K.f.reason?K.f.reason+' 문의로 방문':p.visit)} · 동대문구 회기동 · 중위소득 ${p.inc}%</div></div>
   <button id="new">다음 시민</button></div></div>
 <div class="grid g5" style="margin-top:14px">
  ${[['받을 수 있는 것',(ok('local')+ok('core')+ok('nat'))+'건','세 영역 합계','all',''],
     ['그중 동대문구 제도',ok('local')+'건','자격 재확인 필요','local',''],
     ['해마다 받는 금액',won(y),`현금으로 받는 ${G.core.filter(([r])=>r.t==='cash'&&r.y>0).length}건`,'core','y'],
     ['한 번 받는 금액',won(o),`현금으로 받는 ${G.core.filter(([r])=>r.t==='cash'&&r.o>0).length}건`,'core','o'],
     ['시민께 여쭤볼 것',chk?chk+'건':'없음',chk?'답하시면 판정이 정해집니다':'더 여쭤볼 것이 없습니다','chk','']]
    .map(x=>`<button class="card kpi kbtn${on(x[3],x[4])?' kon':''}" data-kt="${x[3]}" data-kf="${x[4]}">
      <div class="k">${x[0]}</div><div class="v">${x[1]}</div><div class="d">${x[2]} <span class="kgo">보기 ›</span></div></button>`).join('')}
 </div>
 ${cc.viz?`<div class="ct-cz" style="margin-top:14px">${cc.viz}</div>`:''}
 ${cc.led?`<div class="card ct-cz" style="margin-top:12px"><h2 style="margin-bottom:4px">성격별로 보기</h2>
   <p class="sub" style="font-size:12.5px;margin-bottom:8px">받는 성격이 다른 것을 섞지 않고 나눠서 봅니다 · 감면 · 대출 · 경쟁 · 행정</p>${cc.led}</div>`:''}
 <div class="tabs" id="ct-tabs">${T.map(([k,n])=>`<button data-t="${k}" class="${K.tab===k&&!K.filter?'on':''}">${n}<span>${k==='all'?ok('core')+ok('local')+ok('nat'):ok(k)}</span></button>`).join('')}</div>
 ${K.filter?`<div class="card" style="padding:11px 16px;margin-bottom:10px;box-shadow:none;background:var(--go-bg);font-size:13.5px;color:var(--go);display:flex;align-items:center;gap:10px">
   <b>${K.filter==='y'?'해마다 받는 것':'한 번 받는 것'}만 보는 중 · ${L.length}건</b><button id="kf-x" style="margin-left:auto;padding:6px 10px">전체 보기</button></div>`:''}
 ${K.tab==='chk'?`<div class="card" style="padding:12px 16px;margin-bottom:10px;background:var(--warn-bg);box-shadow:none;font-size:13px;color:var(--warn);line-height:1.6">
   <b>연동으로 알 수 없는 요건이 하나 남은 제도입니다.</b> 줄마다 무엇을 여쭤보면 되는지 적혀 있습니다.</div>`:''}
 ${K.tab==='gap'?`<div class="card" style="padding:12px 16px;margin-bottom:10px;background:var(--bg);box-shadow:none;font-size:13px;color:var(--ink2);line-height:1.6">
   <b>기관 자료가 부족해 판정하지 못한 제도입니다.</b> 누구를 위한 제도인지 등록 자료에 분류돼 있지 않습니다.
   시민께 여쭤봐서 풀리는 문제가 아니라 조건 자료를 채워야 하는 목록입니다.</div>`:''}
 ${K.tab==='local'||K.tab==='nat'?`<div class="card" style="padding:12px 16px;margin-bottom:10px;background:var(--warn-bg);box-shadow:none;font-size:13px;color:var(--warn);line-height:1.6">
   <b>안내 전에 자격을 한 번 확인해 주세요.</b> 기관이 등록한 대상 설명으로 판정한 목록이라 일부는 실제 요건과 다를 수 있습니다.
   항목을 누르면 원문으로 갈 수 있습니다.</div>`:''}
 <div>${L.slice(0,lim).map(([r,i])=>row(r,i)).join('')}</div>
 ${rest>0?`<button id="more" style="width:100%;margin-top:4px">${rest}건 더 보기</button>`:''}
 ${gap&&K.tab!=='gap'?`<p class="sub" style="font-size:12.5px;color:var(--ink3);margin-top:14px">기관 자료가 부족해 판정하지 못한 제도 ${gap}건은 목록에서 뺐습니다 ·
   <button id="gap-v" style="background:none;padding:0;color:var(--go);font-size:12.5px">보기</button></p>`:''}
 <div class="bottom"><div class="in"><span style="font-size:13.5px;color:var(--ink2);margin-right:auto"><b style="color:var(--ink)">${K.sel.size}건</b> 안내문에 담김 · 항목을 누르면 판정 근거가 펼쳐집니다</span>
  <button id="letter" ${K.sel.size?'':'disabled'}>안내문만 드리기</button>
  <button class="p" id="apply" ${K.sel.size?'':'disabled'}>그 자리에서 신청</button></div></div>`;}

function letter(){const p=D.p[K.p]; const items=[...K.sel].map(k=>{const [pk,g,i]=k.split(':');return D.p[pk].rows[+i];});
 const today=new Date(); const ds=`${today.getFullYear()}. ${today.getMonth()+1}. ${today.getDate()}.`;
 return `<div class="noprint" style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap"><button id="back2">‹ 결과로</button>
  <span style="margin-right:auto"></span><button id="sms">문자로 보내기</button><button class="p" id="print">출력</button></div>
 <div class="paper"><h3>${esc(K.f.name||p.name)} 님께 드리는 지원 제도 안내</h3>
  <div class="m">서울특별시 동대문구 회기동 행정복지센터 · 맞춤형복지팀 · ${ds}${Object.keys(K.done).length?' · 접수증':''}</div>
  ${(()=>{const KS=[...K.sel], anyDone=KS.some(k=>K.done[k]);
   return `<table><tr><th style="width:34%">제도</th><th>받는 것</th><th>${anyDone?'접수번호':'신청하는 곳'}</th></tr>
   ${KS.map(k=>{const [pk,g,i]=k.split(':'), r=D.p[pk].rows[+i];
     return `<tr><td><b>${esc(r.n)}</b>${r.l==='api'?'<div style="font-size:11px;color:#C2410C;margin-top:3px">담당 부서 확인 필요</div>':''}</td><td>${esc(r.a||'—')}</td>
     <td>${K.done[k]?`<span style="font-family:ui-monospace,Menlo,monospace">${K.done[k]}</span><div style="font-size:11px;color:#4E5968;margin-top:3px">${route(r)[1]}</div>`:esc(r.wh||'')}</td></tr>`;}).join('')}</table>`;})()}
  <div class="f">이 안내는 오늘 상담 시점의 정보로 판정한 결과이며, 최종 자격은 각 기관의 심사로 정해집니다.<br>
  "담당 부서 확인 필요" 표시는 자격 요건을 담당 부서가 한 번 더 확인하는 항목입니다.<br>
  문의 · 회기동 행정복지센터 맞춤형복지팀 02-000-0000</div></div>`;}

function dash(){
 const DONG=['용신동','제기동','전농1동','전농2동','답십리1동','답십리2동','장안1동','장안2동','청량리동','회기동','휘경1동','휘경2동','이문1동','이문2동'];
 const cnt=[18,22,31,27,19,24,35,29,21,26,17,20,28,15], mx=Math.max(...cnt);
 const loc=D.p.hbs.rows.filter(r=>r.g==='local'&&r.s==='ok'&&r.wh&&r.wh.includes('동대문구')).slice(0,5);
 const low=loc.map((r,i)=>[r.n,[41,33,27,19,12][i],[6,4,3,2,1][i]]);
 return `<h1>동대문구 · 기관 현황</h1><p class="sub">구청장·복지국장 보고용 화면입니다. <span class="ex">예시</span> 표시는 도입 후 실제 값으로 바뀌는 시연용 수치입니다.</p>
 <div class="grid g4" style="margin-top:16px">
  ${[['이번 달 창구 상담','312건','예시'],['찾아낸 받을 수 있는 제도','1,947건','예시'],['그 자리에서 신청 접수','486건','예시'],['동대문구 자체 제도',D.ddm+'건','실제']]
   .map(x=>`<div class="card kpi"><div class="k">${x[0]}${x[2]==='예시'?'<span class="ex">예시</span>':'<span class="re">실제</span>'}</div><div class="v">${x[1]}</div></div>`).join('')}
 </div>
 <div class="grid g2" style="margin-top:14px">
  <div class="card"><h2>상담 중 발견됐지만 신청이 적은 우리 구 제도 <span class="ex">예시</span></h2>
   <p class="sub" style="font-size:12.5px;margin-bottom:8px">대상자는 있는데 신청이 안 들어오는 제도입니다. 예산이 반납되기 전에 홍보 대상을 알려드립니다.</p>
   <div class="scroll"><table class="low"><tr><th>제도</th><th style="text-align:right">대상 발견</th><th style="text-align:right">신청</th></tr>
   ${low.map(x=>`<tr><td>${esc(x[0])}</td><td style="text-align:right;font-weight:700">${x[1]}명</td><td style="text-align:right;color:var(--stop);font-weight:700">${x[2]}명</td></tr>`).join('')}</table></div>
   <p class="sub" style="font-size:11.5px;margin-top:8px">제도명은 실제 동대문구 등록 제도입니다. 숫자만 예시입니다.</p></div>
  <div class="card"><h2>동별 상담 건수 <span class="ex">예시</span></h2><div class="bars">
   ${DONG.map((d,i)=>`<div class="bl"><span>${d}</span><div class="tr"><div class="fl" style="width:${cnt[i]/mx*100}%"></div></div><b style="text-align:right">${cnt[i]}</b></div>`).join('')}</div></div>
 </div>
 <div class="grid g2" style="margin-top:14px">
  <div class="card"><h2>이번 달 가장 많이 연결된 제도 <span class="ex">예시</span></h2>
   <p class="sub" style="font-size:12.5px;margin-bottom:8px">창구에서 '받을 수 있음'으로 안내하고 그 자리에서 신청까지 받은 제도입니다.</p>
   <div class="scroll"><table class="low"><tr><th>제도</th><th style="text-align:right">안내</th><th style="text-align:right">현장 신청</th></tr>
   ${(()=>{ const seen=new Set(), top=[];
     Object.values(D.p).forEach(p=>p.rows.forEach(r=>{ if(r.g==='core'&&r.s==='ok'&&!seen.has(r.n)){ seen.add(r.n); top.push(r.n); } }));
     return top.slice(0,6).map((n,i)=>`<tr><td>${esc(n)}</td><td style="text-align:right;font-weight:700">${[64,51,43,37,29,22][i]}명</td>
       <td style="text-align:right;font-weight:700;color:var(--go)">${[38,30,21,19,11,9][i]}명</td></tr>`).join(''); })()}
   </table></div></div>
  <div class="card"><h2>조회 기록 <span class="ex">예시</span></h2>
   <p class="sub" style="font-size:12.5px;margin-bottom:8px">누가 언제 누구를 조회했는지는 남깁니다. 조회한 내용은 남기지 않습니다.</p>
   <div class="log">2026-09-23 14:02 · 회기동 이○○ · 시민 동의 D-0923-0141 · 조회 9곳<br>
   2026-09-23 13:47 · 회기동 이○○ · 시민 동의 D-0923-0138 · 조회 9곳<br>
   2026-09-23 13:21 · 장안1동 박○○ · 시민 동의 D-0923-0129 · 조회 9곳<br>
   2026-09-23 11:58 · 이문1동 최○○ · 시민 동의 D-0923-0102 · 조회 8곳 (1곳 응답 없음)<br>
   2026-09-23 11:30 · 전농1동 정○○ · 시민 동의 D-0923-0097 · 조회 9곳</div></div>
 </div>
 <p class="sub" style="font-size:12px;margin-top:16px;text-align:center">이 화면은 완성된 모습을 보여주는 설계안입니다. 제도 수와 제도명은 실제 데이터, 상담·발견·신청 수치는 예시입니다.</p>`;}

function draw(){const a=$('ct-app');
 K._tab=null;
 const staff = K.view==='home'?home(): K.view==='consent'?consent(): K.view==='link'?linking(): K.view==='auth'?auth(): K.view==='scan'?scan(): K.view==='result'?result(): K.view==='letter'?letter(): K.view==='apply'?apply(): dash();
 const tab = K.view==='dash' ? null : (K._tab || tabFor());
 a.innerHTML = tab===null ? staff
   : `<div class="ctl"><div class="ctl-l"><div class="ctl-h s">담당자 화면</div>${staff}</div>
      <div class="ctl-r"><div class="ctl-h t">시민 태블릿</div><div class="dev"><div class="scr">${tab}</div></div></div></div>`;
 if(K.view==='home'){
  const sync=()=>{ K.f.name=$('f-name').value; K.f.birth=$('f-birth').value; K.f.phone=$('f-phone').value;
    const ok=K.f.name.trim() && K.f.birth.replace(/\D/g,'').length>=6 && K.f.phone.replace(/\D/g,'').length>=10; $('f-go').disabled=!ok; };
  ['f-name','f-birth','f-phone'].forEach(id=>{ $(id).oninput=()=>{ K.typed=true; K.p=null; sync(); }; });
  a.querySelectorAll('[data-rs]').forEach(b=>b.onclick=()=>{ sync(); K.f.reason=K.f.reason===b.dataset.rs?'':b.dataset.rs; draw(); });
  $('ex-t').onclick=()=>{ sync(); K.ex=!K.ex; draw(); };
  a.querySelectorAll('.visitor').forEach(b=>b.onclick=()=>{ const k=b.dataset.k, p=D.p[k];
    K.p=k; K.typed=false; K.ex=false;
    K.f={name:p.name, birth:(2026-p.age)+'-03-12', phone:'010-'+String(2000+(p.name.charCodeAt(0)*13)%7000)+'-'+String(1000+(p.name.charCodeAt(0)*7)%9000),
         reason:{hbs:'기초연금',ksy:'보육료',ygr:'월세'}[k]};
    draw(); toast('예시 인물로 입력칸을 채웠습니다'); });
  $('f-go').onclick=()=>{ sync(); if(!K.p) K.p=pickDemo(K.f);
    K.sel=new Set(); K.open=null; K.tab='core'; K.filter=null; K.more={}; K.done={}; K.docs={}; K.step=0; K.agreed=false; go('consent'); }; }
 if(K.view==='consent'){const cs=[...a.querySelectorAll('.cc')];
  cs.forEach(c=>c.onchange=()=>{ const t=$('t-agree'); if(t) t.disabled=!cs.every(x=>x.checked); });
  const ta=$('t-agree'); if(ta) ta.onclick=()=>{ K.agreed=true; draw(); toast('시민이 동의했습니다'); };
  $('back').onclick=()=>go('home');$('auth').onclick=()=>{K.am='easy';K.prov='카카오톡';K.sent=false;go('auth');};}
 if(K.view==='auth'){
  a.querySelectorAll('[data-am]').forEach(b=>b.onclick=()=>{K.am=b.dataset.am;K.sent=false;clearInterval(K.cd);draw();});
  const ed=$('au-edit'); if(ed) ed.onclick=()=>{ clearInterval(K.cd); go('home'); };
  a.querySelectorAll('[data-pv]').forEach(b=>b.onclick=()=>{K.prov=b.dataset.pv;K.sent=false;draw();});
  const sd=$('au-send'); if(sd) sd.onclick=()=>{K.sent=true;draw();countdown();
    if(K.am==='easy') setTimeout(()=>{const d=$('au-d'),t=$('au-t'); if(!d) return; d.className='dot on'; t.textContent='승인했습니다'; authDone();},2600);
    else toast('시민 휴대폰으로 인증번호를 보냈습니다'); };
  const ok=$('au-ok'); if(ok){ const f=()=>{ if($('au-otp').value.trim()==='482913') authDone(); else $('au-err').textContent='번호가 맞지 않습니다. 다시 확인해 주세요.'; };
    ok.onclick=f; $('au-otp').onkeydown=e=>{if(e.key==='Enter')f();}; $('au-otp').focus();
    $('au-re').onclick=()=>{countdown();toast('인증번호를 다시 보냈습니다');}; } }
 if(K.view==='result'){
  const rejudge=msg=>{ const y=window.scrollY; buildData(); draw(); window.scrollTo(0,y); toast(msg); };
  a.querySelectorAll('.ct-ask .qopt').forEach(b=>b.onclick=()=>{ S.ans[b.dataset.k]=b.dataset.v; rejudge('답을 반영해 다시 판정했습니다'); });
  const rq=a.querySelector('.ct-ask #re-q'); if(rq) rq.onclick=()=>{ S.ans={}; rejudge('답을 지우고 다시 판정했습니다'); };
  a.querySelectorAll('.ct-cz .typebtn').forEach(b=>b.onclick=()=>{ const t=b.dataset.t; S.type=S.type===t?null:t; const y=window.scrollY; draw(); window.scrollTo(0,y); });
  a.querySelectorAll('#ct-tabs [data-t]').forEach(b=>b.onclick=()=>{K.tab=b.dataset.t;K.filter=null;K.open=null;draw();});
  const toList=()=>{ const t=$('ct-tabs'); if(t){ t.scrollIntoView({behavior:'smooth',block:'start'}); } };
  a.querySelectorAll('[data-kt]').forEach(b=>b.onclick=()=>{ K.tab=b.dataset.kt; K.filter=b.dataset.kf||null; K.open=null; draw(); setTimeout(toList,30); });
  const kx=$('kf-x'); if(kx) kx.onclick=()=>{ K.filter=null; draw(); };
  const gv=$('gap-v'); if(gv) gv.onclick=()=>{ K.tab='gap'; K.filter=null; K.open=null; draw(); setTimeout(toList,30); };
  a.querySelectorAll('[data-o]').forEach(h=>h.onclick=e=>{if(e.target.tagName==='INPUT')return;const k=h.dataset.o;K.open=K.open===k?null:k;const y=window.scrollY;draw();window.scrollTo(0,y);});
  a.querySelectorAll('[data-s]').forEach(c=>c.onchange=()=>{const k=c.dataset.s;c.checked?K.sel.add(k):K.sel.delete(k);const y=window.scrollY;draw();window.scrollTo(0,y);});
  const m=$('more');if(m)m.onclick=()=>{K.more[K.tab+(K.filter||'')]=1;const y=window.scrollY;draw();window.scrollTo(0,y);};
  $('new').onclick=()=>{K.p=null;K.f={name:'',birth:'',phone:'',reason:''};K.typed=false;go('home');};$('letter').onclick=()=>go('letter');$('apply').onclick=()=>{K.step=0;go('apply');};}
 const ts=$('t-sms'); if(ts) ts.onclick=()=>{ ts.textContent='문자를 보냈습니다 ✓'; ts.disabled=true; toast('시민이 문자로 받기를 눌렀습니다'); };
 if(K.view==='apply'){ $('ap-back').onclick=()=>{K.step=0;go('result');};
  a.querySelectorAll('[data-dk]').forEach(cb=>cb.onchange=()=>{ K.docs=K.docs||{}; K.docs[cb.dataset.dk]=cb.checked; const y=window.scrollY, ok=$('ap-ok').checked; draw(); $('ap-ok').checked=ok; $('ap-sign').disabled=!ok; window.scrollTo(0,y); });
  const ok=$('ap-ok'); if(ok){ ok.onchange=()=>{$('ap-sign').disabled=!ok.checked;}; $('ap-sign').onclick=()=>{K.step=1;draw();runApply();}; }
  const n=$('ap-next'); if(n){ n.onclick=()=>{K.p=null;K.step=0;K.f={name:'',birth:'',phone:'',reason:''};K.typed=false;go('home');}; $('ap-letter').onclick=()=>go('letter');
    $('ap-sms').onclick=()=>toast('접수번호와 다음 단계를 시민 휴대폰으로 보냈습니다 (시연)'); } }
 if(K.view==='letter'){$('back2').onclick=()=>go('result');$('print').onclick=()=>window.print();
  $('sms').onclick=()=>toast('시민 휴대폰으로 안내문 링크를 보냈습니다 (시연)');}
}

function show(){ enterRegion(); ensureNational(); ensureLocal('서울'); buildData();
  if(!K.p || !D.p[K.p]) K.view='home'; draw(); }
function afterScan(){ enterRegion(); buildData(); K.view='result'; K.tab='core'; K.open=null; S.counter=false; draw(); window.scrollTo(0,0); }
function exit(){ K.p=null; K.view='home'; S.counter=false; leaveRegion(); lsSave&&lsSave(); stage('landing'); }
document.getElementById('ct-ob-x').onclick=()=>{ S.scanStop=true; S.counter=false; stage('counter'); };
return {show, afterScan, exit};
})();
