from pathlib import Path
from zipfile import ZipFile
from lxml import etree
from pypdf import PdfReader
import unicodedata
import build_edition as b

def norm(t):
    return ''.join(c.lower() for c in unicodedata.normalize('NFKD',t) if c.isalnum())

single=PdfReader(b.OUT/'Schlelberg - single-page edition.pdf')
source=PdfReader(b.OUT/'Schlelberg - redesigned illustrated edition.pdf')
assert len(single.pages)==len(source.pages)==292
assert single.trailer['/Root']['/PageLayout']=='/SinglePage'
assert len(single.outline)==len(source.outline)==33
for i in range(len(source.pages)):
    assert single.pages[i].extract_text()==source.pages[i].extract_text()
assert len(single.pages[8]['/Annots'])==len(single.pages[9]['/Annots'])==16

epub=b.OUT/'Schlelberg - illustrated edition.epub'
with ZipFile(epub) as z:
    assert z.namelist()[0]=='mimetype'
    assert z.getinfo('mimetype').compress_type==0
    assert z.testzip() is None
    names=set(z.namelist())
    assert len([n for n in names if n.startswith('OEBPS/images/')])==7
    nav=etree.fromstring(z.read('OEBPS/nav.xhtml'))
    assert len(nav.xpath('//*[local-name()="a"]'))==36
    for n,(title,blocks) in enumerate(b.CHAPTERS,1):
        root=etree.fromstring(z.read(f'OEBPS/chapter-{n:02}.xhtml'))
        ps=root.xpath('//*[local-name()="p" and not(contains(@class,"scene"))]')
        expected=norm(' '.join(x for x in blocks if x!='***').replace('*',''))
        actual=norm(' '.join(''.join(p.itertext()) for p in ps))
        assert actual==expected,(n,len(expected),len(actual))
    for name in names:
        if name.endswith(('.xhtml','.opf','.xml')):etree.fromstring(z.read(name))
print('Validated: 292 one-page PDF pages, 32 chapter texts, 6 illustrations, complete EPUB archive.')
