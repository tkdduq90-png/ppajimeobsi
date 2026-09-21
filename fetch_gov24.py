#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""보조금24(행정안전부 대한민국 공공서비스 정보) 전수 수집

쓰는 법
  1) https://www.data.go.kr/data/15113968/openapi.do 에서 활용신청 (자동승인)
  2) 마이페이지 > 오픈API > 인증키에서 '일반 인증키(Decoding)' 복사
  3) 아래 중 하나로 키를 넣고 실행
       set GOV24_KEY=발급받은키   &&  python fetch_gov24.py        (Windows)
       GOV24_KEY=발급받은키 python3 fetch_gov24.py                  (mac/Linux)
       python fetch_gov24.py --key 발급받은키

만드는 것
  out/serviceList.jsonl        서비스 목록 전체
  out/serviceDetail.jsonl      구비서류·문의처·온라인신청URL·법령 (--detail 일 때)
  out/supportConditions.jsonl  자격 요건 코드 (JA*)
  out/summary.txt              총 건수 · 소관기관유형별 · 지역별 · 분야별 집계

주의
  개발계정은 일일 10,000회 제한입니다. serviceList 만 받으면 perPage=1000 기준
  10여 회로 끝나지만, --detail 은 서비스 하나당 1회라 전수를 받으면 한도를 넘깁니다.
  --detail 은 --limit 으로 나눠서 여러 날에 걸쳐 받으세요.
"""
import argparse, json, os, sys, time, collections
from urllib.parse import urlencode
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

BASE = "https://api.odcloud.kr/api/gov24/v3"
OUT  = "out"

def get(path, key, page=1, per=1000, extra=None, tries=4):
    q = {"page": page, "perPage": per, "serviceKey": key}
    if extra: q.update(extra)
    url = f"{BASE}/{path}?{urlencode(q)}"
    for n in range(tries):
        try:
            req = Request(url, headers={"Accept": "application/json"})
            with urlopen(req, timeout=40) as r:
                return json.loads(r.read().decode("utf-8"))
        except HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:300]
            if e.code in (429, 500, 502, 503):
                time.sleep(2 * (n + 1)); continue
            sys.exit(f"[HTTP {e.code}] {path} · {body}\n"
                     f"→ 401/403 이면 인증키가 틀렸거나 활용신청이 아직 승인되지 않은 것입니다.")
        except URLError as e:
            time.sleep(2 * (n + 1))
    sys.exit(f"[실패] {path} page={page} · 재시도 한도 초과")

def page_all(path, key, per=1000, limit=None, label=""):
    rows, page = [], 1
    first = get(path, key, 1, per)
    total = first.get("totalCount", 0)
    rows += first.get("data", [])
    print(f"  {label or path}: 총 {total:,}건")
    while len(rows) < (limit or total):
        page += 1
        d = get(path, key, page, per)
        got = d.get("data", [])
        if not got: break
        rows += got
        print(f"    {len(rows):,} / {total:,}", end="\r", flush=True)
        time.sleep(0.15)
    print(f"    {len(rows):,} / {total:,} 완료")
    return rows[:limit] if limit else rows

def dump(name, rows):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name)
    with open(p, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"  → {p} ({len(rows):,}줄)")
    return p

def summarize(svc, cond):
    L = []
    L.append(f"총 서비스: {len(svc):,}건\n")

    def count(field, title, top=None):
        c = collections.Counter((r.get(field) or "(없음)") for r in svc)
        L.append(f"\n[{title}] {len(c)}종")
        for k, v in c.most_common(top):
            L.append(f"  {v:>6,}  {k}")

    count("소관기관유형", "소관기관 유형")
    count("서비스분야", "서비스 분야", 30)
    count("지원유형", "지원 유형", 20)
    count("소관기관명", "소관기관", 40)

    # 지자체 제도가 몇 건인지 — 우리 제품의 최대 공백
    # 유형 값이 '지자체' 가 아니라 '시군구' · '광역시도' 로 들어옵니다
    LOCAL = {"시군구", "광역시도", "지방공기업", "지방출자_출연기관"}
    loc = [r for r in svc if (r.get("소관기관유형") or "") in LOCAL]
    L.append(f"\n[지자체 소관] {len(loc):,}건 ({len(loc)/max(len(svc),1)*100:.1f}%)")
    byorg = collections.Counter(r.get("소관기관명") or "(없음)" for r in loc)
    for k, v in byorg.most_common(40):
        L.append(f"  {v:>6,}  {k}")

    if cond:
        keys = collections.Counter()
        for r in cond:
            for k, v in r.items():
                if k.startswith("JA") and v not in (None, "", "N"):
                    keys[k] += 1
        L.append(f"\n[자격요건 코드 사용 빈도] {len(cond):,}건 기준")
        for k, v in keys.most_common(40):
            L.append(f"  {v:>6,}  {k}")

    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, "summary.txt")
    open(p, "w", encoding="utf-8").write("\n".join(L))
    print("\n".join(L[:14]))
    print(f"  → {p}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", default=os.environ.get("GOV24_KEY"))
    ap.add_argument("--per", type=int, default=1000, help="한 번에 받을 건수 (최대 1000)")
    ap.add_argument("--limit", type=int, default=None, help="이번에 받을 최대 건수")
    ap.add_argument("--detail", action="store_true", help="serviceDetail 도 받기 (호출 수 많음)")
    a = ap.parse_args()
    if not a.key:
        sys.exit("인증키가 없습니다. --key 로 넣거나 환경변수 GOV24_KEY 를 설정하세요.")

    print("서비스 목록")
    svc = page_all("serviceList", a.key, a.per, a.limit, "serviceList")
    dump("serviceList.jsonl", svc)

    print("\n자격 요건")
    cond = page_all("supportConditions", a.key, a.per, a.limit, "supportConditions")
    dump("supportConditions.jsonl", cond)

    if a.detail:
        print("\n상세 (구비서류·온라인신청URL·법령)")
        det = page_all("serviceDetail", a.key, a.per, a.limit, "serviceDetail")
        dump("serviceDetail.jsonl", det)

    print("\n집계")
    summarize(svc, cond)

if __name__ == "__main__":
    main()
