from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from lxml import html
from xml.sax.saxutils import escape
import urllib.request,urllib.parse,json,re,time,random
import build_edition as b

ROOT=b.ROOT
DEST=ROOT/'work'/'manuscript-id';DEST.mkdir(parents=True,exist_ok=True)
CACHE=ROOT/'work'/'redesign'/'translation-cache';CACHE.mkdir(parents=True,exist_ok=True)
TITLES=['Takaran Sang Raja','Pintu Tanpa Angin','Bilah Cahaya Sunyi','Dua Tempayan','Seberang yang Jauh',
'Kota yang Tak Pernah Tidur','Nama-Nama di Tanah Liat','Berat Sebuah Perisai','Mata Pedang yang Tak Patah',
'Langkah Kesembilan','Kemenangan yang Berguna','Yang Disimpan Catatan','Penyeberangan Pulang Pertama',
'Di Dalam Rongga','Harga Sebuah Pembukaan','Garis di Bawah Segel','Syarat-Syarat Belas Kasihan',
'Meja dengan Tiga Tempat','Sisi yang Tak Terhalang','Nama bagi yang Hilang','Yang Direnggut Kekuasaan',
'Tak Ada Lagi Nama','Nama Keempat Puluh Lima','Sisa Sebuah Sumpah','Orang-Orang dalam Rencana',
'Jalan ke Aras','Gerbang untuk Semua','Para Iwang','Yang Tak Bisa Ditahan Cinta',
'Takaran Kedua Sang Raja','Sisi Lain Suaranya','Yang Tetap Disimpan']

def chunks(blocks,limit=2650):
    part=[];size=0
    for i,s in enumerate(blocks):
        if s=='***':continue
        s=s.replace('“','"').replace('”','"').replace('‘',"'").replace('’',"'")
        s=escape(s)
        payload=f'<p id="p{i}">{s}</p>'
        if part and size+len(payload)>limit:yield part;part=[];size=0
        part.append((i,payload));size+=len(payload)
    if part:yield part

def request_chunk(task):
    chapter,k,part=task
    path=CACHE/f'{chapter:02}-{k:03}.json'
    if path.exists():return json.loads(path.read_text(encoding='utf-8'))
    q=''.join(p for _,p in part)
    args={'client':'gtx','sl':'en','tl':'id','dt':'t','format':'text','q':q}
    url='https://translate.googleapis.com/translate_a/single?'+urllib.parse.urlencode(args)
    last=None
    for attempt in range(6):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req,timeout=45) as f:data=json.load(f)
            translated=''.join(x[0] for x in data[0])
            root=html.fromstring('<div>'+translated+'</div>')
            got={int(p.get('id')[1:]):''.join(p.itertext()).strip() for p in root.xpath('.//p') if re.fullmatch('p[0-9]+',p.get('id',''))}
            expected={i for i,_ in part}
            if set(got)!=expected:raise ValueError(f'tag mismatch chapter {chapter} chunk {k}: {len(got)} vs {len(expected)}; {translated[:200]}')
            if any(not v for v in got.values()):raise ValueError('empty translated paragraph')
            path.write_text(json.dumps(got,ensure_ascii=False),encoding='utf-8')
            return got
        except Exception as exc:
            last=exc;time.sleep(min(15,2**attempt+random.random()))
    raise RuntimeError(f'Failed chapter {chapter} chunk {k}: {last}')

def tidy(s):
    s=s.replace('“','"').replace('”','"').replace('�','"')
    # Restore canonical names and invented terms when automatic translation changes them.
    replacements={'Toby':'Tobious','Maria':'Mariya','Panji':'Panjios','Ipin':'Ypin','Sus':'Suss',
      'Eda':'Edda','Saman':'Samon','Neris':'Nerissa','Theren':'Therren','Daran':'Darran',
      'Para Yang Berongga':'Para Iwang','Yang Berongga':'Iwang','Orang-Orang Berongga':'Para Iwang',
      'Pemutusan Hubungan Kerja':'Severance','Pesangon':'Severance'}
    for old,new in replacements.items():
        if old in ['Sus','Eda','Ipin','Panji','Maria','Toby','Saman','Neris','Theren','Daran']:
            s=re.sub(r'(?<![\w])'+re.escape(old)+r'(?![\w])',new,s)
        else:s=s.replace(old,new)
    s=re.sub(r'"([^"\n]+)"',r'“\1”',s)
    return s

def main():
    tasks=[]
    for n,(_,blocks) in enumerate(b.CHAPTERS,1):
        for k,part in enumerate(chunks(blocks)):tasks.append((n,k,part))
    print('chunks',len(tasks),flush=True)
    results={}
    with ThreadPoolExecutor(max_workers=5) as ex:
        futures={ex.submit(request_chunk,task):task for task in tasks}
        done=0
        for fut in as_completed(futures):
            task=futures[fut];results[(task[0],task[1])]=fut.result();done+=1
            if done%20==0:print('translated',done,'/',len(tasks),flush=True)
    sourcepaths=sorted((ROOT/'work'/'manuscript').glob('[0-9][0-9]-*.md'))
    for n,(path,(_,blocks)) in enumerate(zip(sourcepaths,b.CHAPTERS),1):
        merged={}
        for k,_ in enumerate(chunks(blocks)):merged.update(results[(n,k)])
        assert len(merged)==sum(x!='***' for x in blocks)
        paragraphs=[('***' if s=='***' else tidy(merged[i])) for i,s in enumerate(blocks)]
        output='# SCHLELBERG\n\n## Bab '+str(n)+' — '+TITLES[n-1]+'\n\n'+'\n\n'.join(paragraphs)+'\n'
        (DEST/path.name).write_text(output,encoding='utf-8')
    print('chapters',len(list(DEST.glob('[0-9][0-9]-*.md'))),flush=True)

if __name__=='__main__':main()
