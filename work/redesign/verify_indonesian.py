from zipfile import ZipFile
from pathlib import Path
from lxml import etree
from pypdf import PdfReader
import pdfplumber,unicodedata,json
import build_indonesian as d

def norm(s):return ''.join(c.lower() for c in unicodedata.normalize('NFKD',s) if c.isalnum())

layout=json.loads((d.WORK/'layout-id.json').read_text(encoding='utf-8'))
pdf=PdfReader(d.OUT/'Schlelberg - edisi bahasa Indonesia.pdf')
body=PdfReader(d.WORK/'body-id.pdf')
assert pdf.trailer['/Root']['/PageLayout']=='/SinglePage'
assert len(pdf.outline)==33
assert len(pdf.pages[8]['/Annots'])==len(pdf.pages[9]['/Annots'])==16
assert all(int(v)%2==1 for v in layout['starts'].values())
assert all(p['folio']%2==0 for p in layout['plates'])
errors=[]
for n,(title,blocks) in enumerate(d.CHAPTERS,1):
    first=layout['starts'][str(n)]
    last=layout['starts'].get(str(n+1),len(body.pages)+1)-1
    expected=norm(' '.join(x for x in blocks if x!='***').replace('*',''))
    text=[]
    for idx in range(first-1,last):
        if layout['body_pages'][idx]['kind']!='text':continue
        lines=(body.pages[idx].extract_text() or '').splitlines()
        lines=[s for s in lines if s.strip() not in ['SULASTONY CO.','SCHLELBERG',str(idx+1)]]
        text.append('\n'.join(lines))
    actual=norm('\n'.join(text))
    prefix=norm(f'BAB {n} {title}')
    if not actual.startswith(prefix) or actual[len(prefix):]!=expected:errors.append(n)
assert not errors,errors
boundary=[]
with pdfplumber.open(d.OUT/'Schlelberg - edisi bahasa Indonesia.pdf') as f:
    for n,p in enumerate(f.pages,1):
        if any(c['x0']<-.5 or c['x1']>d.W+.5 or c['top']<-.5 or c['bottom']>d.H+.5 for c in p.chars):boundary.append(n)
assert not boundary,boundary

ep=d.OUT/'Schlelberg - edisi bahasa Indonesia.epub'
with ZipFile(ep) as z:
    assert z.namelist()[0]=='mimetype' and z.getinfo('mimetype').compress_type==0
    assert z.testzip() is None
    names=set(z.namelist());assert len([s for s in names if s.startswith('OEBPS/images/')])==7
    for name in names:
        if name.endswith(('.xhtml','.opf','.xml')):etree.fromstring(z.read(name))
    for n,(title,blocks) in enumerate(d.CHAPTERS,1):
        page=etree.fromstring(z.read(f'OEBPS/chapter-{n:02}.xhtml'))
        ps=page.xpath('//*[local-name()="p" and not(contains(@class,"scene"))]')
        actual=norm(' '.join(''.join(p.itertext()) for p in ps))
        expected=norm(' '.join(x for x in blocks if x!='***').replace('*',''))
        assert actual==expected,n
print(f'Validated {len(pdf.pages)} PDF pages, 32 complete chapters, 6 plates and EPUB XML/contents.')
