from pypdf import PdfReader
from pathlib import Path
import json
p=Path(__file__).resolve().parents[2]
r=PdfReader(p/'outputs/Schlelberg - facing-page reader.pdf')
ids={pg.indirect_reference.idnum for pg in r.pages}
links=[a.get_object() for pg in r.pages for a in pg.get('/Annots',[])]
assert len(links)==32
assert all((a['/Dest'][0].idnum in ids) if hasattr(a['/Dest'][0],'idnum') else (0<=int(a['/Dest'][0])<len(r.pages)) for a in links)
print('Reader verified: 32 valid internal links; '+str(len(r.pages))+' pages.')
