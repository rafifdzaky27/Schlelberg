from pathlib import Path
import json,re,unicodedata,difflib
from pypdf import PdfReader
from PIL import Image,ImageDraw
import pdfplumber
import build_edition as b

ROOT=b.ROOT;W=b.W;H=b.H
data=json.loads((b.WORK/'layout.json').read_text())
reader=PdfReader(b.OUT/'Schlelberg - redesigned illustrated edition.pdf')
body=PdfReader(b.WORK/'body.pdf')
def norm(t):
    t=unicodedata.normalize('NFKD',t)
    return ''.join(c.lower() for c in t if c.isalnum())
errs=[]
for n,(title,blocks) in enumerate(b.CHAPTERS,1):
    first=data['chapter_starts'][str(n)]
    last=data['chapter_starts'].get(str(n+1),len(body.pages)+1)-1
    expected=norm(' '.join(x for x in blocks if x!='***').replace('*',''))
    got=[]
    for idx in range(first-1,last):
        if data['body_pages'][idx]['kind'] not in ['text']:continue
        ls=(body.pages[idx].extract_text() or '').splitlines()
        ls=[l for l in ls if l.strip() not in ['SULASTONY CO.','SCHLELBERG',str(idx+1)]]
        got.append('\n'.join(ls))
    actual=norm('\n'.join(got))
    prefix=norm(f'CHAPTER {n} {title}')
    if not actual.startswith(prefix):errs.append({'chapter':n,'issue':'missing heading'});continue
    actual=actual[len(prefix):]
    if expected!=actual:
        at=next((i for i,(a,z) in enumerate(zip(expected,actual)) if a!=z),min(len(expected),len(actual)))
        errs.append({'chapter':n,'issue':'text mismatch','at':at,'expected':expected[max(0,at-60):at+100],'actual':actual[max(0,at-60):at+100],'lengths':[len(expected),len(actual)]})
full='\n'.join(p.extract_text() or '' for p in reader.pages)
assert 'Rafif' not in full and 'RAFIF' not in full
assert len(reader.outline)==33
assert len(reader.pages[8]['/Annots'])==16 and len(reader.pages[9]['/Annots'])==16
assert all(it['folio']%2==0 for it in data['plates'])
assert all(v%2==1 for v in data['chapter_starts'].values())
boundary=[]
with pdfplumber.open(b.OUT/'Schlelberg - redesigned illustrated edition.pdf') as pdf:
    for i,page in enumerate(pdf.pages,1):
        chars=page.chars
        bad=[x for x in chars if x['x0']<-.5 or x['x1']>W+.5 or x['top']<-.5 or x['bottom']>H+.5]
        if bad:boundary.append({'page':i,'characters':''.join(x['text'] for x in bad)[:80]})
report={'pages':len(reader.pages),'chapter_text_mismatches':errs,'boundary_errors':boundary,'plates':data['plates'],'all_chapters_recto':True,'all_plates_start_verso':True,'toc_links':32,'legacy_brand_absent':True}
(b.WORK/'qa'/'verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))

paths=sorted((b.WORK/'qa'/'pages').glob('page-*.png'))
if len(paths)==len(reader.pages):
    for start in range(0,len(paths),12):
        sheet=Image.new('RGB',(1360,1610),'#e6e4e1');draw=ImageDraw.Draw(sheet)
        for k,p in enumerate(paths[start:start+12]):
            im=Image.open(p);im.thumbnail((318,478))
            x=12+(k%4)*338;y=25+(k//4)*532
            sheet.paste(im,(x,y));draw.text((x,y-18),str(start+k+1),fill='black')
        sheet.save(b.WORK/'qa'/'sheets'/f'sheet-{start//12+1:02}.png')
    print('CONTACT_SHEETS', (len(paths)+11)//12)
else:print('RENDER_NOT_FINISHED',len(paths))
