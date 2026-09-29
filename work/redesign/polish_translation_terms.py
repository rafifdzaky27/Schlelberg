from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
target=root/'work/manuscript-id'

# Preserve the previously written literary translation of chapter one, while
# bringing its character names and final revelation into the revised canon.
first=(root/'outputs/manuscript/01-takaran-sang-raja.md').read_text(encoding='utf-8-sig')
for old,new in [('Toby','Tobious'),('Maria','Mariya'),('Panji','Panjios'),('Saman','Samon'),('Daran','Darran'),('Theren','Therren')]:
    first=re.sub(r'\b'+old+r'\b',new,first)
first=first.replace('“Mereka datang mencarimu.”','“Pintu itulah yang mereka cari. Dan kini mereka tahu kau bisa membukanya.”')
(target/'01-the-kings-measure.md').write_text(first,encoding='utf-8')

for path in sorted(target.glob('[0-9][0-9]-*.md')):
    text=path.read_text(encoding='utf-8')
    for old,new in [
        ('An Iwang','Seekor Iwang'),('The Hollow Ones','Para Iwang'),
        ('Stoples','Tempayan'),('stoples','tempayan'),('Toples','Tempayan'),('toples','tempayan'),
        ('Barley','Jelai'),('barley','jelai'),('skyway','jalan layang'),('Skyway','Jalan layang'),
        ('trotoar','jalan batu'),('Trotoar','Jalan batu'),
        ('receiver','Receiver'),('Storehouse','Gudang Penyimpanan'),
        ('di toko ini','di gudang ini'),('mencari toko','mencari persediaan'),
        ('toko-toko rumah tangga','persediaan rumah tangga'),('toko pesisir','gudang pesisir'),
        ('toko tepi pantai','gudang pesisir'),('toko umum','persediaan bersama'),
        ('daftar toko','daftar persediaan'),('toko servis','gudang layanan'),
        ('toko pasokan','gudang pasokan'),('di toko malam itu','di gudang malam itu'),
        ('toko arus','persediaan saat ini'),('toko untuk','persediaan untuk'),
        ('toko yang aku bawa','persediaan yang kubawa'),('toko itu','persediaan itu'),
        ('toko pernikahan','persediaan pernikahan'),('tentang toko','tentang persediaan')]:
        text=text.replace(old,new)
    # Some machine output adopts formal third-person pronouns in narration;
    # the shorter form fits the voice of the existing literary chapter.
    text=re.sub(r'\bDia\b','Ia',text)
    text=re.sub(r'\bdia\b','ia',text)
    path.write_text(text,encoding='utf-8')
print('Polished terminology in',len(list(target.glob('[0-9][0-9]-*.md'))),'chapters')
