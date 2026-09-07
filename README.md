# 빠짐없이

내가 받을 수 있는 것을 기록하고 판정하는 서비스의 시연용 프로토타입입니다.

## 파일 구조

```
index.html      화면 틀과 랜딩
app.js          화면 로직
data/rules.js   제도 규칙 데이터베이스 (15개 분야 86건)
data/people.js  페르소나와 역할 데이터베이스 (10명)
deploy.bat      배포 (파일 수정 후 더블클릭)
```

## 데이터 수정하는 법

**제도를 추가하거나 조건을 고칠 때** — `data/rules.js`

```js
{n:'제도 이름', where:'신청처', visit:'center',
 f:c=> c.age>34 ? NO('만 34세 초과')
     : OK('월 20만','요건 충족', 60, '추첨')}
```

- `c` 는 그 사람의 사실 정보입니다 (`c.age`, `c.home.incomeRate`, `c.biz.years` 등)
- `OK(금액, 사유, 선정가능성, 경쟁률)` / `NO(사유)` / `LOST(금액, 사유)` / `CHK(금액, 사유)`
- `visit` 은 `center` `bank` `office` `company` `online` 중 하나이며 방문 묶음에 쓰입니다

**사람을 추가할 때** — `data/people.js` 의 `CTX`

```js
k:mk({name:'이름', sub:'설명', age:33, region:'서울',
  work:{on:true, sme:true, insured:900},
  home:{rent:true, deposit:3000, incomeRate:120}})
```

`mk()` 가 나머지 항목을 기본값으로 채우므로 **달라지는 것만** 적으면 됩니다.

## 배포

1. 파일 수정
2. `deploy.bat` 더블클릭
3. 1~2분 뒤 같은 주소에 반영
