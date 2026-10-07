(() => {
  'use strict';
  const schedule = document.getElementById('day4ProjectSchedule');
  if (!schedule) return;
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sample = window.Day4DeliverableSamples;
  if (!sample) return;
  function illustration(c, d) {
    const lines = (value, width) => {
      const result=[]; let line='', units=0;
      for (const char of String(value)) {
        const size = char.charCodeAt(0) > 255 ? 1 : 0.55;
        if (char === '\n' || units + size > width) {result.push(line); line=''; units=0; if(char==='\n') continue;}
        line+=char; units+=size;
      }
      result.push(line); return result;
    };
    const text = (value,x,y,size=17,width=52,color='#334155') => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${lines(value,width).map((line,i)=>`<tspan x="${x}" dy="${i?size*1.5:0}">${esc(line)}</tspan>`).join('')}</text>`;
    const count=d.headers.length, colWidth=900/count;
    let y=210;
    let body=d.headers.map((h,i)=>`<rect x="${40+i*colWidth}" y="${y}" width="${colWidth}" height="48" fill="#e0e7ff" stroke="#cbd5e1"/>${text(h,50+i*colWidth,y+30,17,(colWidth-24)/17)}`).join('');
    y+=48;
    d.rows.forEach((row,j)=>{
      const height=Math.max(...row.map(v=>lines(v,(colWidth-24)/16).length))*24+30;
      row.forEach((v,i)=>{body+=`<rect x="${40+i*colWidth}" y="${y}" width="${colWidth}" height="${height}" fill="${j%2?'#f8fafc':'#fff'}" stroke="#cbd5e1"/>${text(v,50+i*colWidth,y+28,16,(colWidth-24)/16)}`;});
      y+=height;
    });
    if(d.code){y+=34; body+=text('첨부 코드 / demo source',40,y,18); y+=26; const codeHeight=lines(d.code,78).length*24+28;body+=`<rect x="40" y="${y-18}" width="900" height="${codeHeight}" fill="#eef2ff"/>${text(d.code,56,y+8,16,78)}`;y+=codeHeight;}
    d.notes.forEach(note=>{y+=36;body+=text(note,40,y,16,56);y+=Math.max(0,lines(note,56).length-1)*24;});
    const height=y+85;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="980" height="${height}" viewBox="0 0 980 ${height}"><rect width="980" height="${height}" rx="12" fill="#fff"/><g font-family="sans-serif">${text('작성 완료 SAMPLE / '+d.id,40,40,17,58,'#4f46e5')}${text(c.name,40,84,27,32,'#0f172a')}${text(c.project+' / '+d.summary,40,132,17,52)}${text('작성: '+c.role+' / 버전: v0.1',40,182,16,56,'#64748b')}${body}${text('교육용 작성 예시 / 실제 시험·승인·운영 실적이 아닙니다.',40,height-28,16,56,'#64748b')}</g></svg>`;
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'deliverable-example-dialog';
  dialog.setAttribute('aria-labelledby', 'deliverableExampleTitle');
  dialog.innerHTML = '<header class="deliverable-example-header"><div><p class="deliverable-example-context"></p><h2 id="deliverableExampleTitle"></h2></div><button type="button" class="deliverable-example-close" aria-label="산출물 예시 닫기" autofocus>닫기 ×</button></header><div class="deliverable-example-body"><p class="deliverable-example-description"></p><figure><img alt=""><figcaption></figcaption></figure><details class="deliverable-example-document"><summary>문서 본문 텍스트로 보기</summary><div class="deliverable-example-document-content"></div></details><nav class="deliverable-example-links" aria-label="산출물 참고 링크"><a class="deliverable-example-download" download>예시 문서 SVG 저장 ↓</a><a class="deliverable-example-google" target="_blank" rel="noopener noreferrer">관련 이미지 검색 ↗</a></nav></div>';
  document.body.append(dialog);
  let opener, previousOverflow;
  dialog.querySelector('.deliverable-example-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const r = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.style.overflow = previousOverflow; opener?.focus({preventScroll:true}); });
  schedule.addEventListener('click', event => {
    const button = event.target.closest('[data-deliverable-example]');
    if (!button) return;
    const cell = button.closest('td'), row = cell.parentElement;
    const column = [...row.children].indexOf(cell);
    const c = {role:button.closest('table').querySelectorAll('thead th')[column].textContent, name:button.dataset.deliverableExample, task:cell.querySelector('b').textContent, phase:row.children[1].querySelector('b').textContent, project:button.closest('.project-schedule-sheet').querySelector('.project-schedule-sheet-head span').textContent.replace('나만의 ', '').replace(' 개발 및 성과 검증 프로젝트', ''), slot:row.querySelector('th').textContent};
    const d = sample.build(c);
    dialog.querySelector('h2').textContent = c.name + ' · 작성 예시';
    dialog.querySelector('.deliverable-example-context').textContent = c.project+' / '+row.querySelector('th b').textContent+' / '+c.phase+' / '+button.closest('table').querySelectorAll('thead th')[column].textContent;
    dialog.querySelector('.deliverable-example-description').textContent = '「'+c.name+'」를 실제로 작성한 형태의 예시입니다. 문서 ID·입력값·결과·담당·판정은 모두 교육용 가상 기록입니다.';
    const image = dialog.querySelector('img');
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(illustration(c,d));
    image.alt = c.name+' 작성본: '+d.summary+' / '+d.rows.map(r=>r.join(' / ')).join('; ');
    dialog.querySelector('figcaption').textContent = d.id+' / '+d.summary+' / 자체 제작한 가상 작성본';
    const content = dialog.querySelector('.deliverable-example-document-content');
    content.innerHTML = '<p>'+esc(d.summary)+'</p><div class="deliverable-document-table-wrap"><table><thead><tr>'+d.headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+d.rows.map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+(d.code?'<pre><code>'+esc(d.code)+'</code></pre>':'')+d.notes.map(note=>'<p>'+esc(note)+'</p>').join('');
    dialog.querySelector('details').open = window.innerWidth < 620;
    const download = dialog.querySelector('.deliverable-example-download');
    download.href = image.src; download.download = c.project+'-'+c.name.replace(/[\\/:*?"<>|]/g,'-')+'-예시.svg';
    dialog.querySelector('.deliverable-example-google').href = 'https://www.google.com/search?tbm=isch&q='+encodeURIComponent(c.name+' '+c.phase+' 예시');
    opener=button; previousOverflow=document.body.style.overflow; document.body.style.overflow='hidden'; dialog.showModal();
  });
  schedule.querySelectorAll('tbody td small').forEach(cell => {
    if (!cell.textContent.startsWith('산출물 · ')) return;
    const names = cell.textContent.slice('산출물 · '.length).split(' · ').map(s => s.trim()).filter(Boolean);
    cell.replaceChildren(document.createTextNode('산출물 · '));
    names.forEach((name,i) => {
      if(i) cell.append(document.createTextNode(' · '));
      const button=document.createElement('button'); button.type='button'; button.className='deliverable-example-button'; button.dataset.deliverableExample=name; button.setAttribute('aria-haspopup','dialog'); button.textContent=name; cell.append(button);
    });
  });
  const hint=document.createElement('p'); hint.className='deliverable-example-hint'; hint.textContent='산출물 이름을 클릭하면 요구사항 행·시험 판정·API 요청과 응답 등 내용이 채워진 산출물 작성본이 열립니다. 예시는 학습용이며 SVG 파일로 저장할 수 있습니다.';
  schedule.querySelector('.project-schedule-role-guide').before(hint);
})();
