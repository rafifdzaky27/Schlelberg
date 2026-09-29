import urllib.request,urllib.parse,json
from lxml import html
import build_edition as b
blocks=[x.replace('“','"').replace('”','"').replace('’',"'") for x in b.CHAPTERS[0][1][4:8]]
q=''.join(f'<p id="p{i}">{s}</p>' for i,s in enumerate(blocks))
u='https://translate.googleapis.com/translate_a/single?'+urllib.parse.urlencode({'client':'gtx','sl':'en','tl':'id','dt':'t','format':'text','q':q})
d=json.load(urllib.request.urlopen(u,timeout=20))
t=''.join(x[0] for x in d[0]);print(t[:4500]);print('TAG_COUNT',len(html.fromstring('<div>'+t+'</div>').xpath('.//p')))
