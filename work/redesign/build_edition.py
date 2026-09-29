from pathlib import Path
from io import BytesIO
import re, json, html, copy
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER
from reportlab.lib.colors import HexColor, Color
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter, Transformation
from pypdf.annotations import Link
from pypdf.generic import NameObject, DictionaryObject, BooleanObject, NumberObject

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT/'work'/'redesign'
OUT = ROOT/'outputs'
ART = WORK/'art'
W,H = 432,648
NAVY = HexColor('#122537')
INK = HexColor('#211e1a')
GOLD = HexColor('#d7b677')
PAPER = HexColor('#fffefa')
FONTS = Path('C:/Windows/Fonts')
for name,file in [('Garamond','GARA.TTF'),('GaramondI','GARAIT.TTF'),('GaramondB','GARABD.TTF'),('Display','PERTILI.TTF'),('Baskerville','BASKVILL.TTF')]:
    pdfmetrics.registerFont(TTFont(name,str(FONTS/file)))
pdfmetrics.registerFontFamily('Garamond',normal='Garamond',bold='GaramondB',italic='GaramondI',boldItalic='GaramondI')
BODY = ParagraphStyle('Body',fontName='Garamond',fontSize=11.6,leading=14.6,textColor=INK,
    alignment=TA_JUSTIFY,firstLineIndent=14,spaceBefore=0,spaceAfter=0,
    allowWidows=0,allowOrphans=0,hyphenationLang='en_US',embeddedHyphenation=1,
    uriWasteReduce=0.3,splitLongWords=0,endDots=None)
OPEN = ParagraphStyle('Open',parent=BODY,firstLineIndent=0)
SMALL = ParagraphStyle('Small',parent=BODY,fontSize=9.4,leading=12.5,firstLineIndent=0,alignment=TA_LEFT)
TIT = ParagraphStyle('Title',fontName='Baskerville',fontSize=22,leading=26,alignment=TA_CENTER,textColor=INK)
CHAPTERS=[]
for p in sorted((ROOT/'work'/'manuscript').glob('[0-9][0-9]-*.md')):
    source=p.read_text(encoding='utf-8-sig')
    header=next(x[3:] for x in source.splitlines() if x.startswith('## '))
    number,title=header.split(' — ',1)
    prose='\n'.join(x for x in source.splitlines() if not x.startswith('#'))
    blocks=[b.strip().replace('\n',' ') for b in re.split(r'\n\s*\n',prose) if b.strip()]
    CHAPTERS.append((title,blocks))
assert len(CHAPTERS)==32

PLATES={
    1: ('01-aras.png','The King\u2019s Measure'),
    5: ('05-veyr.png','The Far Shore'),
    9: ('09-severance.png','The Unbroken Edge'),
    14: ('14-hollow.png','Inside the Hollow'),
    28: ('28-rescue.png','The Crossing'),
    31: ('31-concourse.png','Fifteen Heartbeats'),
}

def markup(s):
    s=html.escape(s)
    s=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',s)
    return re.sub(r'\*([^*]+)\*',r'<i>\1</i>',s)

def tracked(c,text,x,y,font='Display',size=10,space=1.5,color=INK,center=True):
    c.saveState()
    width=pdfmetrics.stringWidth(text,font,size)+max(0,len(text)-1)*space
    t=c.beginText(x-width/2 if center else x,y)
    t.setFont(font,size);t.setCharSpace(space);t.setFillColor(color);t.textOut(text);c.drawText(t)
    c.restoreState()

def leaf(c,x,y,size=18,color=INK):
    c.saveState();c.translate(x,y);c.setStrokeColor(color);c.setLineWidth(.7)
    p=c.beginPath();p.moveTo(0,-size/2);p.curveTo(-size*.72,0,-size*.35,size*.6,0,size/2)
    p.curveTo(size*.72,0,size*.35,-size*.6,0,-size/2);c.drawPath(p)
    c.line(0,-size*.67,0,size*.48)
    c.line(0,-size*.05,-size*.23,size*.19);c.line(0,size*.10,size*.23,size*.33)
    c.restoreState()

def gate(c,x,y,size=25,color=GOLD):
    c.saveState();c.translate(x,y);c.setStrokeColor(color);c.setLineWidth(.8)
    c.lines([(-size*.5,-size*.4,-size*.5,size*.5),(-size*.5,size*.5,size*.5,size*.5),(size*.5,size*.5,size*.5,-size*.4)])
    c.line(-size*.3,-size*.6,size*.3,size*.6)
    c.arc(-size*.62,-size*.67,size*.62,-size*.1,0,180)
    c.restoreState()

def image_fill(c,path,x,y,w,h):
    img=ImageReader(str(path));iw,ih=img.getSize();s=max(w/iw,h/ih)
    c.saveState();p=c.beginPath();p.rect(x,y,w,h);c.clipPath(p,stroke=0)
    c.drawImage(img,x+(w-iw*s)/2,y+(h-ih*s)/2,width=iw*s,height=ih*s)
    c.restoreState()

def textblock(c,text,x,y,w,style=SMALL):
    p=Paragraph(text,style);_,h=p.wrap(w,900);p.drawOn(c,x,y-h);return y-h

def front(c,x=0,y=0,w=W,h=H):
    image_fill(c,ART/'cover-aura.png',x,y,w,h)
    k=w/W
    # Use the dark painted space: no transparent panels or gradient washes.
    tracked(c,'SCHLELBERG',x+w/2,y+h*.894,'Display',52*k,.1*k,GOLD)
    tracked(c,'A NOVEL',x+w/2,y+h*.846,'Garamond',9*k,3*k,HexColor('#f1dfbd'))
    tracked(c,'SULASTONY CO.',x+w/2,y+h*.043,'Display',14*k,1.6*k,HexColor('#f4e7cf'))

def back(c,x,y,w,h):
    c.setFillColor(NAVY);c.rect(x,y,w,h,fill=1,stroke=0)
    image_fill(c,ART/'01-aras.png',x,y,w,h*.37)
    mx=x+38;tw=w-76
    tracked(c,'TWO SHORES.',x+w/2,y+h-65,'Display',18,.9,GOLD)
    tracked(c,'ONE FAILING DOOR.',x+w/2,y+h-91,'Display',18,.9,GOLD)
    s=ParagraphStyle('Blurb',parent=SMALL,fontSize=11,leading=15.1,textColor=HexColor('#f4e7cf'))
    yy=y+h-122
    for txt in [
      'On the ninth day of the occupation, the soldiers come for the seed. Beneath his village, Tobious finds something they want even more: a door into a city twenty-six hundred years away.',
      'Veyr offers him a shield, a legendary blade, and the strength he could not find at home. But its wonders rest on lives its keepers have chosen not to count. Between the centuries, the Hollow Ones gather.',
      'While Mariya fights to keep their people alive, Tobious must learn what his new power costs—and who has been made to pay. Saving both shores will demand a choice no sword can make for them.'
    ]: yy=textblock(c,txt,mx,yy,tw,s)-12
    tracked(c,'SULASTONY CO.',x+w/2,y+20,'Garamond',8,1.8,HexColor('#fff4dc'))

class BookBody:
    def __init__(self,path):
        self.c=canvas.Canvas(str(path),pagesize=(W,H),pageCompression=1)
        self.page=1;self.started=False;self.kind='text';self.y=H-64;self.chapter=0
        self.starts={};self.plates=[];self.pages=[];self.current_title=''
    def x(self): return 61 if self.page%2 else 48
    def start(self,kind='text',opening=False):
        self.started=True;self.kind=kind;self.opening=opening;self.y=H-64
        self.c.setFillColor(PAPER);self.c.rect(0,0,W,H,fill=1,stroke=0)
    def end(self):
        if not self.started:return
        if self.kind=='text':
            c=self.c
            if not self.opening:
                txt='SULASTONY CO.' if self.page%2==0 else 'SCHLELBERG'
                tracked(c,txt,W/2,H-36,'Garamond',8.1,1.35,HexColor('#55504a'))
            c.setFont('Garamond',9);c.setFillColor(INK)
            c.drawCentredString(W/2,29,str(self.page))
        self.pages.append({'folio':self.page,'kind':self.kind,'chapter':self.chapter,'bottom':round(self.y,2)})
        self.c.showPage();self.page+=1;self.started=False
    def blank(self): self.start('blank');self.end()
    def paragraph(self,p):
        if not self.started:self.start()
        while True:
            aw=W-109;available=self.y-50
            _,ph=p.wrap(aw,available)
            if ph<=available:
                p.drawOn(self.c,self.x(),self.y-ph);self.y-=ph;return
            pieces=p.split(aw,available)
            if pieces:
                a=pieces[0];_,hh=a.wrap(aw,available);a.drawOn(self.c,self.x(),self.y-hh);self.y-=hh
                self.end();self.start()
                if len(pieces)==1:return
                p=pieces[1]
            else:self.end();self.start()
    def plate(self,num):
        self.end()
        if self.page%2: self.blank()
        filename,title=PLATES[num];first=self.page
        for side in [0,1]:
            self.start('art');self.c.saveState()
            p=self.c.beginPath();p.rect(0,0,W,H);self.c.clipPath(p,stroke=0)
            image_fill(self.c,ART/filename,-side*W,0,W*2,H)
            self.c.restoreState();self.end()
        self.plates.append({'chapter':num,'folio':first,'title':title,'filename':filename})
    def run(self):
        for num,(title,blocks) in enumerate(CHAPTERS,1):
            self.end()
            if self.page%2==0:self.blank()
            self.chapter=num;self.current_title=title;self.starts[num]=self.page
            self.start(opening=True)
            gate(self.c,W/2,H-89,21,HexColor('#8b7858'))
            tracked(self.c,f'CHAPTER {num}',W/2,H-124,'Garamond',8.5,1.8)
            p=Paragraph(html.escape(title),TIT);_,hh=p.wrap(W-100,100);p.drawOn(self.c,50,H-147-hh)
            self.y=H-147-hh-31;opening=True
            for b in blocks:
                if b=='***':
                    if self.y-48<50:self.end();self.start()
                    leaf(self.c,W/2,self.y-20,10,HexColor('#847354'));self.y-=42;opening=True;continue
                self.paragraph(Paragraph(markup(b),OPEN if opening else BODY));opening=False
            # A plate closes the chapter it depicts, avoiding revelation before the prose.
            if num in PLATES:self.plate(num)
        self.end()
        if self.page%2==0:self.blank()
        self.start('colophon')
        gate(self.c,W/2,390,30,HexColor('#8b7858'))
        tracked(self.c,'SULASTONY CO.',W/2,338,'Display',12,1)
        textblock(self.c,'This illustrated edition of <i>Schlelberg</i> is set in Garamond, with Perpetua Titling and Baskerville display lettering. The six narrative paintings are arranged as full-bleed facing-page plates.',84,299,W-168,ParagraphStyle('Colophon',parent=SMALL,alignment=TA_CENTER,leading=14))
        tracked(self.c,'FIRST ILLUSTRATED EDITION',W/2,215,'Garamond',8,1.25)
        self.end()
        if self.page%2==0:self.blank()
        self.c.save()
        return self.starts,self.plates,self.pages

def frontmatter(path,starts,plates):
    c=canvas.Canvas(str(path),pagesize=(W,H))
    # Ten interior pages: half-title begins recto; chapter one also begins recto.
    tracked(c,'SCHLELBERG',W/2,420,'Display',22,.3);c.showPage()
    c.showPage()
    gate(c,W/2,525,27,HexColor('#8b7858'))
    tracked(c,'SCHLELBERG',W/2,438,'Display',31,.2)
    tracked(c,'A NOVEL',W/2,403,'Garamond',9.5,2)
    tracked(c,'ILLUSTRATED EDITION',W/2,318,'Garamond',10,1.5)
    leaf(c,W/2,125,21,HexColor('#8b7858'))
    tracked(c,'SULASTONY CO.',W/2,83,'Display',10,1)
    c.showPage()
    y=280
    for txt in [
        '<i>Schlelberg</i><br/>First illustrated edition · 2026',
        'Copyright © 2026 Sulastony Co.<br/>All rights reserved.',
        'This is a work of fiction. Its characters, places, institutions and events are invented or used fictitiously.',
        'Published under the Sulastony Co. imprint.',
        'Text developed with AI-assisted drafting and editorial work.<br/>Cover and interior artwork generated with OpenAI image generation under editorial direction. Tobious’s likeness is based on a reference photograph supplied by the author.',
    ]:y=textblock(c,txt,61,y,W-109,ParagraphStyle('Copyright',parent=SMALL,fontSize=8,leading=10.2))-12
    c.showPage()
    textblock(c,'“The city was held up by people<br/>who knew where it failed.”',70,380,W-140,ParagraphStyle('Epigraph',parent=SMALL,fontName='GaramondI',fontSize=14,leading=20,alignment=TA_CENTER))
    leaf(c,W/2,283,13,HexColor('#8b7858'));c.showPage();c.showPage()
    for half in [0,1]:
        tracked(c,'CONTENTS' if half==0 else 'CONTENTS / CONTINUED',W/2,560,'Display',17 if half==0 else 12,1)
        y=507
        for num in range(half*16+1,half*16+17):
            title=CHAPTERS[num-1][0]
            c.setFillColor(HexColor('#87765b'));c.setFont('Garamond',9);c.drawString(56,y,f'{num:02}')
            c.setFillColor(INK);c.setFont('Garamond',10.5);c.drawString(79,y,title)
            c.setFont('Garamond',10);c.drawRightString(W-54,y,str(starts[num]))
            y-=24
        c.setFont('Garamond',9);c.drawCentredString(W/2,29,'vii' if half==0 else 'viii');c.showPage()
    tracked(c,'ILLUSTRATIONS',W/2,560,'Display',16,1)
    y=482
    for it in plates:
        c.setFont('Garamond',11);c.drawString(65,y,it['title']);c.drawRightString(W-65,y,f"{it['folio']}–{it['folio']+1}");y-=36
    textblock(c,'Six full-bleed paintings, each spanning two facing pages.',65,215,W-130,SMALL)
    c.setFont('Garamond',9);c.drawCentredString(W/2,29,'ix');c.showPage();c.showPage();c.save()

def covers(path):
    c=canvas.Canvas(str(path),pagesize=(W,H));front(c);c.showPage();back(c,0,0,W,H);c.showPage();c.save()

def jacket(path):
    flap=216;bw=450;spine=66;hh=666;ww=flap*2+bw*2+spine
    c=canvas.Canvas(str(path),pagesize=(ww,hh))
    c.setTitle('Schlelberg - illustrated hardcover jacket concept');c.setAuthor('Sulastony Co.')
    c.setFillColor(NAVY);c.rect(0,0,ww,hh,fill=1,stroke=0)
    back(c,flap,0,bw,hh);front(c,flap+bw+spine,0,bw,hh)
    sx=flap+bw
    c.setFillColor(HexColor('#0d1c2a'));c.rect(sx,0,spine,hh,fill=1,stroke=0)
    gate(c,sx+spine/2,hh-46,22,GOLD)
    c.saveState();c.translate(sx+spine/2,hh/2);c.rotate(-90)
    tracked(c,'SCHLELBERG',0,-6,'Display',23,1,GOLD);c.restoreState()
    tracked(c,'SULASTONY',sx+spine/2,97,'Garamond',7,.2,GOLD)
    tracked(c,'CO.',sx+spine/2,84,'Garamond',7,.8,GOLD);leaf(c,sx+spine/2,47,17,GOLD)
    s=ParagraphStyle('Flap',parent=SMALL,fontSize=10.3,leading=14,textColor=HexColor('#f1dfbd'))
    tracked(c,'SCHLELBERG',flap/2,hh-73,'Display',14,.3,GOLD)
    y=hh-113
    for txt in ['A village that must keep sowing. A city that has forgotten whose lives sustain it.',
        'Across twenty-six centuries, Tobious and Mariya fight for the same people from opposite shores. Their story follows the promises of power, the work of survival, and the cost of loving someone whose choice you cannot make.',
        'This edition includes six narrative paintings spanning two facing pages.']:
        y=textblock(c,txt,27,y,flap-54,s)-18
    leaf(c,flap/2,95,24,GOLD)
    rx=flap+bw+spine+bw
    tracked(c,'SULASTONY CO.',rx+flap/2,hh-75,'Display',12,.5,GOLD)
    textblock(c,'<i>Schlelberg</i> brings a Bronze Age coastal village into collision with an inhabited future of shields, elevated roads and failing thresholds.',rx+27,hh-119,flap-54,s)
    gate(c,rx+flap/2,190,31,GOLD)
    tracked(c,'SULASTONY',rx+flap/2,141,'Display',11,.7,GOLD)
    tracked(c,'CO.',rx+flap/2,119,'Display',11,2,GOLD)
    textblock(c,'First illustrated edition<br/>2026',rx+27,86,flap-54,ParagraphStyle('ImprintFlap',parent=s,alignment=TA_CENTER,fontSize=9))
    # Subtle hinge rules are design elements, not printer crop marks.
    c.setStrokeColor(HexColor('#9b8356'));c.setLineWidth(.35)
    for xx in [flap,flap+bw,flap+bw+spine,flap+bw+spine+bw]:c.line(xx,0,xx,hh)
    c.showPage();c.save()

def assemble():
    bodypath=WORK/'body.pdf';fm=WORK/'frontmatter.pdf';cv=WORK/'covers.pdf'
    starts,plates,pages=BookBody(bodypath).run();frontmatter(fm,starts,plates);covers(cv)
    cr=PdfReader(cv);br=PdfReader(bodypath);fr=PdfReader(fm)
    w=PdfWriter();w.add_page(cr.pages[0]);w.add_blank_page(W,H)
    for p in fr.pages:w.add_page(p)
    offset=len(w.pages)
    for p in br.pages:w.add_page(p)
    w.add_blank_page(W,H);w.add_page(cr.pages[1])
    w.page_layout='/TwoPageRight'
    w.add_metadata({'/Title':'Schlelberg — First Illustrated Edition','/Author':'Sulastony Co.','/Subject':'A novel · Sulastony Co. · 2026'})
    w.add_outline_item('Contents',8)
    for n,p in starts.items():w.add_outline_item(f'{n}. {CHAPTERS[n-1][0]}',offset+p-1)
    for half in [0,1]:
        pageindex=8+half;y=507
        for n in range(half*16+1,half*16+17):
            w.add_annotation(pageindex,Link(rect=(52,y-5,W-50,y+13),target_page_index=offset+starts[n]-1,border=[0,0,0]))
            y-=24
    # PDF page labels keep the printed folio accessible even with cover/front matter.
    w.set_page_label(0,1,prefix='Cover ')
    w.set_page_label(2,11,style='/r',start=1)
    w.set_page_label(offset,offset+len(br.pages)-1,style='/D',start=1)
    final=OUT/'Schlelberg - redesigned illustrated edition.pdf';w.write(final)
    # Separate spread reader makes the entire painting visible in single-page viewers.
    rr=PdfReader(final);sw=PdfWriter()
    for first in range(1,len(rr.pages)-1,2):
        new=sw.add_blank_page(W*2,H)
        new.merge_transformed_page(rr.pages[first],Transformation().translate(0,0))
        if first+1<len(rr.pages):new.merge_transformed_page(rr.pages[first+1],Transformation().translate(W,0))
        if '/Annots' in new:del new['/Annots']
    # Reader has front cover first, then book spreads, then back cover.
    sr=PdfWriter();sr.add_page(rr.pages[0])
    for p in sw.pages:sr.add_page(p)
    sr.add_page(rr.pages[-1]);sr.page_layout='/SinglePage'
    sr.add_metadata({'/Title':'Schlelberg — Facing-page Reader','/Author':'Sulastony Co.'})
    for half in [0,1]:
        source=8+half;destination=1+(source-1)//2;x=W if source%2==0 else 0;y=507
        for n in range(half*16+1,half*16+17):
            sr.add_annotation(destination,Link(rect=(52+x,y-5,W-50+x,y+13),target_page_index=1+(offset+starts[n]-2)//2,border=[0,0,0]))
            y-=24
    for n,p in starts.items():sr.add_outline_item(f'{n}. {CHAPTERS[n-1][0]}',1+(offset+p-2)//2)
    sr.write(OUT/'Schlelberg - facing-page reader.pdf')
    jacket(OUT/'Schlelberg - redesigned hardcover jacket.pdf')
    (WORK/'layout.json').write_text(json.dumps({'chapter_starts':starts,'plates':plates,'body_pages':pages,'offset':offset,'total_pages':len(w.pages)},indent=2))
    print(json.dumps({'total_pages':len(w.pages),'body_pages':len(br.pages),'plate_spreads':len(plates),'chapters':len(starts),'output':str(final)}))

if __name__=='__main__':assemble()
