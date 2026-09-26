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
    if not any(flags):
        # 코드가 비어 있으면 대부분 소득을 안 보는 사업입니다 (전국 공통 538건 중 98%).
        # 본문에 소득 얘기가 있을 때만 모른다고 합니다.
        if re.search(r'소득|중위|차상위|수급자|저소득', txt): return 'unk', None
        return 'none', None
    if all(flags): return 'none', None
    top = max(cap for (k, cap), f in zip(BRACKETS, flags) if f)
    return 'flag', top

# 대상 특성 코드 · 서비스명과 대조해 풀어낸 매핑 (2026-09-21)
#   값이 1~16개 Y 면 그 대상 전용, 17개 전부 Y 거나 0개면 제한 없음/미상.
#   JA0322 는 성격이 제각각인 '기타' 라 관문으로 쓰지 않습니다.
TARGET = [
  ('JA0301', '난임·예비부모',  "c.fam.pregnant"),
  ('JA0302', '임산부',        "c.fam.pregnant"),
  ('JA0303', '출산·입양 가정', "(c.fam.infant||c.fam.pregnant)"),
  ('JA0313', '농업인',        "c.misc.farm"),
  ('JA0314', '어업인',        "c.misc.farm"),
  ('JA0315', '축산인',        "c.misc.farm"),
  ('JA0316', '임업인',        "c.misc.farm"),
  ('JA0317', '초등학생 가정',  "(c.fam.elem>0)"),
  ('JA0318', '중학생 가정',    "(c.fam.mid>0)"),
  ('JA0319', '고등학생 가정',  "(c.fam.high>0)"),
  ('JA0320', '대학생',        "c.fam.college"),
  ('JA0326', '근로자',        "c.work.on"),
  ('JA0327', '구직자',        "(!c.work.on&&!c.biz.on)"),
  ('JA0328', '장애인',        "c.misc.disabled"),
  ('JA0329', '국가보훈 대상자', "false"),
  ('JA0330', '질병·질환이 있는 분', "c.misc.chronic"),
]
ALLT = [k for k, _, _ in TARGET] + ['JA0322']

# 코드가 믿을 수 없을 때 본문에서 읽는 대상어 · (정규식, 이름, 조건식)
#   조건식이 'false' 인 것은 이 앱이 아직 모르는 신분입니다 — 해당 없음으로 봅니다.
TEXT_TARGET = [
  (r'영유아|유아|어린이집|아동(?!청소년)|초등', '자녀를 둔 가정',  "(c.fam.kids>0)"),
  (r'청소년|중학생|고등학생|학생',          '학생 자녀 가정',  "(c.fam.mid>0||c.fam.high>0||c.fam.college)"),
  (r'노인|어르신|65세\s*이상|고령',        '어르신',        "(c.age>=65)"),
  (r'장애',                             '장애인',        "c.misc.disabled"),
  (r'임산부|임신|난임|출산',               '임신·출산 가정', "(c.fam.pregnant||c.fam.infant)"),
  (r'기초생활|차상위|수급자|저소득', '저소득 가구',    "(c.misc.welfare||(c.home.incomeRate||100)<=60)"),
  (r'농업|농가|농촌|농산물|농식품|농기계|농지|축산|가축|임업|산림|임산물|어업|어가|수산|어선|선박|해양|초지|채종|과실|원예|화훼|양봉|종자|귀농|귀어|식물', '농림어업인', "c.misc.farm"),
  (r'보훈|국가유공|참전|유공자',            '국가보훈 대상자', "false"),
  (r'한부모|조손',                        '한부모 가정',    "c.misc.single"),
  (r'다문화|결혼이민|북한이탈|탈북',         '다문화·북한이탈 가정', "false"),
  (r'노숙|쪽방',                          '노숙인',        "false"),
  (r'군인|군무원|장병|전역',               '군인·군무원',    "false"),
  (r'언론|교원|교사|공무원|간호|의료인|연구자|연구원|지도자|종사자|강사|체육인|예술인|광산|광업|발전소\s*주변', '해당 직업·지역 종사자', "false"),
  (r'구직|실업|취업준비|미취업',            '구직자',        "(!c.work.on&&!c.biz.on)"),
  (r'쪽방|고시원|반지하|비주택|주택\s*이외', '비주택 거주자',   "false"),
  (r'청년몰|입점\s*(중|상인|업체)|전통시장\s*상인', '해당 시장 입점 상인', "false"),
  (r'대학생|대학원',                      '대학생',        "c.fam.college"),
]
TEXT_RE = [(re.compile(p), n, e) for p, n, e in TEXT_TARGET]

# 사업자 코드 · 서비스명과 대조해 풀어낸 매핑 (2026-09-22)
#   JA1101 예비창업 · JA1102 영업 중 · JA1103 폐업(예정)
#   JA1201 음식점업 · JA1202 제조업·소공인 · JA1299 기타 업종 (셋 다 Y 면 소상공인 전 업종)
#   JA2102 사회복지시설·법인
#   JA2101·JA2103·JA22xx 는 부처마다 쓰는 방식이 달라 관문으로 쓰지 않습니다
FIELD_TXT = [
  (r'음식점|외식|식당|요식',                    ['음식점업']),
  (r'숙박|관광사업|여행업',                      ['숙박업']),
  (r'제조|소공인|공장|조선|선박|플랜트',            ['제조업']),
  (r'건설업|건설사|건설기업',                    ['건설업']),
  (r'운수|물류|화물|택배|운송업',                 ['운수·창고업']),
  (r'도소매|소매업|도매업|전통시장\s*상인',         ['도소매업']),
  (r'소프트웨어|정보통신|ICT|SW\b',              ['정보통신업']),
  (r'통신판매|온라인\s*(쇼핑|판매|몰)|전자상거래|이커머스', ['통신판매업']),
]
FIELD_RE = [(re.compile(p), f) for p, f in FIELD_TXT]
YEARS_RE = re.compile(r'(?:창업|업력|설립|개업)\s*(?:후|한\s*지)?\s*(\d{1,2})\s*년\s*(이내|미만|이하|이상|초과)')
EMP_RE   = re.compile(r'상시\s*근로자\s*(?:수\s*)?(\d{1,4})\s*(?:인|명)\s*(미만|이하)')

def biz_gate(cond, row):
    """사업자 요건 관문 · (관문들, 실제로 확인한 요건이 있는지, 예비창업 전용인지)"""
    g, sure, pre = [], False, False
    txt = (row.get('서비스명') or '') + ' ' + (row.get('지원대상') or '')
    s11 = [k for k in ('JA1101','JA1102','JA1103') if cond.get(k) == 'Y']
    if s11 == ['JA1101']:
        pre = True; sure = True
        g.append("c.biz.on ? NO('예비창업자 대상입니다 · 이미 사업자가 있습니다')")
        g.append("!c.biz.plan ? NO('창업을 준비하는 분 대상입니다')")
    elif s11 == ['JA1103']:
        sure = True; g.append("!c.biz.close ? NO('폐업했거나 폐업 예정인 사업자 대상입니다')")
    s12 = [k for k in ('JA1201','JA1202','JA1299') if cond.get(k) == 'Y']
    if s12 == ['JA1201']:
        sure = True; g.append("c.biz.field!=='음식점업' ? NO('음식점업 대상입니다')")
    elif s12 == ['JA1202']:
        sure = True; g.append("c.biz.field!=='제조업' ? NO('제조업·소공인 대상입니다')")
    if s12:
        sure = True; g.append("!isSosang(c.biz) ? NO('소상공인 대상입니다 · 상시근로자 기준을 넘습니다')")
    s21 = [k for k in ('JA2101','JA2102','JA2103') if cond.get(k) == 'Y']
    if s21 == ['JA2102']:
        g.append("true ? NO('사회복지시설·법인 대상입니다')")
    fs = sorted({f for rx, fl in FIELD_RE if rx.search(txt) for f in fl})
    if fs:
        sure = True; g.append(f"!{json.dumps(fs, ensure_ascii=False)}.includes(c.biz.field) ? NO('{'·'.join(fs)} 대상입니다')")
    m = YEARS_RE.search(txt)
    if m:
        n, w = int(m.group(1)), m.group(2); sure = True
        if w in ('이상', '초과'):
            g.append(f"(c.biz.years||0){'<' if w=='이상' else '<='}{n} ? NO('업력 {n}년 {w} 대상입니다')")
        else:
            lim = n if w != '미만' else n - 0.01
            g.append(f"(c.biz.years||0)>{lim:g} ? NO('업력 {n}년 {w} 대상입니다')")
    m = EMP_RE.search(txt)
    if m:
        n = int(m.group(1)); op = '>=' if m.group(2) == '미만' else '>'
        sure = True; g.append(f"(c.biz.emp||0){op}{n} ? NO('상시근로자 {n}명 {m.group(2)} 대상입니다')")
    return g, sure, pre

# 소관 기관만으로 대상이 분명한 경우 — 본문에 업종 말이 없어도 걸러야 합니다
AGENCY_FARM = re.compile(r'농림축산식품부|농촌진흥청|산림청|해양수산부|농어촌공사|수산자원|농림수산|농업정책보험|축산물품질|국립수산|국립농산물')

# 그 일이 생겨야 받는 제도 — 지금 받을 수 있는 것으로 세면 안 됩니다
# 질환 — 질환이 있는 분에게는 지금도 해당될 수 있습니다
ILL   = re.compile(r'희귀|난치|중증|암\s*환자|암환자|치매|질환')
# 사건 — 그 일이 생겨야만 받습니다. 질환 여부와 무관합니다
# 제도 이름·소관 기관에 박힌 대상 — 대상 코드보다 우선합니다.
#   본문은 '장애인·다문화·북한이탈주민 등' 처럼 나열이 많아 여기서는 보지 않습니다.
HARD_NAME = [
  (re.compile(r'다문화|결혼이민|북한이탈|탈북'), '다문화·북한이탈 가정', 'false'),
  (re.compile(r'보훈|국가유공|참전|유공자'),     '국가보훈 대상자',     'false'),
  (re.compile(r'교원|교사|공무원|군인|군무원|장병|언론인|의료인|연구자|체육인|예술인|과학기술인'), '해당 직업 종사자', 'false'),
  (re.compile(r'입양'),                          '입양 가정',          'false'),
  (re.compile(r'노숙|쪽방'),                      '노숙인',            'false'),
  (re.compile(r'장애'),                          '장애인',            'c.misc.disabled'),
  (re.compile(r'노인|어르신|고령'),                 '어르신',            '(c.age>=65)'),
  (re.compile(r'스마트팜|영농|농업인|어업인|귀농|귀어'), '농림어업인',    'c.misc.farm'),
]
HARD_AGENCY = re.compile(r'국가보훈부|보훈복지의료공단|보훈교육연구원')

# 이름에 있으면 사건 제도입니다
EVENT = re.compile(r'사망|위기\s*임신|보호\s*출산|조산아|저체중|감염병|격리|재난|재해|피해자|피해\s*지원|피해사건|사고|산재|산업재해|실종|유족|장례|화재|범죄|학대|폭력|위기\s*가구|긴급|도산|체불|파산')
# 대상 본문에서는 강한 말만 — 본문은 '빈곤위기가구·유족 포함' 처럼 나열이 많아 넓게 읽으면 틀립니다
EVENT_BODY = re.compile(r'감염병|격리|피해자(?!.*포함)|도산|체불|파산|실종|사고\s*(를|로|피해)')

# '누구나' 신호 — 대상 코드나 대상어보다 먼저 봅니다
OPEN_RE = re.compile(r'누구나|전\s*국민|국민\s*(모두|누구)|모든\s*(국민|주민|시민|구민)|제한\s*(없|무)|'
                     r'일반\s*(국민|인|대상)|관내\s*(성인|주민|구민)|^\W*(대\s*상\s*[:：]?\s*)?[가-힣]{1,6}(구|시|군)\s*민\W*$')
# 우선·특별·가점 대상 — 자격이 아니라 가산점입니다. 이 문장의 대상어로는 거르지 않습니다
PRIO_RE = re.compile(r'우선\s*(공급|선발|지원|순위|대상)?|특별\s*대상|가점|우대|감면\s*대상|감면\s*혜택')

def general_part(txt):
    """우선·특별 대상 문장을 걷어낸 본문"""
    parts = re.split(r'[○※\n]|(?<=[.)])\s|\s-\s', txt or '')
    return ' '.join(p for p in parts if not PRIO_RE.search(p))

def is_open(row):
    t = (row.get('지원대상') or '').strip()
    return bool(OPEN_RE.search(t)) or bool(OPEN_RE.search(general_part(t)))

def target_gate(cond, row=None):
    """(관문 식 | None, 상태)  상태: code · text · open · unk"""
    if row and is_open(row):                         # 누구나 · 관내 성인 · ○○구민 — 코드보다 먼저
        return None, 'open'
    ys = [k for k in ALLT if cond.get(k) == 'Y']
    hit = [(n, e) for k, n, e in TARGET if k in ys]
    body = (row.get('지원대상') or '') if row else ''
    # 본문에 우선·특별 대상이 있으면 코드는 그 우선 대상을 찍은 것일 수 있습니다 — 믿지 않습니다
    prio = bool(PRIO_RE.search(body))
    if ys and len(ys) < 15 and hit and not prio:     # 코드가 특정 대상을 가리키는 경우만 믿습니다
        names = '·'.join(n for n, _ in hit[:3])
        return f"!({'||'.join(e for _, e in hit)}) ? NO('{names} 대상입니다')", 'code'
    # 코드 없음 · JA0322 만 · 전부 Y — 실제 대상은 본문에만 있습니다
    txt = (row.get('서비스명') or '') + ' ' + general_part(row.get('지원대상') or '') if row else ''
    found = [(n, e) for rx, n, e in TEXT_RE if rx.search(txt)]
    if found:
        names = '·'.join(n for n, _ in found[:3])
        return f"!({'||'.join(e for _, e in found)}) ? NO('{names} 대상입니다')", 'text'
    if row and re.search(r'누구나|전\s*국민|모든\s*(국민|주민|시민|구민)|제한\s*없', txt):
        return None, 'open'
    return None, 'unk'

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

def norm(s):
    s = re.sub(r'[\s·()\-—\[\]]', '', s or '')
    s = re.sub(r'^(서울시|서울특별시)', '', s)
    return re.sub(r'(지원|사업|지급)$', '', s)

SEOUL_GU = ['종로구','중구','용산구','성동구','광진구','동대문구','중랑구','성북구','강북구','도봉구','노원구','은평구','서대문구',
            '마포구','양천구','강서구','구로구','금천구','영등포구','동작구','관악구','서초구','강남구','송파구','강동구']

MERGED = {'전남광주통합'}
ABBR = {'충청북':'충북','충청남':'충남','경상북':'경북','경상남':'경남','전라북':'전북','전라남':'전남'}
def short_of(region):
    s = re.sub(r'(특별자치시|특별자치도|특별시|광역시|도)$', '', region)
    return ABBR.get(s, s)

def build(svc, cond, region, gu=None, core=(), national=False, ctab=None, cond_only=False):
    ctab = ctab or {}
    CORE = {norm(n): n for n in core}
    byid = {r['서비스ID']: r for r in cond}
    rows = []
    for r in svc:
        org = r.get('소관기관명') or ''
        if national:
            if r.get('소관기관유형') not in ('중앙행정기관', '공공기관'): continue
        else:
            # '동대문구시설관리공단' 처럼 광역 이름 없이 구 이름으로 시작하는 산하 기관도 그 지역 것입니다
            if not (org.startswith(region) or (region == '서울특별시' and any(org.startswith(g) for g in SEOUL_GU))): continue
            if gu and gu not in org: continue
        rows.append(r)

    items, stat = [], collections.Counter()
    for r in rows:
        sid = r['서비스ID']
        # 중앙 제도를 지자체가 자기 이름으로 다시 등록한 것 — 원문 대조한 쪽을 씁니다
        if norm(r.get('서비스명')) in CORE:
            stat['중복 · 핵심 제도와 같음'] += 1
            continue
        if cond_only and sid not in ctab:
            stat['조건표 없음 · 이번엔 뺌'] += 1
            continue
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
        # 구·군·시가 붙은 기관은 그 구 주민만, 광역 기관(서울특별시·서울특별시교육청 등)은 광역 주민 전체
        gu_ = re.search(r'\s(\S+[구군시])(?:\s|$)', org + ' ')
        if not gu_:
            g0 = next((g for g in SEOUL_GU if org.startswith(g)), None)
            if g0: gu_ = re.search(r'(.+)', g0)
        if national: gates = []
        elif gu_:    gates = [f"!(c.region||'').includes('{esc(gu_.group(1))}') ? NO('{esc(gu_.group(1))} 주민 대상입니다')"]
        else:
            short = short_of(region)
            gates = [f"!(c.region||'').startsWith('{esc(short)}') ? NO('{esc(short)} 주민 대상입니다')"]
        if lo: gates.append(f"c.age<{lo} ? NO('만 {lo}세 이상이어야 합니다')")
        if hi: gates.append(f"c.age>{hi} ? NO('만 {hi}세 이하여야 합니다')")
        if gender == 'f': gates.append("c.sex==='m' ? NO('여성 대상입니다')")
        if gender == 'm': gates.append("c.sex==='f' ? NO('남성 대상입니다')")

        # 누구를 위한 제도인지 · 개인/가구가 끼어 있으면 누구나, 사업자만이면 사업자만
        who = r.get('사용자구분') or ''
        biz_only = bool(who and not re.search(r'개인|가구', who) and re.search(r'소상공인|법인|시설|단체', who))
        bz, biz_sure, pre = biz_gate(c, r) if biz_only else ([], False, False)
        if biz_only:
            if not pre: gates.append("!c.biz.on ? NO('사업자 대상입니다')")
            gates += bz
            stat['사용자 · 사업자 전용'] += 1
            stat['사업 요건 · ' + ('확인함' if biz_sure else '못 함')] += 1

        txt_all = (r.get('서비스명') or '') + ' ' + (r.get('지원대상') or '')
        open_txt = is_open(r)
        if AGENCY_FARM.search(org) and not open_txt and not re.search(r'일자리|도우미|채용|체험|견학|교육생', r.get('서비스명') or ''):
            gates.append("!c.misc.farm ? NO('농림어업인 대상입니다')"); stat['대상 · 소관 기관으로 거름'] += 1
        if EVENT.search(r.get('서비스명') or '') or EVENT_BODY.search(r.get('지원대상') or ''):
            gates.append("true ? NO('해당 상황이 생겼을 때 받는 제도입니다')"); stat['대상 · 사건 발생 시'] += 1
        elif ILL.search(txt_all):
            gates.append("!c.misc.chronic ? NO('해당 질환이 있는 분 대상입니다')"); stat['대상 · 질환'] += 1

        nm = r.get('서비스명') or ''
        hard = [(lab, e) for rx, lab, e in HARD_NAME if rx.search(nm)]
        if HARD_AGENCY.search(org) and not open_txt and not any(l == '국가보훈 대상자' for l, _ in hard): hard.append(('국가보훈 대상자', 'false'))
        if hard:                # '장애인·노인 보조기기' 처럼 이름의 나열은 어느 하나면 됩니다
            gates.append(f"!({'||'.join(e for _, e in hard)}) ? NO('{'·'.join(l for l, _ in hard)} 대상입니다')")
        if hard: stat['대상 · 이름·기관으로 거름'] += 1

        tg, how_t = target_gate(c, r)
        stat['대상 · ' + {'code':'코드로 거름','text':'본문에서 거름','open':'누구나','unk':'알 수 없음'}[how_t]] += 1
        if tg: gates.append(tg)

        src, cap = income_gate(r, c)
        stat['소득 · ' + {'text':'본문 숫자','flag':'구간 코드','none':'제한 없음','unk':'알 수 없음'}[src]] += 1
        if cap is not None and cap < 10**6:
            how_ = '공고 기준' if src == 'text' else '구간 코드 기준 · 실제 기준은 더 낮을 수 있습니다'
            gates.append(f"(c.home.incomeRate||0)>{cap:g} ? NO('중위 '+c.home.incomeRate+'% · 기준 {cap:g}% 이하 ({how_})')")
        if src == 'unk':
            gates.append("true ? CHK('소득 기준 미확인','기관 자료에 소득 기준이 코드로 등록돼 있지 않습니다')")
        if biz_only and not biz_sure:
            gates.append("true ? CHK('사업자 대상 · 세부 요건 확인 필요','업종·업력·기업규모 요건을 기관 자료에서 찾지 못했습니다')")
        elif how_t == 'unk':
            gates.append("true ? CHK('대상 확인 필요','기관 자료에 대상이 분류돼 있지 않아 누가 받는지 확정하지 못했습니다')")

        if v:
            tail = (f"OK('{esc(clean(r.get('지원유형')) or '지원')} {v}만',"
                    f"'{esc(clean(r.get('지원대상'), 60))}','요건 충족 시',"
                    f"{{{kind}:{round(v*mul,1)}}})")
        else:
            # 자격은 되는데 얼마인지 숫자가 없을 뿐입니다 — '확인 필요' 가 아니라 '가능'
            tail = (f"OK('{esc(clean(r.get('지원유형')) or '지원')}',"
                    f"'{esc(clean(r.get('지원대상'), 60))}','금액은 기관 자료에 숫자로 적혀 있지 않습니다')")
        fsrc = '\n    : '.join(gates + [tail])
        lvl, srcnote = 'api', ''
        # 조건표가 있는 제도 — 정규식 대신 사람이 옮긴 조건으로 판정합니다
        if sid in ctab:
            area = gu_.group(1) if (not national and gu_) else (None if national else short_of(region))
            m = {'amt': f"{clean(r.get('지원유형')) or '지원'} {v}만" if v else (clean(r.get('지원유형')) or '지원'),
                 'why': clean(r.get('지원대상'), 60)}
            if v: m['mv'] = {kind: round(v*mul, 1)}
            if area and area in MERGED: area = None   # 통합 광역(전남광주 등) · 지역 파일을 받는 사람만 보므로 광역 게이트 생략
            if area: m['area'] = area
            fsrc = f"condJudge({json.dumps(ctab[sid], ensure_ascii=False)},c,{json.dumps(m, ensure_ascii=False)})"
            lvl, srcnote = 'cond', ' · 조건표 대조'
            stat['조건표로 판정'] += 1

        items.append(f"""  {{n:'{esc(name)}', type:'cash', where:'{esc(org)}', visit:'center',
   chk:{{d:'{date.today()}', src:'행정안전부 공공서비스 정보 · {esc(org)} 등록분{srcnote}',
        u:'{esc(r.get('상세조회URL') or '')}', lvl:'{lvl}'}},
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
    ap.add_argument('--key', default=None, help='앱 쪽 지역 키 (서울·경기·부산 …) · c.region 앞 단어')
    ap.add_argument('--core', default=None, help='핵심 제도 이름 목록 JSON (중복 제거용)')
    ap.add_argument('--national', action='store_true', help='중앙행정기관·공공기관 전국 공통분')
    ap.add_argument('--cond-only', action='store_true', help='조건표가 있는 제도만 싣습니다')
    ap.add_argument('--cond', action='append', default=[], help='조건표 JSON (서비스ID → 조건) · 여러 번 줄 수 있음')
    a = ap.parse_args()

    def load(n):
        p = os.path.join(a.src, n)
        if not os.path.exists(p): sys.exit(f'{p} 가 없습니다. fetch_gov24.py 를 먼저 돌리세요.')
        return [json.loads(l) for l in io.open(p, encoding='utf-8')]

    svc, cond = load('serviceList.jsonl'), load('supportConditions.jsonl')
    core = json.load(io.open(a.core, encoding='utf-8')) if a.core else []
    ctab = {}
    for p in a.cond:
        d = json.load(io.open(p, encoding='utf-8')); d.pop('_', None); ctab.update(d)
    items, stat, total = build(svc, cond, a.region, a.gu, core, a.national, ctab, a.cond_only)
    key = a.key or short_of(a.region)
    SLUG = {'서울':'seoul','경기':'gyeonggi','부산':'busan','인천':'incheon','대구':'daegu','광주':'gwangju',
            '대전':'daejeon','울산':'ulsan','세종':'sejong','강원':'gangwon','충북':'chungbuk','충남':'chungnam',
            '전북':'jeonbuk','전남':'jeonnam','경북':'gyeongbuk','경남':'gyeongnam','제주':'jeju'}
    out = a.out or ('data/national.js' if a.national else f"data/local/{SLUG.get(key, key)}.js")
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    label = '중앙행정기관·공공기관 전국 공통' if a.national else f'{a.region} 지자체'
    head = (f"/* {label} 제도 {len(items)}건 · 행정안전부 공공서비스 정보에서 자동 변환\n"
            f"   생성 {date.today()} · build_local.py\n"
            f"   전부 chk.lvl='api' 입니다 — 기관 등록 자료 기준이고 공고 원문과 대조한 것이 아닙니다.\n"
            f"   금액이 숫자로 없는 것은 가능으로 두고 금액만 비웁니다. 소득 기준이 없는 것만 CHK 입니다. */\n"
            + ("window.NATIONAL=[\n" if a.national else f"(window.LOCAL_BY=window.LOCAL_BY||{{}})['{key}']=[\n"))
    io.open(out, 'w', encoding='utf-8').write(head + '\n'.join(items) + '\n];\n')
    print(f"{label} {total}건 중 {len(items)}건 변환 → {out}")
    for k, v in stat.most_common(): print(f"  {v:>5}  {k}")

if __name__ == '__main__':
    main()
