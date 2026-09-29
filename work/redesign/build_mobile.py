from pathlib import Path
from zipfile import ZipFile, ZIP_STORED, ZIP_DEFLATED
from xml.sax.saxutils import escape
import re, uuid
from pypdf import PdfReader, PdfWriter
from lxml import etree
from PIL import Image
import build_edition as b

ROOT=b.ROOT;OUT=b.OUT;ART=b.ART
X='http://www.w3.org/1999/xhtml'
BOOK='urn:uuid:'+str(uuid.uuid5(uuid.NAMESPACE_URL,'sulastony.co/schlelberg/first-illustrated-edition/2026'))

def inline(s):
    s=escape(s)
    s=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',s)
    return re.sub(r'\*([^*]+)\*',r'<em>\1</em>',s)

def page(title,body):
    return ('<?xml version="1.0" encoding="utf-8"?>\n'
      '<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">'
      '<head><meta charset="utf-8"/><title>'+escape(title)+'</title>'
      '<link rel="stylesheet" type="text/css" href="style.css"/></head>'
      '<body>'+body+'</body></html>').encode('utf-8')

def single_page_pdf():
    source=PdfReader(OUT/'Schlelberg - redesigned illustrated edition.pdf')
    writer=PdfWriter();writer.clone_document_from_reader(source)
    writer.page_layout='/SinglePage';writer.page_mode='/UseOutlines'
    writer.add_metadata({'/Title':'Schlelberg — Single-Page Illustrated Edition',
                         '/Author':'Sulastony Co.','/Subject':'A novel · first illustrated edition · 2026'})
    target=OUT/'Schlelberg - single-page edition.pdf';writer.write(target)
    return target

def epub():
    cover=ROOT/'work/redesign/qa/pages/page-001.png'
    assert cover.exists()
    style='''@charset "utf-8";
body{font-family:Georgia,"Palatino Linotype",serif;line-height:1.38;color:#211e1a;margin:0 4%;}
h1,h2{font-family:Georgia,serif;font-weight:normal;text-align:center;line-height:1.18;}
.chapter-no{text-align:center;text-transform:uppercase;letter-spacing:.16em;font-size:.75em;margin-top:2.5em;}
h1{font-size:1.7em;margin:1.1em 0 2.4em;}
p{margin:0;text-indent:1.3em;text-align:justify;hyphens:auto;-webkit-hyphens:auto;}
p.first,p.after-break{ text-indent:0;}
.scene{text-align:center;text-indent:0;margin:1.4em 0;}
.plate{margin:0;text-align:center;page-break-before:always;page-break-after:always;break-before:page;break-after:page;}
.plate img,.cover img{display:block;width:100%;height:auto;max-height:95vh;object-fit:contain;}
.plate figcaption{font-size:.72em;letter-spacing:.08em;text-transform:uppercase;margin-top:.5em;}
.cover{margin:0;text-align:center;}
.title{margin-top:25%;text-align:center;}
.title h1{font-size:2.6em;margin-bottom:.6em;}
.title p,.copyright p,.epigraph p,.colophon p{text-align:center;text-indent:0;margin:1em 0;}
.publisher{letter-spacing:.18em;}
.contents h1{margin:1.2em 0;}.contents ol{list-style:none;padding:0;}
.contents li{margin:.45em 0;}.contents a{color:#211e1a;text-decoration:none;}
'''
    chapters=[];manifest=[];spine=[];image_items=[]
    entries=[('title.xhtml','Title Page'),('copyright.xhtml','Copyright'),('epigraph.xhtml','Epigraph'),('contents.xhtml','Contents')]
    for n,(title,blocks) in enumerate(b.CHAPTERS,1):
        fname=f'chapter-{n:02}.xhtml';entries.append((fname,f'{n}. {title}'))
        body=f'<section epub:type="chapter" xmlns:epub="http://www.idpf.org/2007/ops"><div class="chapter-no">Chapter {n}</div><h1>{escape(title)}</h1>'
        previous_break=True
        for block in blocks:
            if block=='***':body+='<p class="scene">❧</p>';previous_break=True
            else:
                cls=' class="first"' if previous_break else ''
                body+=f'<p{cls}>{inline(block)}</p>';previous_break=False
        body+='</section>'
        if n in b.PLATES:
            artname=b.PLATES[n][0]
            body+=f'<figure class="plate"><img src="images/{artname}" alt="Scene from {escape(title)}"/><figcaption>{escape(b.PLATES[n][1])}</figcaption></figure>'
            image_items.append((artname,ART/artname))
        chapters.append((fname,page(f'Chapter {n}: {title}',body)))
    title_page=page('Schlelberg — Title Page','<section class="title"><h1>SCHLELBERG</h1><p>A NOVEL</p><p>First illustrated edition</p><p class="publisher">SULASTONY CO.</p></section>')
    copyright_page=page('Copyright','<section class="copyright"><h1>Copyright</h1><p>Schlelberg<br/>First illustrated edition · 2026</p><p>Published under the Sulastony Co. imprint.</p><p>Text developed with AI-assisted drafting and editorial work. Cover and interior artwork generated with OpenAI image generation under editorial direction. Tobious’s likeness is based on a reference photograph supplied by the author.</p></section>')
    epigraph=page('Epigraph','<section class="epigraph"><p>“The city was held up by people<br/>who knew where it failed.”</p></section>')
    toc='<section class="contents"><h1>Contents</h1><ol>'+''.join(f'<li><a href="chapter-{n:02}.xhtml">{n}. {escape(title)}</a></li>' for n,(title,_) in enumerate(b.CHAPTERS,1))+'</ol></section>'
    contents=page('Contents',toc)
    nav='<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>'+''.join(f'<li><a href="{name}">{escape(label)}</a></li>' for name,label in entries)+'</ol></nav>'
    navpage=('<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en"><head><title>Navigation</title></head><body>'+nav+'</body></html>').encode()
    xhtml=[('title.xhtml',title_page),('copyright.xhtml',copyright_page),('epigraph.xhtml',epigraph),('contents.xhtml',contents)]+chapters
    for name,_ in xhtml:
        item_id=name[:-6];manifest.append(f'<item id="{item_id}" href="{name}" media-type="application/xhtml+xml"/>');spine.append(f'<itemref idref="{item_id}"/>')
    manifest.append('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>')
    manifest.append('<item id="css" href="style.css" media-type="text/css"/>')
    manifest.append('<item id="cover" href="images/cover.png" media-type="image/png" properties="cover-image"/>')
    for name,_ in image_items:manifest.append(f'<item id="img-{name[:-4]}" href="images/{name}" media-type="image/png"/>')
    opf=('<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="en"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">'+BOOK+'</dc:identifier><dc:title>Schlelberg</dc:title><dc:creator>Sulastony Co.</dc:creator><dc:publisher>Sulastony Co.</dc:publisher><dc:language>en</dc:language><dc:date>2026</dc:date><meta property="dcterms:modified">2026-09-29T00:00:00Z</meta></metadata><manifest>'+''.join(manifest)+'</manifest><spine>'+''.join(spine)+'</spine></package>').encode()
    container=b'<?xml version="1.0" encoding="utf-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
    target=OUT/'Schlelberg - illustrated edition.epub'
    with ZipFile(target,'w') as z:
        z.writestr('mimetype','application/epub+zip',compress_type=ZIP_STORED)
        z.writestr('META-INF/container.xml',container,compress_type=ZIP_DEFLATED)
        z.writestr('OEBPS/content.opf',opf,compress_type=ZIP_DEFLATED)
        z.writestr('OEBPS/nav.xhtml',navpage,compress_type=ZIP_DEFLATED)
        z.writestr('OEBPS/style.css',style,compress_type=ZIP_DEFLATED)
        z.write(cover,'OEBPS/images/cover.png',compress_type=ZIP_DEFLATED)
        for name,path in image_items:z.write(path,'OEBPS/images/'+name,compress_type=ZIP_DEFLATED)
        for name,data in xhtml:z.writestr('OEBPS/'+name,data,compress_type=ZIP_DEFLATED)
    return target

if __name__=='__main__':
    print(single_page_pdf())
    print(epub())
