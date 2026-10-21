"""Embedded Korean PDF report built from one evaluation snapshot."""
from datetime import datetime
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape
from zoneinfo import ZoneInfo

from reportlab.graphics.shapes import Drawing, Circle, Wedge, String, Rect
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

TITLE = "나만의 로보 어드바이저 개발 및 성과 검증 프로젝트 과정 중 팀별 소분과 프로젝트 수행결과"
PERIOD = "기간: 2026년 10월 1일 ~ 10월 21일"
FONT = "ProjectNanumGothic"


def create_report(snapshot):
    font_path = Path(__file__).resolve().parents[2] / "frontend/assets/fonts/NanumGothic-Regular.ttf"
    if FONT not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(FONT, str(font_path)))
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30,
        topMargin=32, bottomMargin=32, title=TITLE, author="Finance RAG Lab")
    text_style = ParagraphStyle("body", fontName=FONT, fontSize=10, leading=16, wordWrap="CJK", textColor=colors.HexColor("#243047"))
    title_style = ParagraphStyle("title", parent=text_style, fontSize=22, leading=32, spaceAfter=14)
    heading_style = ParagraphStyle("heading", parent=text_style, fontSize=16, leading=24, spaceAfter=10)
    cell_style = ParagraphStyle("cell", parent=text_style, fontSize=8, leading=12)
    center_style = ParagraphStyle("center", parent=cell_style, alignment=TA_CENTER)
    def p(text, style=text_style):
        return Paragraph(escape(str(text)).replace("\n", "<br/>"), style)
    def mean(value):
        return "평가 없음" if value is None else f"{value:.2f}"
    def table(rows, widths, header=True, padding=7):
        widths = [width * doc.width / sum(widths) for width in widths]
        result = Table(rows, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
        commands = [("FONTNAME",(0,0),(-1,-1),FONT),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ("GRID",(0,0),(-1,-1),0.4,colors.HexColor("#dbe3ef")),
            ("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),
            ("TOPPADDING",(0,0),(-1,-1),padding),("BOTTOMPADDING",(0,0),(-1,-1),padding)]
        if header:commands += [("BACKGROUND",(0,0),(-1,0),colors.HexColor("#e7eefb"))]
        result.setStyle(TableStyle(commands))
        return result
    generated = datetime.fromisoformat(snapshot['updated_at']).astimezone(ZoneInfo("Asia/Seoul")).strftime("%Y-%m-%d %H:%M:%S KST")
    story = [p(TITLE,title_style),p(PERIOD),p("보고서 생성·집계 시각: " + generated),Spacer(1,14),p("프로젝트 평가 종합",heading_style),
        p(f"평가 대상 {len(snapshot['teams'])}팀 · 유효 응답 {snapshot['count']}건 · 전체 평균 {mean(snapshot['overall']['overall_mean'])}"),
        p("척도: 1 매우 미흡 · 2 미흡 · 3 보통 · 4 우수 · 5 매우 우수. 높은 점수일수록 우수합니다."),Spacer(1,12)]
    rows=[[p(x,cell_style) for x in ["순위", "발표 팀", "평가 응답 수", "전체 평균 (1~5)"]]]
    for team in snapshot['ranking']:
        rows.append([p('미평가' if team['rank'] is None else f"{team['rank']}위",cell_style), p(team['label'],cell_style),p(f"{team['count']}건",cell_style),p(mean(team['overall_mean']),cell_style)])
    story += [table(rows,[100,260,180,240],padding=4),Spacer(1,14),p("집계 기준",heading_style),
        p("팀 랭킹: 전체 평균이 높을수록 상위이며, 소수 둘째 자리 평균이 같으면 공동 순위(1위·1위·3위)입니다. 응답이 없는 팀은 미평가로 표시합니다.",cell_style),
        p("팀 ID와 평가자 이름의 복합 고유키로 중복 등록을 제외합니다. 현재 설문 버전의 응답만 포함하며, 10문항은 동일 가중치입니다.",cell_style),
        p("표의 비율은 해당 문항의 유효 응답 수를 분모로 계산합니다. 반올림 때문에 비율 합계에 미세한 차이가 있을 수 있습니다.",cell_style),
        p("평가가 없는 경우 평균과 응답 비율은 ‘—’로 표시하며 0점으로 해석하지 않습니다. 프로젝트 기간과 별도로 다운로드 시점까지 저장된 응답을 집계합니다.",cell_style),
        p("ISO/IEC 25010:2023을 참고하고 창의성·실 제품화 항목을 추가한 수업용 설문이며, 공식 ISO 인증 평가는 아닙니다.",cell_style)]
    chart_colors = [colors.HexColor(value) for value in ['#fb7185','#fbbf24','#818cf8','#38bdf8','#10b981']]
    def pie_grid(stats):
        drawing = Drawing(doc.width, 640)
        for i, question in enumerate(snapshot['questions']):
            x = (i % 2) * (doc.width / 2) + doc.width / 4
            y = 580 - (i // 2) * 125
            distribution = stats['distribution'][i]
            total = sum(distribution)
            drawing.add(String(x, y+43, f"{question['id']}. {question['category']}", fontName=FONT, fontSize=8, textAnchor='middle', fillColor=colors.HexColor('#243047')))
            drawing.add(Circle(x,y,32,fillColor=colors.HexColor('#e2e8f0'),strokeColor=None))
            angle = 90
            if total:
                for value, color in zip(distribution,chart_colors):
                    if not value: continue
                    degrees = 360 * value / total
                    drawing.add(Wedge(x,y,32,angle-degrees,angle,fillColor=color,strokeColor=colors.white,strokeWidth=0.5))
                    angle -= degrees
            drawing.add(Circle(x,y,21,fillColor=colors.white,strokeColor=None))
            average = stats['means'][i]
            drawing.add(String(x,y+2, '—' if average is None else f"{average:.2f}",fontName=FONT,fontSize=13,textAnchor='middle',fillColor=colors.HexColor('#243047')))
            drawing.add(String(x,y-12,'평가 없음' if average is None else '평균 / 5',fontName=FONT,fontSize=7,textAnchor='middle',fillColor=colors.HexColor('#64748b')))
            for line, positions in enumerate([range(3),range(3,5)]):
                text = ' · '.join(f"{j+1}: {distribution[j]/total*100:.1f}%" for j in positions) if total else ('응답 없음' if line==0 else '')
                drawing.add(String(x,y-44-line*11,text,fontName=FONT,fontSize=6.5,textAnchor='middle',fillColor=colors.HexColor('#475569')))
        for i,label in enumerate(snapshot['scale']):
            x = i*(doc.width/5)+3
            drawing.add(Rect(x,5,8,8,fillColor=chart_colors[i],strokeColor=None))
            drawing.add(String(x+14,5,f"{i+1}. {label}",fontName=FONT,fontSize=8,fillColor=colors.HexColor('#243047')))
        return drawing
    def detail(label, stats):
        section = [PageBreak(),p(label + ' · 파이 차트',heading_style),
            p(f"{PERIOD} · 유효 응답 {stats['count']}건 · 전체 평균 {mean(stats['overall_mean'])}"),
            p('색상 조각은 문항별 1~5단계 응답 비율, 가운데 숫자는 평균입니다. 낮은 평균일수록 우수합니다.', cell_style),
            Spacer(1,12),pie_grid(stats)]
        section += [PageBreak(),p(label,heading_style),p(f"{PERIOD} · 유효 응답 {stats['count']}건 · 전체 평균 {mean(stats['overall_mean'])}"),Spacer(1,10)]
        headings=["문항 · 질문", "1 매우 미흡", "2 미흡", "3 보통", "4 우수", "5 매우 우수", "평균"]
        rows=[[p(x,center_style) for x in headings]]
        for i,q in enumerate(snapshot['questions']):
            cells=[p(f"{q['id']}. {q['category']} — {q['text']}",cell_style)]
            for count in stats['distribution'][i]:
                cells.append(p(f"{count}건 ({count/stats['count']*100:.1f}%)" if stats['count'] else "—",center_style))
            cells.append(p("—" if stats['means'][i] is None else f"{stats['means'][i]:.2f}",center_style))
            rows.append(cells)
        section += [table(rows,[330,78,72,72,72,84,72]),Spacer(1,10),p("1~5점 원점수 평균 · 높을수록 우수 · 응답 비율 = 단계별 응답 수 / 유효 응답 수 × 100",cell_style)]
        return section
    # Each team has quantitative results followed immediately by qualitative opinions.
    story += detail("전체 10문항 질문 및 답변 통계", snapshot["overall"])
    comment_header = ParagraphStyle("comment_header", parent=text_style, fontSize=11, leading=17, keepWithNext=True, spaceBefore=12, spaceAfter=6)
    for team in snapshot['teams']:
        story += detail(team['label'] + ' · 10문항 평가 결과', team)
        comments = team.get('comments', [])
        story += [PageBreak(), p('팀별 평가자 주관식 상세 의견', heading_style), p(team['label'], heading_style),
            p(f"평가 응답 {team['count']}건 · 주관식 의견 {len(comments)}건 · 설문 의견 미작성 {team.get('evidence_missing_count',0)}건"),
            p("평가자의 원문을 생략 없이 수록합니다. 기존 자유 의견은 설문 점수 집계와 구분합니다.", cell_style), Spacer(1,12)]
        if not comments:
            story.append(p('등록된 주관식 의견이 없습니다.'))
        for number, comment in enumerate(comments, 1):
            when = datetime.fromisoformat(comment['created_at']).astimezone(ZoneInfo('Asia/Seoul')).strftime('%Y-%m-%d %H:%M KST')
            story += [p(f"{number}. 평가자: {comment['author']} · {team['label']}", comment_header),
                      p(f"구분: {comment['source']} · 작성 시각: {when}", cell_style), Spacer(1,6),
                      p(comment['content']), Spacer(1,16)]
    for index, question in enumerate(snapshot['questions']):
        if index % 2 == 0:
            story += [PageBreak(), p('부록 · 문항별 채점 기준과 쉬운 예시', heading_style)]
        story += [p(f"{question['id']}. {question['category']}"), p(question['text'], cell_style),
                  p('평가 관점: ' + question['guidance'], cell_style),
                  p('쉬운 예시: ' + question['example'], cell_style), Spacer(1,6)]
        rubric_rows = [[p(f"{i + 1}점 · {snapshot['scale'][i]}", cell_style), p(description, cell_style)] for i,description in enumerate(question['ratings'])]
        story += [table(rubric_rows, [110,670], header=False, padding=4), Spacer(1,16)]
    def footer(canvas, _):
        canvas.saveState();canvas.setFont(FONT,8);canvas.setFillColor(colors.HexColor("#62718a"))
        canvas.drawString(30,18,"프로젝트 수행결과 · " + generated)
        canvas.drawRightString(A4[0]-30,18,str(doc.page));canvas.restoreState()
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    return buffer.getvalue()
