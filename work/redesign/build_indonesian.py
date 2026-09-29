from pathlib import Path
from zipfile import ZipFile,ZIP_STORED,ZIP_DEFLATED
from xml.sax.saxutils import escape
import re,html,json,uuid
from reportlab.pdfgen import canvas
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.colors import HexColor
from reportlab.platypus import Paragraph
from pypdf import PdfReader,PdfWriter
from pypdf.annotations import Link
import build_edition as b

ROOT=b.ROOT;OUT=b.OUT;WORK=ROOT/'work/redesign';ART=b.ART
SOURCE=ROOT/'work/manuscript-id'
CHAPTERS=[]
for path in sorted(SOURCE.glob('[0-9][0-9]-*.md')):
    raw=path.read_text(encoding='utf-8')
    head=next(x for x in raw.splitlines() if x.startswith('## '))
    title=head.split(' — ',1)[1]
    prose='\n'.join(x for x in raw.splitlines() if not x.startswith('#'))
    blocks=[x.strip().replace('\n',' ') for x in re.split(r'\n\s*\n',prose) if x.strip()]
    CHAPTERS.append((title,blocks))
assert len(CHAPTERS)==32
b.CHAPTERS=CHAPTERS
b.PLATES={n:(file,title) for n,(file,title) in {
  1:('01-aras.png','Takaran Sang Raja'),5:('05-veyr.png','Seberang yang Jauh'),
  9:('09-severance.png','Mata Pedang yang Tak Patah'),14:('14-hollow.png','Di Dalam Rongga'),
  28:('28-rescue.png','Penyelamatan'),31:('31-concourse.png','Lima Belas Detak Jantung')}.items()}
W,H=b.W,b.H

class Body(b.BookBody):
    def run(self):
        for num,(title,blocks) in enumerate(CHAPTERS,1):
            self.end()
            if self.page%2==0:self.blank()
            self.chapter=num;self.current_title=title;self.starts[num]=self.page
            self.start(opening=True)
            b.gate(self.c,W/2,H-89,21,HexColor('#8b7858'))
            b.tracked(self.c,f'BAB {num}',W/2,H-124,'Garamond',8.5,1.8)
            p=Paragraph(html.escape(title),b.TIT);_,hh=p.wrap(W-100,100);p.drawOn(self.c,50,H-147-hh)
            self.y=H-147-hh-31;opening=True
            for text in blocks:
                if text=='***':
                    if self.y-48<50:self.end();self.start()
                    b.leaf(self.c,W/2,self.y-20,10,HexColor('#847354'));self.y-=42;opening=True
                else:self.paragraph(Paragraph(b.markup(text),b.OPEN if opening else b.BODY));opening=False
            if num in b.PLATES:self.plate(num)
        self.end()
        if self.page%2==0:self.blank()
        self.start('colophon')
        b.gate(self.c,W/2,390,30,HexColor('#8b7858'))
        b.tracked(self.c,'SULASTONY CO.',W/2,338,'Display',12,1)
        b.textblock(self.c,'Edisi ilustrasi <i>Schlelberg</i> ini ditata dengan huruf Garamond, Perpetua Titling, dan Baskerville. Enam ilustrasi cerita terbentang pada pasangan halaman berhadapan.',84,299,W-168,ParagraphStyle('IDColophon',parent=b.SMALL,alignment=TA_CENTER,leading=14))
        b.tracked(self.c,'EDISI ILUSTRASI PERTAMA',W/2,215,'Garamond',8,1.25)
        self.end()
        if self.page%2==0:self.blank()
        self.c.save();return self.starts,self.plates,self.pages

def frontmatter(path,starts,plates):
    c=canvas.Canvas(str(path),pagesize=(W,H))
    b.tracked(c,'SCHLELBERG',W/2,420,'Display',22,.3);c.showPage();c.showPage()
    b.gate(c,W/2,525,27,HexColor('#8b7858'))
    b.tracked(c,'SCHLELBERG',W/2,438,'Display',31,.2)
    b.tracked(c,'SEBUAH NOVEL',W/2,403,'Garamond',9.5,2)
    b.tracked(c,'EDISI ILUSTRASI',W/2,318,'Garamond',10,1.5)
    b.leaf(c,W/2,125,21,HexColor('#8b7858'))
    b.tracked(c,'SULASTONY CO.',W/2,83,'Display',10,1);c.showPage()
    y=280
    for txt in ['<i>Schlelberg</i><br/>Edisi ilustrasi pertama · 2026',
      'Hak cipta © 2026 Sulastony Co.<br/>Seluruh hak dilindungi.',
      'Karya ini adalah fiksi. Tokoh, tempat, lembaga, dan peristiwanya diciptakan atau digunakan secara fiktif.',
      'Diterbitkan oleh Sulastony Co.',
      'Naskah dikembangkan dengan bantuan AI dalam penulisan dan penyuntingan. Sampul serta ilustrasi dihasilkan dengan bantuan OpenAI di bawah arahan editorial. Rupa Tobious merujuk pada foto yang diberikan penulis. Terjemahan bahasa Indonesia disusun dengan bantuan mesin dan memerlukan suntingan sastra sebelum penerbitan komersial.']:
        y=b.textblock(c,txt,61,y,W-109,ParagraphStyle('IDCopyright',parent=b.SMALL,fontSize=8,leading=10.2))-12
    c.showPage()
    b.textblock(c,'“Kota itu ditopang oleh orang-orang<br/>yang tahu di mana ia bisa runtuh.”',70,380,W-140,ParagraphStyle('IDEpigraph',parent=b.SMALL,fontName='GaramondI',fontSize=14,leading=20,alignment=TA_CENTER))
    b.leaf(c,W/2,283,13,HexColor('#8b7858'));c.showPage();c.showPage()
    for half in [0,1]:
        b.tracked(c,'DAFTAR ISI' if half==0 else 'DAFTAR ISI / LANJUTAN',W/2,560,'Display',17 if half==0 else 12,1)
        y=507
        for num in range(half*16+1,half*16+17):
            title=CHAPTERS[num-1][0]
            c.setFillColor(HexColor('#87765b'));c.setFont('Garamond',9);c.drawString(56,y,f'{num:02}')
            c.setFillColor(b.INK);c.setFont('Garamond',10.5);c.drawString(79,y,title)
            c.setFont('Garamond',10);c.drawRightString(W-54,y,str(starts[num]));y-=24
        c.setFont('Garamond',9);c.drawCentredString(W/2,29,'vii' if half==0 else 'viii');c.showPage()
    b.tracked(c,'ILUSTRASI',W/2,560,'Display',16,1);y=482
    for it in plates:
        c.setFont('Garamond',11);c.drawString(65,y,it['title']);c.drawRightString(W-65,y,f"{it['folio']}–{it['folio']+1}");y-=36
    b.textblock(c,'Enam ilustrasi penuh, masing-masing melintasi dua halaman berhadapan.',65,215,W-130,b.SMALL)
    c.setFont('Garamond',9);c.drawCentredString(W/2,29,'ix');c.showPage();c.showPage();c.save()

def covers(path):
    c=canvas.Canvas(str(path),pagesize=(W,H))
    b.image_fill(c,ART/'cover-aura.png',0,0,W,H)
    b.tracked(c,'SCHLELBERG',W/2,H*.894,'Display',52,.1,b.GOLD)
    b.tracked(c,'SEBUAH NOVEL',W/2,H*.846,'Garamond',9,2.2,HexColor('#f1dfbd'))
    b.tracked(c,'SULASTONY CO.',W/2,H*.043,'Display',14,1.6,HexColor('#f4e7cf'));c.showPage()
    c.setFillColor(b.NAVY);c.rect(0,0,W,H,fill=1,stroke=0)
    b.image_fill(c,ART/'01-aras.png',0,0,W,H*.37)
    b.tracked(c,'DUA ZAMAN.',W/2,H-65,'Display',18,.9,b.GOLD)
    b.tracked(c,'SATU PINTU YANG RAPUH.',W/2,H-91,'Display',15,.5,b.GOLD)
    style=ParagraphStyle('IDBlurb',parent=b.SMALL,fontSize=11,leading=15.1,textColor=HexColor('#f4e7cf'))
    y=H-122
    for text in [
      'Pada hari kesembilan pendudukan, para prajurit datang merampas benih. Di bawah desanya, Tobious menemukan sesuatu yang lebih mereka inginkan: pintu menuju kota dua puluh enam abad di masa depan.',
      'Veyr memberinya perisai, pedang legendaris, dan kekuatan yang tak ia miliki di rumah. Namun keajaiban kota itu berdiri di atas kehidupan orang-orang yang sengaja dilupakan. Di antara dua zaman, Para Iwang menunggu.',
      'Sementara Mariya berjuang menjaga warganya tetap hidup, Tobious harus memahami harga kekuatannya. Menyelamatkan kedua zaman menuntut pilihan yang tak bisa diambil oleh pedang mana pun.']:
        y=b.textblock(c,text,38,y,W-76,style)-16
    c.showPage();c.save()

def pdf():
    body=WORK/'body-id.pdf';fm=WORK/'frontmatter-id.pdf';cv=WORK/'covers-id.pdf'
    starts,plates,pages=Body(body).run();frontmatter(fm,starts,plates);covers(cv)
    br=PdfReader(body);fr=PdfReader(fm);cr=PdfReader(cv)
    w=PdfWriter();w.add_page(cr.pages[0]);w.add_blank_page(W,H)
    for p in fr.pages:w.add_page(p)
    offset=len(w.pages)
    for p in br.pages:w.add_page(p)
    w.add_blank_page(W,H);w.add_page(cr.pages[1]);w.page_layout='/SinglePage';w.page_mode='/UseOutlines'
    w.add_metadata({'/Title':'Schlelberg — Edisi Ilustrasi Bahasa Indonesia','/Author':'Sulastony Co.','/Language':'id'})
    w.add_outline_item('Daftar Isi',8)
    for n,p in starts.items():w.add_outline_item(f'{n}. {CHAPTERS[n-1][0]}',offset+p-1)
    for half in [0,1]:
        y=507
        for n in range(half*16+1,half*16+17):
            w.add_annotation(8+half,Link(rect=(52,y-5,W-50,y+13),target_page_index=offset+starts[n]-1,border=[0,0,0]));y-=24
    w.set_page_label(0,1,prefix='Sampul ')
    w.set_page_label(2,11,style='/r',start=1)
    w.set_page_label(offset,offset+len(br.pages)-1,style='/D',start=1)
    target=OUT/'Schlelberg - edisi bahasa Indonesia.pdf';w.write(target)
    (WORK/'layout-id.json').write_text(json.dumps({'starts':starts,'plates':plates,'offset':offset,'pages':len(w.pages),'body_pages':pages},ensure_ascii=False,indent=2),encoding='utf-8')
    return target

def xpage(title,body):
    return ('<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="id" xml:lang="id"><head><meta charset="utf-8"/><title>'+escape(title)+'</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>'+body+'</body></html>').encode()

def epub():
    import build_mobile as m
    cover=ROOT/'work/redesign/qa-id/cover.png'
    style='''@charset "utf-8"; body{font-family:Georgia,serif;line-height:1.4;color:#211e1a;margin:0 4%;}h1{font-family:Georgia,serif;font-weight:normal;text-align:center;line-height:1.18;font-size:1.7em;margin:1.1em 0 2.4em;} .bab{text-align:center;text-transform:uppercase;letter-spacing:.16em;font-size:.75em;margin-top:2.5em;}p{margin:0;text-indent:1.3em;text-align:justify;hyphens:auto;}p.first{text-indent:0}.scene{text-align:center;text-indent:0;margin:1.4em 0}.plate{margin:0;text-align:center;page-break-before:always;page-break-after:always;break-before:page;break-after:page}.plate img,.cover img{display:block;width:100%;height:auto;max-height:95vh;object-fit:contain}.plate figcaption{font-size:.72em;letter-spacing:.08em;text-transform:uppercase;margin-top:.5em}.title{margin-top:25%;text-align:center}.title h1{font-size:2.6em;margin-bottom:.6em}.title p,.copyright p,.epigraph p{text-align:center;text-indent:0;margin:1em 0}.publisher{letter-spacing:.18em}.contents h1{margin:1.2em 0}.contents ol{list-style:none;padding:0}.contents li{margin:.45em 0}.contents a{color:#211e1a;text-decoration:none}'''
    entries=[('title.xhtml','Halaman Judul'),('copyright.xhtml','Hak Cipta'),('epigraph.xhtml','Epigraf'),('contents.xhtml','Daftar Isi')]
    pages=[('title.xhtml',xpage('Schlelberg','<section class="title"><h1>SCHLELBERG</h1><p>SEBUAH NOVEL</p><p>Edisi ilustrasi pertama</p><p class="publisher">SULASTONY CO.</p></section>')),
      ('copyright.xhtml',xpage('Hak Cipta','<section class="copyright"><h1>Hak Cipta</h1><p>Schlelberg · Edisi ilustrasi pertama · 2026</p><p>Hak cipta © 2026 Sulastony Co. Seluruh hak dilindungi.</p><p>Karya fiksi ini diterbitkan oleh Sulastony Co.</p><p>Terjemahan bahasa Indonesia disusun dengan bantuan mesin dan memerlukan suntingan sastra sebelum penerbitan komersial.</p></section>')),
      ('epigraph.xhtml',xpage('Epigraf','<section class="epigraph"><p>“Kota itu ditopang oleh orang-orang<br/>yang tahu di mana ia bisa runtuh.”</p></section>'))]
    toc='<section class="contents"><h1>Daftar Isi</h1><ol>'+''.join(f'<li><a href="chapter-{n:02}.xhtml">{n}. {escape(title)}</a></li>' for n,(title,_) in enumerate(CHAPTERS,1))+'</ol></section>'
    pages.append(('contents.xhtml',xpage('Daftar Isi',toc)))
    for n,(title,blocks) in enumerate(CHAPTERS,1):
        name=f'chapter-{n:02}.xhtml';entries.append((name,f'{n}. {title}'))
        body=f'<section epub:type="chapter"><div class="bab">Bab {n}</div><h1>{escape(title)}</h1>';first=True
        for block in blocks:
            if block=='***':body+='<p class="scene">❧</p>';first=True
            else:
                cls=' class="first"' if first else ''
                body+=f'<p{cls}>{m.inline(block)}</p>';first=False
        body+='</section>'
        if n in b.PLATES:
            image,title2=b.PLATES[n]
            body+=f'<figure class="plate"><img src="images/{image}" alt="Ilustrasi {escape(title)}"/><figcaption>{escape(title2)}</figcaption></figure>'
        pages.append((name,xpage(f'Bab {n}: {title}',body)))
    nav='<nav epub:type="toc" id="toc"><h1>Daftar Isi</h1><ol>'+''.join(f'<li><a href="{name}">{escape(label)}</a></li>' for name,label in entries)+'</ol></nav>'
    navpage=xpage('Navigasi',nav)
    manifest=[];spine=[]
    for name,_ in pages:
        item=name[:-6];manifest.append(f'<item id="{item}" href="{name}" media-type="application/xhtml+xml"/>');spine.append(f'<itemref idref="{item}"/>')
    manifest+=['<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>','<item id="css" href="style.css" media-type="text/css"/>','<item id="cover" href="images/cover.png" media-type="image/png" properties="cover-image"/>']
    for _,(image,_) in b.PLATES.items():manifest.append(f'<item id="img-{image[:-4]}" href="images/{image}" media-type="image/png"/>')
    bookid='urn:uuid:'+str(uuid.uuid5(uuid.NAMESPACE_URL,'sulastony.co/schlelberg/id/2026'))
    opf=('<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">'+bookid+'</dc:identifier><dc:title>Schlelberg</dc:title><dc:creator>Sulastony Co.</dc:creator><dc:publisher>Sulastony Co.</dc:publisher><dc:language>id</dc:language><dc:date>2026</dc:date><meta property="dcterms:modified">2026-09-29T00:00:00Z</meta></metadata><manifest>'+''.join(manifest)+'</manifest><spine>'+''.join(spine)+'</spine></package>').encode()
    container=b'<?xml version="1.0" encoding="utf-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
    target=OUT/'Schlelberg - edisi bahasa Indonesia.epub'
    with ZipFile(target,'w') as z:
        z.writestr('mimetype','application/epub+zip',compress_type=ZIP_STORED)
        z.writestr('META-INF/container.xml',container,compress_type=ZIP_DEFLATED)
        z.writestr('OEBPS/content.opf',opf,compress_type=ZIP_DEFLATED)
        z.writestr('OEBPS/nav.xhtml',navpage,compress_type=ZIP_DEFLATED)
        z.writestr('OEBPS/style.css',style,compress_type=ZIP_DEFLATED)
        z.write(cover,'OEBPS/images/cover.png',compress_type=ZIP_DEFLATED)
        for _,(image,_) in b.PLATES.items():z.write(ART/image,'OEBPS/images/'+image,compress_type=ZIP_DEFLATED)
        for name,data in pages:z.writestr('OEBPS/'+name,data,compress_type=ZIP_DEFLATED)
    return target

if __name__=='__main__':
    print(pdf())
    print(epub())
