/* ═══════════ AI 설계 ═══════════════════════════════════
   할 일 + 로드맵을 한 화면으로 합칩니다.
   가능한 제도가 한 사람에 수십~수백 건이라 분류만으로는 복잡합니다.
   그래서 '무엇부터' 를 정해 한 단계씩 보여 줍니다. 전체 목록은 점검에 있습니다.

   순서는 규칙으로 정합니다 (같은 사람이면 매번 같은 순서 · 확률 없음)
     1 기한이 먼저 끝나는 것 (hot)
     2 손이 거의 안 가는 것 한 번에 제출 (연동 서류만으로 끝남)
     3 직접 준비가 필요한데 금액이 큰 것 (큰 순 3건)
     4 심사형(선정형) · 공고에 맞춰 준비
     5 기한 있는 행정 (갱신·신고)
     6 자금이 필요할 때만 · 정책 대출 (선택)
   이후: 조건이 되면 열리는 것 · 질문에 답하면 정해지는 것 */

function aiSteps(c, J){
  /* 가능한 것 전부를 한 줄로 세우고 5건씩 끊습니다 · 앞 단계를 끝내면 다음 단계가 이어서 열립니다
     나머지를 점검으로 떠넘기지 않습니다 */
  const ok=J.flatMap(s=>s.res.filter(x=>x.s==='ok'));
  const val=x=>{ const m=x.mv||{}; return (m.y||0)+(m.once||0); };
  const big=x=>{ const m=x.mv||{}; return (m.y||0)+(m.once||0)+(m.max||0)+(m.cap||0); };
  const used=new Set(), steps=[];
  const free=L=>L.filter(x=>!used.has(x.n));
  const take=L=>{ L.forEach(x=>used.add(x.n)); return L; };
  const sumTxt=L=>{ const t=tally(L); return [t.y?`연 ${won(t.y)}`:'', t.once?`한 번 ${won(t.once)}`:''].filter(Boolean).join(' + '); };
  const verified=x=>!(x.chk&&(x.chk.lvl==='cond'||x.chk.lvl==='api'));
  const spend=x=>moneyKind(x)==='save' || /%|할인|감면|공제|무료|\d+일권|한도|재가급여|기여금|매칭|적립|이용료|보험료/.test(x.amt||'');
  const easy=x=>['auto','one'].includes(agency(x));
  const mk=x=>moneyKind(x);
  /* 한 묶음(tier)을 size 건씩 끊어 단계로 */
  const chunk=(L, size, f)=>{ L=take(free(L)); for(let i=0;i<L.length;i+=size){ const part=L.slice(i,i+size); steps.push({...f(part, i/size), items:part}); } };
  const dl=deadlineList(c);
  const kw=d=>d[0].replace(/ 제도 일몰| 구간/,'').split(' · ')[0];

  /* 0 · 기한이 먼저 끝나는 것 · 제도 일몰은 그 제도가 가능할 때만 */
  dl.filter(d=>d[3]==='hot' && !(/제도/.test(d[0]) && !ok.some(x=>x.n.includes(kw(d))))).forEach(d=>{
    const L=take(free(ok.filter(x=>x.n.includes(kw(d)))));
    steps.push({k:'dl:'+d[0], tag:'기한', tone:'stop', t:d[0], get:`남은 기간 ${d[2]} · ${d[1]}`, items:L,
      act:L.length&&L.every(verified)&&L.every(easy)?{cls:'subgo', lab:'제출', n:L.map(x=>x.n)}:null}); });

  /* 1 · 신청만 하면 들어오는 돈 (원문·금액 확인 · 연동 서류) · 금액 큰 순 */
  chunk(ok.filter(x=>verified(x)&&easy(x)&&['cash','save'].includes(mk(x))&&!spend(x)).sort((a,b)=>val(b)-val(a)), 5,
    (L,w)=>({k:'cash'+w, tag:w?'이어서':'바로 신청', tone:'go', t:(w?'이어서 신청할 것':'바로 신청할 것')+` · ${L.length}건`,
      get:sumTxt(L)||'금액은 기관 확정 후', act:{cls:'subgo', lab:'제출', n:L.map(x=>x.n)}}));

  /* 2 · 서류를 챙겨야 받는 돈 · 금액 큰 순 3건씩 */
  chunk(ok.filter(x=>['self','expert'].includes(agency(x))&&['cash','save'].includes(mk(x))&&!spend(x)).sort((a,b)=>val(b)-val(a)), 3,
    (L,w)=>({k:'prep'+w, tag:'서류', tone:'warn', t:`서류 챙겨서 신청 · ${L.length}건`, get:sumTxt(L),
      act:{cls:'prepgo', lab:'준비하고 제출 맡기기', n:L.map(x=>x.n)}}));

  /* 3 · 자격 확인 후 받는 돈 · 기관 등록 자료로 조건만 맞춰 본 것 · 금액 있는 것 먼저 */
  chunk(ok.filter(x=>!verified(x)&&['cash','save'].includes(mk(x))&&!spend(x)).sort((a,b)=>val(b)-val(a)), 5,
    (L,w)=>({k:'ver'+w, tag:'확인 후 신청', tone:'warn', t:`자격 확인 후 신청 · ${L.length}건`, get:sumTxt(L)||'금액은 원문에서 확인'}));

  /* 4 · 심사형 · 공고에 맞춰 */
  chunk(ok.filter(x=>mk(x)==='pick').sort((a,b)=>big(b)-big(a)), 5,
    (L,w)=>{ const mx=Math.max(...L.map(x=>(x.mv||{}).max||0));
      return {k:'pick'+w, tag:'공고', tone:'logic', t:`심사형 지원 · ${L.length}건`, get:mx?`가장 큰 것 최대 ${won(mx)}`:'선정돼야 받습니다'}; });

  /* 5 · 써야 아끼는 것 · 할인·감면·환급률·소득공제 */
  chunk(ok.filter(x=>['cash','save'].includes(mk(x))&&spend(x)).sort((a,b)=>(verified(b)-verified(a))||(big(b)-big(a))), 5,
    (L,w)=>{ const V=L.filter(x=>verified(x)&&easy(x)); const t=sumTxt(L);
      return {k:'sv'+w, tag:'쓰면 아낌', tone:'mute', t:`할인·감면 · ${L.length}건`, get:t?`${t} 절감`:'쓰는 만큼',
        act:V.length?{cls:'subgo', lab:'등록', n:V.map(x=>x.n)}:null}; });

  /* 6 · 해 둘 행정 · 기한 있는 것 */
  const warn=dl.filter(d=>d[3]==='warn');
  chunk(ok.filter(x=>mk(x)==='task'), 5,
    (L,w)=>({k:'task'+w, tag:'행정', tone:'mute', t:`해 둘 행정 · ${L.length}건`,
      get:w===0&&warn.length?warn.map(d=>`${d[0]} ${d[2]}`).join(' · '):'다른 제도의 전제가 되는 것'}));

  /* 7 · 이용할 수 있는 서비스 */
  chunk(ok.filter(x=>mk(x)==='svc'), 5,
    (L,w)=>({k:'svc'+w, tag:'이용', tone:'mute', t:`이용할 수 있는 서비스 · ${L.length}건`, get:'상담 · 교육 · 돌봄 · 의료'}));

  /* 8 · 남은 것 전부 */
  chunk(ok.filter(x=>mk(x)!=='loan'), 5,
    (L,w)=>({k:'etc'+w, tag:'그 밖', tone:'mute', t:`그 밖에 받을 수 있는 것 · ${L.length}건`, get:''}));

  /* 선택 · 정책 대출 · 필요할 때만 */
  chunk(ok.filter(x=>mk(x)==='loan').sort((a,b)=>big(b)-big(a)), 99,
    (L,w)=>{ const cap=Math.max(...L.map(x=>(x.mv||{}).cap||0));
      return {k:'loan'+w, tag:'필요할 때', tone:'mute', opt:true, t:`정책 대출 · ${L.length}건`, get:cap?`가장 큰 한도 ${won(cap)}`:'상환이 필요합니다'}; });

  return {steps, ok, rest:ok.filter(x=>!used.has(x.n))}; }

function viewAI(){
  const c=ctx(), J=judgeAll(), P=aiSteps(c,J);
  S.aiDone=S.aiDone||{}; if(S._aiPid!==PID){ S._aiPid=PID; S.aiDone={}; S.aiOpen=null; S.aiOff={}; S.aiAll=false; }
  const st=P.steps, mainSt=st.filter(s=>!s.opt), optSt=st.filter(s=>s.opt);
  const cur=st.find(s=>!S.aiDone[s.k]&&!s.opt)||st.find(s=>!S.aiDone[s.k]);
  const open=S.aiOpen?S.aiOpen:(cur&&cur.k);
  const doneN=mainSt.filter(s=>S.aiDone[s.k]).length;
  const chk=J.flatMap(s=>s.res.filter(x=>x.s==='chk')).length;
  const cond=roles().filter(r=>ROAD[r]).flatMap(r=>ROAD[r](c).stages.flatMap(s=>s.items)).filter(x=>x[1]==='cond');
  const nm=c.name||'';

  const row=x=>{ const op=S.item===x.n, ky=encodeURIComponent(x.n);
    return `<div class="ritem r-${op?'ok':'plain'}"><button class="lrow thead" data-i="${ky}">
      <div><div class="t" style="font-size:14px">${x.n}<span class="ichev hv${op?' on':''}">${op?'닫기':'준비물'}</span></div>
        <div class="d">${aiDesc(x)}</div></div>
      <div class="r">${x.amt?(/\d/.test(x.amt)?`<b style="font-size:14px">${x.amt}</b>`:`<span class="amt-na">${x.amt}</span>`):''}</div></button>
      ${op?stepBlock(x)+foldBtn(x.n):''}</div>`; };

  const card=(s,i)=>{ const isOpen=open===s.k, dn=!!S.aiDone[s.k], isCur=cur&&cur.k===s.k;
    const lim=(S.aiMore&&S.aiMore[s.k])||s.items.length<=5?s.items.length:4;
    /* 골라서 제출 · 기본은 전부 선택, 뺀 것만 기억합니다 */
    const selable=s.act&&s.act.cls==='subgo'?s.act.n:[];
    S.aiOff=S.aiOff||{}; const off=S.aiOff[s.k]||[];
    const sel=selable.filter(n=>!off.includes(n)), all=selable.length&&sel.length===selable.length;
    const kk=encodeURIComponent(s.k);
    const rowS=x=>selable.includes(x.n)
      ? `<div class="ai-selrow"><label class="ai-ck"><input type="checkbox" class="aisel" data-k="${kk}" data-n="${encodeURIComponent(x.n)}" ${off.includes(x.n)?'':'checked'}></label><div class="ai-rb">${row(x)}</div></div>`
      : row(x);
    return `<div class="ai-st ${dn?'done':''} ${isCur?'cur':''} ${isOpen?'open':''}">
      <span class="ai-node">${dn?'✓':s.opt?'·':i+1}</span>
      <div class="ai-card">
        <button class="ai-hd" data-k="${encodeURIComponent(s.k)}">
          <div class="ai-hl"><span class="ai-tag t-${s.tone}">${s.tag}</span>${isCur&&!dn?'<span class="ai-now">지금</span>':''}
            <div class="ai-t">${s.t}</div>
            ${s.get?`<div class="ai-get">${s.get}</div>`:''}</div>
          <span class="chev">${isOpen?'접기':'›'}</span></button>
        ${isOpen?`<div class="ai-bd">
          ${s.items.length?`<div class="ai-items">
            ${selable.length>1?`<label class="ai-all"><input type="checkbox" class="aiall" data-k="${kk}" ${all?'checked':''}><span>전체 선택</span><em>${sel.length} / ${selable.length}건 선택</em></label>`:''}
            ${s.items.slice(0,lim).map(rowS).join('')}
            ${s.items.length>lim?`<button class="lrow aimore" data-k="${encodeURIComponent(s.k)}" style="width:100%;justify-content:center;color:var(--go);font-size:12.5px">${s.items.length-lim}건 더 보기</button>`:''}</div>`:''}
          <div class="ai-act">
            ${s.act&&s.act.cls==='subgo'&&selable.length?`<button class="btn btn-fill subgo" ${sel.length?'':'disabled'} data-n="${encodeURIComponent(sel.join('|'))}">${sel.length?`선택한 ${sel.length}건 ${s.act.lab}`:'고른 것이 없습니다'}</button>`
              :s.act&&s.act.cls==='prepgo'?`<button class="btn btn-fill prepgo" data-n="${encodeURIComponent(s.act.n.join('|'))}">${s.act.lab}</button>`:''}
            <button class="btn aidone" data-k="${encodeURIComponent(s.k)}">${dn?'다시 할 일로':'이 단계 끝냄'}</button>
          </div></div>`:''}
      </div></div>`; };

  return `
  <div class="ai-hero">
    <div class="ai-badge">AI 설계</div>
    <h2>${nm?nm+'님은 ':''}이 순서로 하시면 됩니다</h2>
    <p>가능한 ${P.ok.length}건 전부를 <b>바로 신청할 수 있는 것부터</b> 차례로 세웠습니다. 한 번에 한 단계만 보시면 되고, 끝내면 다음 단계가 이어서 열립니다.</p>
    <div class="ai-prog"><span style="width:${mainSt.length?Math.round(doneN/mainSt.length*100):0}%"></span></div>
    <div class="ai-pl">${doneN} / ${mainSt.length}단계 끝냄${cur?` · 지금: <b>${cur.t}</b>`:' · 모든 단계를 끝냈습니다'}</div>
  </div>

  ${(()=>{ const ci=cur?mainSt.indexOf(cur):mainSt.length, upto=S.aiAll?mainSt.length:Math.max(ci+3,3);
    const vis=mainSt.slice(0,upto), hid=mainSt.slice(upto);
    const grp={}; hid.forEach(s=>{ grp[s.tag]=(grp[s.tag]||0)+s.items.length; });
    return `<div class="ai-flow">${vis.map((s,i)=>card(s,i)).join('')}
      ${hid.length?`<div class="ai-st ai-more"><span class="ai-node">…</span><div class="ai-card"><button class="ai-hd aiall-steps">
        <div class="ai-hl"><div class="ai-t" style="margin-top:0">그 뒤로 ${hid.length}단계 · ${hid.reduce((n,s)=>n+s.items.length,0)}건이 이어집니다</div>
          <div class="ai-lc" style="margin-top:8px">${Object.entries(grp).map(([t,n])=>`<span>${t}<em>${n}건</em></span>`).join('')}</div>
          <div style="font-size:12.5px;color:var(--ink-3);margin-top:8px">앞 단계를 끝내면 차례로 열립니다 · 눌러서 미리 보기</div></div>
        <span class="chev">›</span></button></div></div>`:''}
      ${optSt.map(s=>card(s,-1)).join('')}</div>`; })()}

  <div class="card pad ai-later">
    <h3>그다음 · 조건이 되면 열립니다</h3>
    ${cond.length?`<div class="ai-lc">${cond.map(x=>`<span>${x[0]}<em>${x[2]||''}</em></span>`).join('')}</div>`:''}
    ${chk?`<p>연동으로 알 수 없는 사실 몇 가지에 답하시면 받을 수 있는 것이 더 정해집니다 · <button class="lk gov" data-v="check">점검에서 답하기 ›</button></p>`:''}
    <p>창업·출산·이사 같은 계획이 있으면 순서가 달라집니다 · <button class="lk gov" data-v="road">목표별로 다시 짜기 ›</button></p>
  </div>
  <p style="font-size:12px;color:var(--ink-3);margin-top:10px;line-height:1.6">순서는 기한 → 바로 신청할 것(금액 큰 순) → 서류가 필요한 것 → 자격 확인이 필요한 것 → 심사형 → 할인·감면 → 행정 → 서비스 규칙으로 정합니다. 대출은 필요할 때만 봅니다. 같은 정보면 언제나 같은 순서가 나옵니다.</p>`; }

function bindAI(){
  const keep=fn=>{ const y=window.scrollY; fn(); draw(); window.scrollTo(0,y); };
  main.querySelectorAll('.ai-hd').forEach(b=>b.onclick=()=>keep(()=>{
    const k=decodeURIComponent(b.dataset.k); S.aiOpen=b.closest('.ai-st').classList.contains('open')?'__none':k; S.item=null; }));
  main.querySelectorAll('.aidone').forEach(b=>b.onclick=()=>{ const k=decodeURIComponent(b.dataset.k);
    S.aiDone[k]=!S.aiDone[k]; S.aiOpen=null; S.item=null; draw();
    afterPaint(()=>{ const el=main.querySelector('.ai-st.cur'); if(el) try{ el.scrollIntoView({behavior:'instant',block:'center'}); }catch(e){} }); });
  main.querySelectorAll('.aisel').forEach(b=>b.onchange=()=>keep(()=>{ const k=decodeURIComponent(b.dataset.k), n=decodeURIComponent(b.dataset.n);
    S.aiOff=S.aiOff||{}; const o=new Set(S.aiOff[k]||[]); b.checked?o.delete(n):o.add(n); S.aiOff[k]=[...o]; }));
  main.querySelectorAll('.aiall').forEach(b=>b.onchange=()=>keep(()=>{ const k=decodeURIComponent(b.dataset.k);
    const st=aiSteps(ctx(),judgeAll()).steps.find(x=>x.k===k); S.aiOff=S.aiOff||{};
    S.aiOff[k]=b.checked?[]:(st&&st.act?st.act.n.slice():[]); }));
  main.querySelectorAll('.aiall-steps').forEach(b=>b.onclick=()=>keep(()=>{ S.aiAll=true; }));
  main.querySelectorAll('.aimore').forEach(b=>b.onclick=()=>keep(()=>{ S.aiMore=S.aiMore||{}; S.aiMore[decodeURIComponent(b.dataset.k)]=1; }));
  main.querySelectorAll('.gov').forEach(b=>b.onclick=()=>{ S.view=b.dataset.v; drawNav(); draw(); window.scrollTo({top:0,left:0,behavior:'instant'}); }); }

/* 한 줄 설명 · 무엇을 위한 제도인지 (규칙 제도는 what, 등록 자료는 서비스 목적 요약) */
function aiDesc(x){ const g=x.guide||{};
  const t=(x.chk&&x.chk.lvl)?(g.sum||''):(g.what||'');
  return t?(t.length>60?t.slice(0,58)+'…':t):(x.where||''); }
