#!/usr/bin/env python3
"""index.html 을 Artifact 게시용으로 변환합니다.
Artifact 는 <!doctype>/<html>/<head>/<body> 를 자기가 씌우므로 그 껍데기를 벗깁니다.
data/*.js 와 app.js 는 supporting files 로 같이 올라가므로 <script src> 는 그대로 둡니다."""
import re, io, pathlib
src = io.open('index.html', encoding='utf-8').read()
head = re.search(r'<head[^>]*>(.*?)</head>', src, re.S).group(1)
body = re.search(r'<body[^>]*>(.*?)</body>', src, re.S).group(1)
keep = []
for m in re.finditer(r'<title>.*?</title>|<style[^>]*>.*?</style>', head, re.S):
    keep.append(m.group(0))
out = '\n'.join(keep) + '\n' + body.strip() + '\n'
pathlib.Path('artifact').mkdir(exist_ok=True)
io.open('artifact/page.html','w',encoding='utf-8').write(out)
print('artifact/page.html', len(out), 'bytes')
