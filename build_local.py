#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""보조금24 수집분 → 지자체 제도 규칙 파일

  python build_local.py --region 서울특별시
  python build_local.py --region 서울특별시 --gu 종로구 --out data/local-seoul.js

입력  out/serviceList.jsonl · out/supportConditions.jsonl   (fetch_gov24.py 결과)
출력  data/local-<지역>.js   — LOCAL_RULES 배열. rules.js 의 항목과 같은 모양입니다.

무엇을 자동으로 옮기고 무엇을 안 옮기는지
  옮긴다   지역(소관기관명) · 연령 상하한(JA0110/0111) · 성별(JA0101/0102)
           금액(지원내용에서 뽑히는 것만) · 신청처 · 구비서류 · 절차 · 상세 링크
  안 옮긴다 소득 구간 — 코드가 'Y/없음' 플래그라 중위 몇 %인지 알 수 없습니다.
           금액이 안 뽑히는 건 — mv 없이 '받을 수 있습니다' 까지만
  이 둘은 화면에서 CHK(확인 필요)로 나갑니다. 모른다고 표시하는 것이 이 제품의 규칙입니다.

검증 등급
  chk.lvl='api' — 행정안전부가 등록한 기관 자료에서 자동으로 옮긴 것.
  공고 원문과 대조한 것이 아니므로 화면에 그대로 그렇게 표시됩니다.
"""
import argparse, io, json, os, re, sys, collections
from datetime import date

NUM = re.compile(r'(?<![\d,])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(만\s*원|원)')
AFTER_BAD = re.compile(r'^\s*(이하|이상|미만|초과|까지|단위|상당)')      # 기준선을 말하는 숫자
BEFORE_BAD = re.compile(r'(보험료|소득|재산|공시지가|판매금액|구매금액|정가|보증금|한도액|기준)\s*\(?\s*$')
GIVE = re.compile(r'지원|지급|교부|보조|드립니다|혜택|제공|1인당|매월|월정액')
SPACE = re.compile(r'\s+')

def clean(s, n=None):
    s = SPACE.sub(' ', (s or '')).strip()
    return s[:n] if n else s

def esc(s):
    return (s or '').replace('\\', '\\\\').replace("'", "\\'").replace('\n', ' ')

def won(txt):
    """지원 금액을 뽑습니다. 자격 기준선·판매가를 지원금으로 오해하지 않도록
       숫자 앞뒤를 같이 봅니다. 확신이 없으면 None — 지어내지 않습니다."""
    if not txt: return None
    best = None
    for m in NUM.finditer(txt):
        after = txt[m.end():m.end() + 8]
        before = txt[max(0, m.start() - 12):m.start()]
        if AFTER_BAD.search(after) or BEFORE_BAD.search(before): continue
        if not GIVE.search(txt[max(0, m.start() - 18):m.end() + 18]): continue
        v = float(m.group(1).replace(',', '')) * (1 if '만' in m.group(2) else 1 / 10000)
        if v < 0.5 or v > 100000: continue
        if best is None or v > best: best = v
    return round(best, 1) if best else None

INCOME_TXT = re.compile(r'중위\s*소득\s*(?:의\s*)?(\d{2,3})\s*%\s*(이하|미만)')
# 보조금24 소득 구간 코드 · 본문과 대조해 확인한 매핑 (2026-09-21)
BRACKETS = [('JA0201', 50), ('JA0202', 75), ('JA0203', 100), ('JA0204', 200), ('JA0205', 10**6)]

def income_gate(row, cond):
    """('text'|'flag'|'none'|'unk', 상한%) — 상한 None 은 소득 제한 없음"""
    txt = (row.get('지원대상') or '') + ' ' + (row.get('선정기준') or '')
    m = INCOME_TXT.search(txt)
    if m:
        v = int(m.group(1))
        return 'text', v - 0.01 if m.group(2) == '미만' else v
    flags = [cond.get(k) == 'Y' for k, _ in BRACKETS]
    if not any(flags): return 'unk', None
    if all(flags): return 'none', None
    top = max(cap for (k, cap), f in zip(BRACKETS, flags) if f)
    return 'flag', top

def cycle(txt):
    """해마다인지 한 번인지. 애매하면 once 로 둡니다(적게 세는 쪽)."""
    t = txt or ''
    if re.search(r'매\s*(월|달)|월\s*\d|매월', t): return 'y', 12
    if re.search(r'연\s*\d|매년|년\s*\d회', t): return 'y', 1
    return 'once', 1

def docs(row):
    """구비서류 텍스트를 doc 배열로. 앱이 가져올 수 있는 것과 본인이 올릴 것을 나눕니다."""
    raw = clean(row.get('구비서류'))
    if not raw: return [['신분증', 'self'], ['본인 명의 통장 사본', 'self']]
    parts = [p.strip(' ·-○') for p in re.split(r'[,·\n]|\d\)', raw) if len(p.strip()) > 1][:6]
    AUTO = re.compile(r'주민등록|가족관계|건강보험|사업자등록|소득금액|등기|납세|국세|지방세')
    out = []
    for p in parts:
        p = clean(p, 28)
        out.append([p, 'auto' if AUTO.search(p) else 'self'])
    return out or [['신분증', 'self']]

def how(row):
    raw = clean(row.get('신청방법'))
    steps = [s for s in re.split(r'\|\||,', raw) if s.strip()][:4]
    return steps or ['신청처 확인', '신청서 제출', '자격 확인', '지급']

def build(svc, cond, region, gu=None):
    byid = {r['서비스ID']: r for r in cond}
    rows = []
    for r in svc:
        org = r.get('소관기관명') or ''
        if not org.startswith(region): continue
        if gu and gu not in org: continue
        rows.append(r)

    items, stat = [], collections.Counter()
    for r in rows:
        sid = r['서비스ID']
        c = byid.get(sid, {})
        name = clean(r.get('서비스명'), 40)
        org = clean(r.get('소관기관명'))
        # 지역 게이트 — 시군구 이름이 있으면 그 주민만
        m = re.search(r'(\S+[시군구])$', org.split()[-1]) if org else None
        area = org.split()[-1] if len(org.split()) > 1 else region

        lo, hi = c.get('JA0110'), c.get('JA0111')
        try: lo = int(lo) if lo not in (None, '') else None
        except: lo = None
        try: hi = int(hi) if hi not in (None, '') else None
        except: hi = None
        if hi is not None and hi >= 120: hi = None     # 120 은 '제한 없음'

        male, female = c.get('JA0101') == 'Y', c.get('JA0102') == 'Y'
        gender = None if (male and female) or (not male and not female) else ('m' if male else 'f')

        content = clean(r.get('지원내용'))
        v = won(content)
        kind, mul = cycle(content)
        if v: stat['금액 있음'] += 1
        else: stat['금액 없음'] += 1
        if lo is not None or hi is not None: stat['연령 조건 있음'] += 1

        # 판정 함수 — 지역과 나이만 확정으로 가르고, 나머지는 모른다고 합니다
        gates = [f"!(c.region||'').includes('{esc(area)}') ? NO('{esc(area)} 주민 대상입니다')"]
        if lo: gates.append(f"c.age<{lo} ? NO('만 {lo}세 이상이어야 합니다')")
        if hi: gates.append(f"c.age>{hi} ? NO('만 {hi}세 이하여야 합니다')")
        if gender == 'f': gates.append("c.sex==='m' ? NO('여성 대상입니다')")
        if gender == 'm': gates.append("c.sex==='f' ? NO('남성 대상입니다')")

        src, cap = income_gate(r, c)
        stat['소득 · ' + {'text':'본문 숫자','flag':'구간 코드','none':'제한 없음','unk':'알 수 없음'}[src]] += 1
        if cap is not None and cap < 10**6:
            how_ = '공고 기준' if src == 'text' else '구간 코드 기준 · 실제 기준은 더 낮을 수 있습니다'
            gates.append(f"(c.home.incomeRate||0)>{cap:g} ? NO('중위 '+c.home.incomeRate+'% · 기준 {cap:g}% 이하 ({how_})')")
        if src == 'unk':
            gates.append("true ? CHK('소득 기준 미확인','기관 자료에 소득 기준이 코드로 등록돼 있지 않습니다')")

        if v:
            tail = (f"OK('{esc(clean(r.get('지원유형')) or '지원')} {v}만',"
                    f"'{esc(clean(r.get('지원대상'), 60))}','요건 충족 시',"
                    f"{{{kind}:{round(v*mul,1)}}})")
        else:
            # 자격은 되는데 얼마인지 숫자가 없을 뿐입니다 — '확인 필요' 가 아니라 '가능'
            tail = (f"OK('{esc(clean(r.get('지원유형')) or '지원')}',"
                    f"'{esc(clean(r.get('지원대상'), 60))}','금액은 기관 자료에 숫자로 적혀 있지 않습니다')")
        fsrc = '\n    : '.join(gates + [tail])

        items.append(f"""  {{n:'{esc(name)}', type:'cash', where:'{esc(org)}', visit:'center',
   chk:{{d:'{date.today()}', src:'행정안전부 공공서비스 정보 · {esc(org)} 등록분',
        u:'{esc(r.get('상세조회URL') or '')}', lvl:'api'}},
   guide:{{what:'{esc(clean(r.get('지원내용'), 110))}',
     doc:{json.dumps(docs(r), ensure_ascii=False)},
     how:{json.dumps(how(r), ensure_ascii=False)},
     warn:'{esc(clean(r.get('선정기준') or r.get('지원대상'), 110))}',
     time:'{esc(clean(r.get('신청기한'), 40)) or '상시'}', s:''}},
   f:c=> {fsrc}}},""")
    return items, stat, len(rows)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--region', default='서울특별시')
    ap.add_argument('--gu', default=None)
    ap.add_argument('--src', default='out')
    ap.add_argument('--out', default=None)
    a = ap.parse_args()

    def load(n):
        p = os.path.join(a.src, n)
        if not os.path.exists(p): sys.exit(f'{p} 가 없습니다. fetch_gov24.py 를 먼저 돌리세요.')
        return [json.loads(l) for l in io.open(p, encoding='utf-8')]

    svc, cond = load('serviceList.jsonl'), load('supportConditions.jsonl')
    items, stat, total = build(svc, cond, a.region, a.gu)
    out = a.out or f"data/local-{a.region}.js"
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    head = (f"/* {a.region} 지자체 제도 {len(items)}건 · 행정안전부 공공서비스 정보에서 자동 변환\n"
            f"   생성 {date.today()} · build_local.py\n"
            f"   전부 chk.lvl='api' 입니다 — 기관 등록 자료 기준이고 공고 원문과 대조한 것이 아닙니다.\n"
            f"   금액이 적혀 있지 않은 건은 CHK 로 나갑니다. 모르는 것은 모른다고 표시합니다. */\n"
            f"const LOCAL_RULES=[\n")
    io.open(out, 'w', encoding='utf-8').write(head + '\n'.join(items) + '\n];\n')
    print(f"{a.region} {total}건 중 {len(items)}건 변환 → {out}")
    for k, v in stat.most_common(): print(f"  {v:>5}  {k}")

if __name__ == '__main__':
    main()
