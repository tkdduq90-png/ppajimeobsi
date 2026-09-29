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
  const ok=J.flatMap(s=>s.res.filter(x=>x.s==='ok'));
  const val=x=>{ const m=x.mv||{}; return (m.y||0)+(m.once||0); };
  const big=x=>{ const m=x.mv||{}; return (m.y||0)+(m.once||0)+(m.max||0)+(m.cap||0); };
  const used=new Set(), steps=[];
  const take=L=>{ L.forEach(x=>used.add(x.n)); return L; };
  const sumTxt=L=>{ const t=tally(L); return [t.y?`연 ${won(t.y)}`:'', t.once?`한 번 ${won(t.once)}`:''].filter(Boolean).join(' + '); };
  const dl=deadlineList(c);

  /* 1 · 기한이 먼저 끝나는 것 */
  /* 제도 일몰처럼 특정 제도에 걸린 기한은 그 제도가 가능할 때만 */
  dl.filter(d=>d[3]==='hot' && !(/제도/.test(d[0]) && !ok.some(x=>x.n.includes(d[0].replace(/ 제도 일몰| 구간/,'').split(' · ')[0])))).forEach(d=>steps.push({k:'dl:'+d[0], tag:'기한', tone:'stop',
    t:d[0], get:`남은 기간 ${d[2]}`,
    why:`${d[1]}이 지나면 다시 할 수 없습니다. 금액보다 기한이 먼저입니다.`,
    todo:'기한 안에 신청하거나 결정하시면 됩니다',
    items:take(ok.filter(x=>!used.has(x.n)&&x.n.includes(d[0].replace(/ 제도 일몰| 구간/,'').split(' · ')[0])))}));

  /* 2 · 바로 받는 돈 · 원문·금액까지 확인한 제도 중 손이 거의 안 가는 것 · 큰 순 5건씩
     할인·감면·환급률·소득공제·본인 적립이 필요한 것은 '써야 아끼는 것' 이라 뒤로 미룹니다 */
  const verified=x=>!(x.chk&&(x.chk.lvl==='cond'||x.chk.lvl==='api'));
  const spend=x=>moneyKind(x)==='save' || /%|할인|감면|공제|무료|\d+일권|한도|재가급여|기여금|매칭|적립|이용료|보험료/.test(x.amt||'');
  const easyV=ok.filter(x=>!used.has(x.n) && verified(x) && ['auto','one'].includes(agency(x)) && ['cash','save'].includes(moneyKind(x)));
  const cashNow=easyV.filter(x=>!spend(x)).sort((a,b)=>val(b)-val(a));
  const WAVE=5, w1=cashNow.filter(x=>val(x)>0).slice(0,WAVE), w2=cashNow.filter(x=>!w1.includes(x)).slice(0,WAVE);
  [w1,w2].forEach((L,w)=>{ if(!L.length) return; const s=sumTxt(L);
    steps.push({k:'easy'+w, tag:w?'이어서':'바로 입금', tone:'go',
      t:w?`이어서 받을 돈 · ${L.length}건`:`바로 받는 돈 · ${L.length}건`, get:s||'금액은 기관 확정 후',
      why:w?'앞 단계와 같이 신청하면 받는 돈입니다. 금액이 작거나 기관이 확정해야 해서 뒤로 뺐습니다.'
           :'돈을 쓰지 않아도 신청만 하면 들어오는 것 중 금액이 큰 순입니다. 원문과 금액까지 확인한 제도이고 서류가 연동으로 채워집니다.',
      todo:'제출할 것만 골라 동의하시면 됩니다'+(L.some(x=>agency(x)==='one')?' · 일부는 서류 1개':''),
      items:take(L), act:{cls:'subgo', lab:'제출', n:L.map(x=>x.n)}}); });

  /* 3 · 직접 준비가 필요한 것 · 금액 큰 순 3건 */
  const prep=ok.filter(x=>!used.has(x.n) && ['self','expert'].includes(agency(x))
      && ['cash','save'].includes(moneyKind(x)) && val(x)>0)
    .sort((a,b)=>val(b)-val(a)).slice(0,3);
  prep.forEach((x,i)=>{ const d=((x.guide&&x.guide.doc)||[]).filter(z=>z[1]!=='auto');
    steps.push({k:'prep:'+x.n, tag:'준비', tone:'warn',
      t:x.n, get:x.amt||'',
      why:i===0?'직접 준비할 서류가 있는 것 중 받는 금액이 가장 큽니다.':'직접 준비가 필요한 것 중 다음으로 금액이 큽니다.',
      todo:d.length?`직접 준비 ${d.length}건 · ${d.map(z=>z[0]).join(' · ')}`:'준비물은 펼쳐서 확인하세요',
      items:take([x]), act:agency(x)==='expert'?{cls:'thead-open', lab:'초안부터 만들기', n:[x.n]}:{cls:'prepgo', lab:'준비하고 제출 맡기기', n:[x.n]}}); });

  /* 3.5 · 자격 확인이 필요한 지원금 · 기관 등록 자료로 조건만 맞춰 본 것 · 금액 있는 것만 큰 순 5건 */
  const unv=ok.filter(x=>!used.has(x.n) && !verified(x) && ['cash','save'].includes(moneyKind(x)) && !spend(x) && val(x)>0)
    .sort((a,b)=>val(b)-val(a));
  if(unv.length){ const L=unv.slice(0,5);
    steps.push({k:'verify', tag:'확인 후 신청', tone:'warn',
      t:`자격만 확인하면 받는 지원금 · ${L.length}건`, get:sumTxt(L),
      why:`기관이 등록한 조건으로 맞춰 본 제도라 원문에서 자격을 한 번 확인해야 합니다. 금액이 적힌 것 중 큰 순 ${L.length}건만 골랐습니다${unv.length>L.length?` (나머지 ${unv.length-L.length}건은 점검에)`:''}.`,
      todo:'하나씩 펼쳐 원문 조건을 확인하고, 맞으면 신청하시면 됩니다', items:take(L)}); }

  /* 4 · 심사형 · 공고 맞춰 준비 */
  const pick=ok.filter(x=>!used.has(x.n) && moneyKind(x)==='pick').sort((a,b)=>big(b)-big(a));
  const roadNow=roles().filter(r=>ROAD[r]).flatMap(r=>ROAD[r](c).stages.flatMap(s=>s.items)).filter(x=>x[1]==='now').map(x=>x[0]);
  if(pick.length){ const top=pick.slice(0,3), mx=Math.max(...pick.map(x=>(x.mv||{}).max||0));
    const hit=roadNow.filter(n=>pick.some(x=>x.n===n));
    steps.push({k:'pick', tag:'공고', tone:'logic',
      t:`심사형 지원 준비 · ${pick.length}건`, get:mx?`가장 큰 것 최대 ${won(mx)}`:'',
      why:`선정돼야 받는 돈이라 합계에 넣지 않았습니다. 공고가 열릴 때 계획서를 내야 하므로 미리 골라 둡니다.${hit.length?` 지금 단계에서 열린 것: ${hit.join(' · ')}`:''}`,
      todo:`먼저 볼 것 ${top.map(x=>x.n).join(' · ')}`, items:take(pick)}); }

  /* 4.5 · 써야 아끼는 것 · 할인·감면·환급률·소득공제 · 당장 들어오는 돈이 아니라 뒤로 */
  const sv=ok.filter(x=>!used.has(x.n) && ['cash','save'].includes(moneyKind(x)) && spend(x) && ['auto','one'].includes(agency(x)))
    .sort((a,b)=>(verified(b)-verified(a))||(big(b)-big(a)));
  if(sv.length){ const L=sv.slice(0,5);
    steps.push({k:'spend', tag:'쓰면 아낌', tone:'mute',
      t:`할인·감면 · 쓸 때 아끼는 것 ${L.length}건`, get:sumTxt(L)?`${sumTxt(L)} 절감`:'쓰는 만큼',
      why:`돈을 써야 돌려받거나 덜 내는 것이라 당장 들어오는 돈보다 뒤로 미뤘습니다${sv.length>L.length?` (나머지 ${sv.length-L.length}건은 점검에)`:''}.`,
      todo:'자주 쓰는 것만 골라 등록해 두시면 됩니다', items:take(L),
      act:{cls:'subgo', lab:'등록', n:L.filter(verified).map(x=>x.n)}}); }

  /* 5 · 기한 있는 행정 */
  const warn=dl.filter(d=>d[3]==='warn');
  const task=ok.filter(x=>!used.has(x.n) && moneyKind(x)==='task');
  if(warn.length||task.length) steps.push({k:'admin', tag:'행정', tone:'mute',
    t:'기한 있는 행정 챙기기', get:warn.length?warn.map(d=>`${d[0]} ${d[2]}`).join(' · '):`${task.length}건`,
    why:'받는 돈은 아니지만 놓치면 과태료가 붙거나 다른 제도의 전제가 됩니다.',
    todo:warn.length?warn.map(d=>`${d[0]} (${d[1]})`).join(' · '):'증명서·신고 등',
    items:take(task)});

  /* 6 · 자금이 필요할 때만 */
  const loan=ok.filter(x=>!used.has(x.n) && moneyKind(x)==='loan').sort((a,b)=>big(b)-big(a));
  if(loan.length){ const cap=Math.max(...loan.map(x=>(x.mv||{}).cap||0));
    steps.push({k:'loan', tag:'선택', tone:'mute', opt:true,
      t:`자금이 필요할 때만 · 정책 대출 ${loan.length}건`, get:cap?`가장 큰 한도 ${won(cap)}`:'',
      why:'갚아야 하는 돈입니다. 필요할 때 민간 대출보다 먼저 보시면 되고, 지금 할 필요는 없습니다.',
      todo:'필요해지면 금리·한도 비교부터', items:take(loan)}); }

  const rest=ok.filter(x=>!used.has(x.n));
  return {steps, ok, rest}; }

function viewAI(){
  const c=ctx(), J=judgeAll(), P=aiSteps(c,J);
  S.aiDone=S.aiDone||{}; if(S._aiPid!==PID){ S._aiPid=PID; S.aiDone={}; S.aiOpen=null; S.aiOff={}; }
  const st=P.steps, mainSt=st.filter(s=>!s.opt);
  const cur=st.find(s=>!S.aiDone[s.k]&&!s.opt)||st.find(s=>!S.aiDone[s.k]);
  const open=S.aiOpen?S.aiOpen:(cur&&cur.k);
  const doneN=mainSt.filter(s=>S.aiDone[s.k]).length;
  const chk=J.flatMap(s=>s.res.filter(x=>x.s==='chk')).length;
  const cond=roles().filter(r=>ROAD[r]).flatMap(r=>ROAD[r](c).stages.flatMap(s=>s.items)).filter(x=>x[1]==='cond');
  const nm=c.name||'';

  const row=x=>{ const op=S.item===x.n, ky=encodeURIComponent(x.n);
    return `<div class="ritem r-${op?'ok':'plain'}"><button class="lrow thead" data-i="${ky}">
      <div><div class="t" style="font-size:14px">${x.n}<span class="ichev hv${op?' on':''}">${op?'닫기':'준비물'}</span></div>
        <div class="d">${x.where||''}</div></div>
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
          <div class="ai-why"><b>왜 이 순서인가</b><span>${s.why}</span></div>
          <div class="ai-do"><b>하실 일</b><span>${s.todo}</span></div>
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
    <p>가능한 ${P.ok.length}건을 기한 · 받는 금액 · 손이 가는 정도로 따져 <b>${mainSt.length}단계</b>로 줄였습니다. 한 번에 한 단계만 보시면 됩니다.</p>
    <div class="ai-prog"><span style="width:${mainSt.length?Math.round(doneN/mainSt.length*100):0}%"></span></div>
    <div class="ai-pl">${doneN} / ${mainSt.length}단계 끝냄${cur?` · 지금: <b>${cur.t}</b>`:' · 모든 단계를 끝냈습니다'}</div>
  </div>

  <div class="ai-flow">${st.map(card).join('')}</div>

  <div class="card pad ai-later">
    <h3>그다음 · 조건이 되면 열립니다</h3>
    ${cond.length?`<div class="ai-lc">${cond.map(x=>`<span>${x[0]}<em>${x[2]||''}</em></span>`).join('')}</div>`:''}
    ${chk?`<p>연동으로 알 수 없는 사실 몇 가지에 답하시면 받을 수 있는 것이 더 정해집니다 · <button class="lk gov" data-v="check">점검에서 답하기 ›</button></p>`:''}
    <p>이 순서에 넣지 않은 ${P.rest.length}건(이용 서비스·금액 미정 등)도 점검에 전부 있습니다 · <button class="lk gov" data-v="check">전체 보기 ›</button></p>
    <p>창업·출산·이사 같은 계획이 있으면 순서가 달라집니다 · <button class="lk gov" data-v="road">목표별로 다시 짜기 ›</button></p>
  </div>
  <p style="font-size:12px;color:var(--ink-3);margin-top:10px;line-height:1.6">순서는 기한 → 신청만 하면 들어오는 돈(큰 순) → 준비가 필요한 돈 → 자격 확인 → 심사형 → 할인·감면 → 행정 → 대출 규칙으로 정합니다. 같은 정보면 언제나 같은 순서가 나옵니다.</p>`; }

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
  main.querySelectorAll('.aimore').forEach(b=>b.onclick=()=>keep(()=>{ S.aiMore=S.aiMore||{}; S.aiMore[decodeURIComponent(b.dataset.k)]=1; }));
  main.querySelectorAll('.gov').forEach(b=>b.onclick=()=>{ S.view=b.dataset.v; drawNav(); draw(); window.scrollTo({top:0,left:0,behavior:'instant'}); }); }
