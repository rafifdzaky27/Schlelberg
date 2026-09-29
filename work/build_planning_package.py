from pathlib import Path
import hashlib
import json
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent.parent
PLAN = ROOT / 'work' / 'planning'
OUT = ROOT / 'outputs'
PACKAGE = OUT / 'schlelberg-planning-package'
REFERENCE = PACKAGE / 'reference'
REFERENCE.mkdir(parents=True, exist_ok=True)

modules = sorted(PLAN.glob('[0-9][0-9]-*.md'))
assert len(modules) == 12
chapters = []
for source in sorted(PLAN.glob('0[4-7]-*.md')):
    contents = source.read_text(encoding='utf-8')
    for match in re.finditer(r'^## (\d+)\. ([^\n]+)\n(.*?)(?=^## |\Z)', contents, re.M | re.S):
        number, title, body = int(match[1]), match[2], match[3]
        target = 2800 if number == 1 else int(re.search(r'\*\*Target:\*\* ([\d,]+)', body)[1].replace(',', ''))
        viewpoint = re.search(r'\*\*POV:\*\* (\w+)', body)[1]
        scenes = re.findall(r'^([123])\. \*\*', body, re.M)
        assert scenes == ['1', '2', '3'], (number, scenes)
        chapters.append({'number': number, 'title': title, 'target_words': target, 'pov': viewpoint, 'scenes': len(scenes)})
assert [c['number'] for c in chapters] == list(range(1, 33))
assert [c['number'] for c in chapters if c['pov'] == 'Mariya'] == [4, 7, 10, 14, 20, 23, 26, 28, 32]
assert all(c['pov'] in ('Tobious', 'Mariya') for c in chapters)
assert 60 - 12 == 48 and 48 - 3 - 2 == 43

original = Path('C:/Users/Rafif/Downloads/Schlelberg - Draft 3 (1).docx')
request = Path('C:/Users/Rafif/.codex/attachments/09ea2bf3-73a2-4578-8bd7-20567a845ea9/Pasted text.txt')
chapter_one = ROOT / 'work' / 'manuscript' / '01-the-kings-measure.md'
source_map_path = ROOT / 'work' / 'project-memory' / '01-original-manuscript-map.md'
source_map = source_map_path.read_text(encoding='utf-8').split('## Dokumen hidup')[0].split('## Current reconstruction')[0].strip()
assert 'Prolog / 2–14' in source_map and 'Bab 13 / 374–402' in source_map
for source in (original, request, chapter_one):
    assert source.is_file(), source
shutil.copy2(original, REFERENCE / original.name)
shutil.copy2(request, REFERENCE / 'original-request.txt')
shutil.copy2(chapter_one, REFERENCE / chapter_one.name)
(REFERENCE / 'original-manuscript-map.md').write_text(source_map + '\n', encoding='utf-8')
assert hashlib.sha256(original.read_bytes()).digest() == hashlib.sha256((REFERENCE / original.name).read_bytes()).digest()
assert 'They came here for you.' in chapter_one.read_text(encoding='utf-8')

word_count = sum(len(p.read_text(encoding='utf-8').split()) for p in modules)
target_total = sum(c['target_words'] for c in chapters)
validation = f'''# Planning package validation

Structural checks completed on 28 September 2026.

- 12 numbered planning modules present.
- 32 chapter cards, consecutively numbered 1–32 without duplicates.
- 96 scene cards: three numbered scenes in every chapter.
- 23 Tobious-viewpoint chapters and 9 Mariya-viewpoint chapters; allocation matches the story contract.
- Sum of chapter word budgets: {target_total:,}, counting Chapter 1 at the lower 2,800-word revision target. These are future prose targets, not written prose counts.
- Numbered planning modules contain approximately {word_count:,} whitespace-delimited words; this excludes reference documents and the handover.
- Captive arithmetic checked: 60 = 12 released + 48 stranded; 48 − 3 confinement deaths − 2 evacuation deaths = 43 survivors.
- Correct original DOCX copied unchanged; SHA-256 comparison passed.
- Existing English Chapter 1 includes the 18-character naming revision where applicable; its documented warning patch remains to be applied during execution.
- All 18 author-selected name changes are documented in naming-canon.md; full-name and familiar-name usage is explicit.
- Wrong original source and obsolete Indonesian draft excluded from this package.

Editorial consistency review covered the paired clock, 41-second sensory echo versus physical gates, root/receiver geography, transfer interval, mass-release window, sword/shield limits, food and care, body-side injuries, message delivery, supporting operators' travel, permanent separation, and two political aftermaths. Clarifications were incorporated into the modules.

These checks establish a complete and internally reviewed outline. They do not certify unwritten prose, literary quality, commercial success, or exhaustive historical accuracy. Future drafting still needs the movement and full-manuscript reviews specified in the execution protocol.
'''
(PLAN / 'validation.md').write_text(validation, encoding='utf-8')

for source in modules + [PLAN / 'README-ID.md', PLAN / 'handover.md', PLAN / 'validation.md', PLAN / 'naming-canon.md']:
    shutil.copy2(source, PACKAGE / source.name)

master = ['# SCHLELBERG — COMPLETE DEVELOPMENTAL PLAN\n',
          f'Version 1.1 • 28 September 2026 • 32 chapters • 96 scene cards • approximately {target_total:,} target novel words.\n',
          'This is the complete planning document, not the finished novel. The modular files are the editable source. Begin with the [Indonesian reading guide](schlelberg-planning-package/README-ID.md) or the [handover](schlelberg-planning-package/handover.md).\n',
          '## Contents\n']
for source in modules + [PLAN / 'naming-canon.md']:
    first_heading = source.read_text(encoding='utf-8').splitlines()[0].lstrip('# ')
    master.append(f'- [{first_heading}](schlelberg-planning-package/{source.name})')
for source in modules + [PLAN / 'naming-canon.md']:
    body = source.read_text(encoding='utf-8')
    body = re.sub(r'^(#{1,5}) ', r'#\1 ', body, flags=re.M)
    master.append('\n\n---\n\n' + body)
(OUT / 'SCHLELBERG-MASTER-PLAN.md').write_text('\n'.join(master) + '\n', encoding='utf-8')

# Preserve earlier concept records, then make the ten requested living memories
# unambiguous indexes to the authoritative modules rather than conflicting copies.
memory = ROOT / 'work' / 'project-memory'
archive = memory / 'archive' / 'before-complete-plan'
archive.mkdir(parents=True, exist_ok=True)
for old in sorted(memory.glob('[0-9][0-9]-*.md')):
    target = archive / old.name
    if not target.exists():
        shutil.copy2(old, target)
mapping = {
 '02-story-dna.md': ('STORY DNA', [('01-story-contract.md', 'Narrative identity, themes, causal chain, preserved/rebuilt elements'), ('11-editorial-audit.md', 'Source comparison and reasons for changes')]),
 '03-character-bible.md': ('CHARACTER BIBLE', [('03-character-bible.md', 'All active profiles, arcs, voices, relationships')]),
 '04-world-bible.md': ('WORLD BIBLE', [('02-world-and-rules.md', 'Active world, institutions, material life, technology, rules')]),
 '05-timeline.md': ('TIMELINE', [('08-continuity-and-timeline.md', 'Day-by-day chronology, bodies, geography, objects, communications')]),
 '06-knowledge-secret-matrix.md': ('KNOWLEDGE / SECRET MATRIX', [('09-reveals-and-payoffs.md', 'Who knows what and when; mystery revelations')]),
 '07-setup-payoff-map.md': ('SETUP / PAYOFF MAP', [('09-reveals-and-payoffs.md', '24 setup/payoff rows, emotional and tension curves')]),
 '08-reconstructed-story-architecture.md': ('RECONSTRUCTED STORY ARCHITECTURE', [('01-story-contract.md', 'Five movements, causal chain, ending'), ('11-editorial-audit.md', 'Plot-hole tests and revision gates')]),
 '09-chapter-outline.md': ('CHAPTER OUTLINE', [(f.name, f.stem) for f in sorted(PLAN.glob('0[4-7]-*.md'))]),
 '10-revision-decision-log.md': ('REVISION DECISION LOG', [('naming-canon.md', 'All 18 author-confirmed name selections'), ('00-START-HERE.md', 'Author locks versus design locks'), ('11-editorial-audit.md', 'Change rationale and opening patch'), ('handover.md', 'Current completed/pending status'), ('10-execution-protocol.md', 'Future state/deviation ledger')]),
}
for filename, (heading, links) in mapping.items():
    text = f'# {heading}\n\nUpdated 28 September 2026: complete planning version 1.1 is authoritative. Earlier concepts are retained in archive/before-complete-plan/ and are historical, not active canon.\n\n'
    text += '\n'.join(f'- [{description}](../planning/{name})' for name, description in links)
    text += '\n\nUpdate the linked canonical module when a decision changes; record actual prose continuity separately during execution. Only English Chapter 1 currently exists in prose.\n'
    (memory / filename).write_text(text, encoding='utf-8')
source_map_path.write_text(source_map + '\n\n## Current reconstruction\n\nThis map remains a factual record of the correct original. Active reconstruction: [complete plan](../planning/00-START-HERE.md). Current English prose: [Chapter 1](../manuscript/01-the-kings-measure.md). Original chapter events do not override the new plan.\n', encoding='utf-8')

project = ROOT / 'work' / 'PROJECT.md'
previous = project.read_text(encoding='utf-8')
project_archive = ROOT / 'work' / 'PROJECT-before-complete-plan.md'
if not project_archive.exists():
    project_archive.write_text(previous, encoding='utf-8')
project.write_text('''# Schlelberg working project

Current phase: complete planning version 1.1, prose paused at the author's request. Architecture through Chapter 32 is finished. Resume prose only when requested.

All 18 author-selected names are in [naming canon](planning/naming-canon.md), applied to the active plan and Chapter 1. Familiar names: Tobi, Panji, Lio.

Read [handover](planning/handover.md) and [start here](planning/00-START-HERE.md). Author-locked: English novel, Indonesian collaboration; occupied Bronze Age village; advanced future shield-and-sword combat; the Iwang / the Hollow Ones; Suss, Panjios, Ypin; both Tobious and Mariya survive permanently separated across eras.

Active editable plan: work/planning/. Active prose: work/manuscript/01-the-kings-measure.md only. Chapter 1 needs the small patch in planning/11-editorial-audit.md before Chapter 2. Chapters 2–32 are not written. Planning uses 32 chapters, 96 scene cards, and approximately 93,200 target words.

Keep complete prose drafts in this project during collaboration; no automatic full-chapter dumps or output links after every writing pass. Deliver the assembled novel when finished. The completed planning package is a separate requested deliverable under outputs/.

Ten living memory indexes in work/project-memory/ now point to the canonical modules. Earlier concept versions are archived locally. Older outputs/project-memory/ and Indonesian manuscript output are historical snapshots, not active canon. The only valid original source is Schlelberg - Draft 3 (1).docx. Never import the discarded BJB source.

No model switch, new task, or messages to another task have been performed. The author intends to use Sol for later drafting; planning and handover support this without depending on a new chat.
''', encoding='utf-8')

zip_path = OUT / 'schlelberg-planning-package.zip'
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for source in sorted(PACKAGE.rglob('*')):
        if source.is_file():
            z.write(source, source.relative_to(PACKAGE).as_posix())
with zipfile.ZipFile(zip_path) as z:
    assert z.testzip() is None
    assert len(z.namelist()) == 20, z.namelist()
    assert not any('BJB' in n for n in z.namelist())
for source in modules:
    assert source.read_bytes() == (PACKAGE / source.name).read_bytes()

print(json.dumps({'chapters': len(chapters), 'scenes': sum(c['scenes'] for c in chapters), 'target_novel_words': target_total, 'numbered_plan_words': word_count, 'zip_files': 20, 'zip_bytes': zip_path.stat().st_size, 'master': str(OUT / 'SCHLELBERG-MASTER-PLAN.md'), 'package': str(zip_path)}, indent=2))
