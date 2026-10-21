"""Extract authoritative RFP requirement tables without publishing the source document."""
from pathlib import Path
from zipfile import ZipFile
from collections import Counter
import hashlib
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / '교육혁신본부 AX를 위한 AI 에이전트 플랫폼 구축 사업 제안요청서(261020).hwpx'
requirements = []
with ZipFile(source) as archive:
    for section in sorted(n for n in archive.namelist() if re.fullmatch(r'Contents/section\d+\.xml', n)):
        root = ET.fromstring(archive.read(section))
        for table in (e for e in root.iter() if e.tag.endswith('}tbl')):
            fields = {}
            for row in (e for e in table if e.tag.endswith('}tr')):
                cells = []
                for cell in (e for e in row if e.tag.endswith('}tc')):
                    paragraphs = [''.join(t.text or '' for t in p.iter() if t.tag.endswith('}t'))
                                  for p in cell.iter() if p.tag.endswith('}p')]
                    cells.append('\n'.join(paragraphs).strip())
                if len(cells) == 2:
                    fields[cells[0]] = cells[1]
            rid = fields.get('요구사항 고유번호', '')
            if re.fullmatch(r'(SFR|SIR|DAR|TER|SER|QUR|PMR|PSR|WEB)-\d{3}', rid):
                requirements.append(dict(id=rid, category=fields['요구사항 분류'],
                    name=fields['요구사항 명칭'], definition=fields.get('정의', ''),
                    details=fields.get('세부내용', ''), artifact=fields.get('산출정보', '원문 기재 없음'),
                    source='Ⅳ. 제안요청 내용 > 마. 상세요구사항 > '+rid))
expected = dict(SFR=14, SIR=8, DAR=4, TER=4, SER=4, QUR=3, PMR=3, PSR=4, WEB=14)
assert Counter(r['id'].split('-')[0] for r in requirements) == Counter(expected)
assert len({r['id'] for r in requirements}) == 58
assert all(r['name'] and r['definition'] and r['details'] for r in requirements)
output = dict(source=dict(filename=source.name, title='교육혁신본부 AX를 위한 AI 에이전트 플랫폼 구축 사업 제안요청서',
    organization='부산대학교', sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
    period='계약체결일 ~ 2027. 2. 19.(금)', budget='금 541,000,000(부가세 포함)',
    note='표지 표기: 2026. 9. / 파일명 표기: 261020. 요구사항 본문은 원문에서 추출하며 페이지 번호는 제공하지 않습니다.'),
    requirements=requirements)
(ROOT/'frontend/assets/audit-rfp-data.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print('Extracted',len(requirements),'requirements:',dict(Counter(r['id'].split('-')[0] for r in requirements)))
