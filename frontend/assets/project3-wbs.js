(() => {
  'use strict';
  const colors = {plan:'#0e2340',requirements:'#16635b',design:'#255ba1',build:'#62439a',verify:'#8a570d',release:'#9c405b',operate:'#73591f'};
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let current;
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-project3-wbs]');
    if (!trigger || current) return;
    const data = window.Day4ProjectSchedule.getProject3Wbs();
    const dialog = document.createElement('dialog');
    current = dialog;
    dialog.id = 'project3WbsDialog';
    dialog.setAttribute('aria-labelledby','project3WbsTitle');
    dialog.innerHTML = `<header class="wbs-header"><div><span>WORK BREAKDOWN STRUCTURE · PROJECT 3</span><h2 id="project3WbsTitle">${esc(data.title)}</h2></div><button type="button" data-wbs-close aria-label="WBS 닫기">닫기 ×</button></header>
      <div class="wbs-summary">10.22–11.11 · 15영업일 · 30개 일정 · 120개 담당 작업 · 개인별 120시간 / 팀 480인시</div>
      <div class="wbs-toolbar"><label>SDLC <select data-wbs-stage><option value="">전체 단계</option>${data.stages.map(s=>`<option value="${s.key}">${esc(s.label)}</option>`).join('')}</select></label><label>담당 <select data-wbs-role><option value="">전체 담당</option>${data.roles.map((r,i)=>`<option value="${i}">${esc(r)}</option>`).join('')}</select></label><label class="wbs-search">검색 <input data-wbs-search type="search" placeholder="작업·산출물 검색" /></label><button type="button" data-wbs-expand>전체 펼침</button><button type="button" data-wbs-collapse>접기</button><label>확대 <input data-wbs-zoom type="range" min="18" max="64" value="30" aria-label="간트 차트 시간축 확대" /></label><button type="button" data-wbs-list aria-pressed="false">텍스트 목록</button></div>
      <div class="wbs-legend">${data.stages.map(s=>`<span><i style="background:${colors[s.key]}"></i>${esc(s.label)}</span>`).join('')}<span>회색 날짜: 주말</span></div>
      <p class="wbs-help">막대는 계획된 반나절(4시간) 작업입니다. 행을 선택하면 담당·산출물이 표시됩니다. 펼침으로 담당별 작업을 확인하세요. 차트 안에서 방향키로 이동, Enter로 펼침·접기, 가로·세로 스크롤이 가능합니다.</p>
      <div class="wbs-main"><div class="wbs-chart-pane"><div class="wbs-chart-info" aria-live="polite"></div><div class="wbs-viewport"><div class="wbs-space"><canvas tabindex="0" role="img" aria-label="프로젝트3 계획 간트 차트. 방향키로 작업 선택, Enter로 담당별 펼침. 텍스트 목록도 제공됩니다."></canvas></div></div><div class="wbs-list" hidden></div></div><aside class="wbs-detail" aria-label="선택 작업 상세" aria-live="polite"></aside></div>`;
    document.body.append(dialog);
    const viewport = dialog.querySelector('.wbs-viewport'), space = dialog.querySelector('.wbs-space');
    const canvas = dialog.querySelector('canvas'), ctx = canvas.getContext('2d');
    const fontFamily = getComputedStyle(document.body).fontFamily;
    const detail = dialog.querySelector('.wbs-detail'), list = dialog.querySelector('.wbs-list');
    const stageSelect = dialog.querySelector('[data-wbs-stage]'), roleSelect = dialog.querySelector('[data-wbs-role]'), search = dialog.querySelector('[data-wbs-search]');
    const expanded = new Set();
    let rows = [], selected = data.tasks[0].id, cell = 30, frame = 0;
    const rowHeight = 34, head = 58;
    const days = [];
    for (let ms=Date.parse(data.start+'T00:00:00Z'); ms<=Date.parse(data.end+'T00:00:00Z'); ms+=86400000) days.push(new Date(ms));
    function visibleMembers(task) { return task.members.filter(m => roleSelect.value === '' || m.role === Number(roleSelect.value)); }
    function filtered() {
      const query = search.value.trim().toLowerCase();
      return data.tasks.filter(task => (!stageSelect.value || task.stage === stageSelect.value) && (!query || [task.id,task.phase,...visibleMembers(task).flatMap(m=>[m.task,m.output,data.roles[m.role]])].join(' ').toLowerCase().includes(query)));
    }
    function selectRow(row) {
      selected = row.id;
      const task = row.parent || row.task;
      const members = row.member ? [row.member] : visibleMembers(task);
      const stage = data.stages.find(s => s.key === task.stage);
      detail.innerHTML = `<span class="wbs-detail-id">${esc(row.id)} · ${esc(stage.label)}</span><h3>${esc(task.phase)}</h3><p>${esc(task.date)} · ${esc(task.period)} · 개인별 4시간</p><p>${esc(stage.meaning)}</p>${row.member ? '' : `<button type="button" data-wbs-toggle="${task.id}">${expanded.has(task.id)?'담당 작업 접기':'담당 작업 펼치기'}</button>`}${members.map(m=>`<section><h4>${esc(data.roles[m.role])}</h4><b>${esc(m.id)} · ${esc(m.task)}</b><p>산출물 · ${esc(m.output)}</p><small>계획 공수 ${m.hours}시간</small></section>`).join('')}`;
      canvas.setAttribute('aria-label',`${row.id} ${task.phase}, ${task.date} ${task.period}. ${members.map(m=>data.roles[m.role]+': '+m.task+', 산출물 '+m.output).join('; ')}`);
      scheduleDraw();
    }
    function rebuild() {
      const tasks = filtered();
      rows = tasks.flatMap(task => [{id:task.id,task},...(expanded.has(task.id) ? visibleMembers(task).map(member=>({id:member.id,task,parent:task,member})) : [])]);
      dialog.querySelector('.wbs-chart-info').textContent = `${tasks.length}개 일정 · ${tasks.reduce((n,t)=>n+visibleMembers(t).length,0)}개 담당 작업 · ${tasks.reduce((n,t)=>n+visibleMembers(t).length*4,0)}인시 · 현재 ${rows.length}행`;
      space.style.height = Math.max(viewport.clientHeight,head + rows.length*rowHeight)+'px';
      const row = rows.find(r=>r.id===selected) || rows[0];
      if (row) selectRow(row); else detail.innerHTML='<p>검색 조건에 맞는 작업이 없습니다.</p>';
      list.innerHTML = `<table><caption>프로젝트3 WBS 작업 목록</caption><thead><tr><th>WBS</th><th>일정·단계</th><th>담당·작업·산출물</th></tr></thead><tbody>${tasks.map(t=>`<tr><td>${t.id}</td><td>${esc(t.date)} ${esc(t.period)}<br>${esc(t.phase)}</td><td>${visibleMembers(t).map(m=>`<p><b>${esc(m.id)} · ${esc(data.roles[m.role])}</b><br>${esc(m.task)}<br>산출물 · ${esc(m.output)} · ${m.hours}시간</p>`).join('')}</td></tr>`).join('')}</tbody></table>`;
      scheduleDraw();
    }
    function shorten(text, width) {
      let value = text;
      while (value.length>1 && ctx.measureText(value+'…').width>width) value=value.slice(0,-1);
      return value===text ? text : value+'…';
    }
    function draw() {
      frame=0;
      const width=viewport.clientWidth, height=viewport.clientHeight;
      if (!width || !height) return;
      const label = width<550 ? 152 : 280, dpr=Math.min(devicePixelRatio||1,2);
      space.style.width=Math.max(width,label+days.length*2*cell)+'px';
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
      canvas.style.width=width+'px';canvas.style.height=height+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
      const sx=viewport.scrollLeft, sy=viewport.scrollTop;
      ctx.save();ctx.beginPath();ctx.rect(label,head,width-label,height-head);ctx.clip();
      days.forEach((date,index)=>{
        const x=label+index*2*cell-sx;
        if ([0,6].includes(date.getUTCDay())) {ctx.fillStyle='#edf0f4';ctx.fillRect(x,head,cell*2,height-head);}
        ctx.strokeStyle='#e1e7ef';ctx.beginPath();ctx.moveTo(x,head);ctx.lineTo(x,height);ctx.stroke();
      });
      rows.forEach((row,index)=>{
        const y=head+index*rowHeight-sy;
        if(y+rowHeight<head || y>height) return;
        if(row.id===selected){ctx.fillStyle='#eaf0fc';ctx.fillRect(label,y,width-label,rowHeight);}
        const task=row.task, slot=Math.round((Date.parse(task.date+'T00:00:00Z')-days[0].getTime())/86400000)*2+(task.period==='오후'?1:0);
        const x=label+slot*cell-sx;
        ctx.fillStyle=colors[task.stage];ctx.globalAlpha=row.member?0.65:1;ctx.fillRect(x+3,y+8,cell-6,18);ctx.globalAlpha=1;
        ctx.strokeStyle='#edf0f5';ctx.beginPath();ctx.moveTo(label,y+rowHeight);ctx.lineTo(width,y+rowHeight);ctx.stroke();
      });ctx.restore();
      ctx.fillStyle='#f7f9fc';ctx.fillRect(0,head,label,height-head);
      ctx.font=`12px ${fontFamily}`;
      rows.forEach((row,index)=>{
        const y=head+index*rowHeight-sy;
        if(y+rowHeight<head || y>height) return;
        ctx.fillStyle=row.id===selected?'#dce8fc':row.member?'#fff':'#f1f4f8';ctx.fillRect(0,y,label,rowHeight-1);
        ctx.fillStyle=colors[row.task.stage];ctx.fillRect(0,y,4,rowHeight-1);
        ctx.fillStyle='#0e2340';ctx.font=`${row.member?'11px':'bold 12px'} ${fontFamily}`;
        const text=row.member?`   ${row.id} ${data.roles[row.member.role].split(' · ')[1]}`:`${expanded.has(row.id)?'▾':'▸'} ${row.id} ${row.task.phase}`;
        ctx.fillText(shorten(text,label-18),10,y+22);
      });
      ctx.fillStyle='#0e2340';ctx.fillRect(0,0,width,head);ctx.fillStyle='#fff';ctx.font=`bold 12px ${fontFamily}`;ctx.fillText('WBS · 작업 / 담당',12,33);
      ctx.save();ctx.beginPath();ctx.rect(label,0,width-label,head);ctx.clip();
      days.forEach((date,index)=>{
        const x=label+index*2*cell-sx;
        ctx.fillStyle=[0,6].includes(date.getUTCDay())?'#a8b7ca':'#fff';ctx.font=`11px ${fontFamily}`;
        ctx.fillText(`${date.getUTCMonth()+1}/${date.getUTCDate()} ${'일월화수목금토'[date.getUTCDay()]}`,x+3,22);
        ctx.font=`10px ${fontFamily}`;ctx.fillText('오전',x+3,44);ctx.fillText('오후',x+cell+3,44);
      });ctx.restore();
    }
    function scheduleDraw(){if(!frame) frame=requestAnimationFrame(draw);}
    function reveal(index){const top=index*rowHeight;if(top<viewport.scrollTop)viewport.scrollTop=top;else if(top+rowHeight>viewport.scrollTop+viewport.clientHeight-head)viewport.scrollTop=top+rowHeight-viewport.clientHeight+head;}
    canvas.addEventListener('click',event=>{const rect=canvas.getBoundingClientRect();const y=event.clientY-rect.top;if(y<head)return;const index=Math.floor((y-head+viewport.scrollTop)/rowHeight);if(rows[index])selectRow(rows[index]);});
    canvas.addEventListener('keydown',event=>{
      let index=rows.findIndex(r=>r.id===selected);
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
        event.preventDefault();index=event.key==='Home'?0:event.key==='End'?rows.length-1:Math.max(0,Math.min(rows.length-1,index+(event.key==='ArrowDown'?1:-1)));if(rows[index]){selectRow(rows[index]);reveal(index);}
      } else if(event.key==='Enter' && rows[index]){event.preventDefault();const id=rows[index].task.id;expanded.has(id)?expanded.delete(id):expanded.add(id);rebuild();}
      else if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();viewport.scrollLeft+=event.key==='ArrowRight'?cell*2:-cell*2;}
    });
    dialog.addEventListener('click',event=>{
      if(event.target.closest('[data-wbs-close]'))dialog.close();
      const toggle=event.target.closest('[data-wbs-toggle]');if(toggle){const id=toggle.dataset.wbsToggle;expanded.has(id)?expanded.delete(id):expanded.add(id);rebuild();}
      if(event.target.closest('[data-wbs-expand]')){filtered().forEach(t=>expanded.add(t.id));rebuild();}
      if(event.target.closest('[data-wbs-collapse]')){expanded.clear();rebuild();}
      const listButton=event.target.closest('[data-wbs-list]');if(listButton){const show=list.hidden;list.hidden=!show;viewport.hidden=show;listButton.setAttribute('aria-pressed',String(show));listButton.textContent=show?'간트 차트':'텍스트 목록';scheduleDraw();}
      if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}
    });
    [stageSelect,roleSelect].forEach(el=>el.addEventListener('change',()=>{viewport.scrollTop=0;rebuild();}));
    search.addEventListener('input',()=>{viewport.scrollTop=0;rebuild();});
    dialog.querySelector('[data-wbs-zoom]').addEventListener('input',event=>{cell=Number(event.target.value);scheduleDraw();});
    viewport.addEventListener('scroll',scheduleDraw,{passive:true});
    const observer=new ResizeObserver(scheduleDraw);observer.observe(viewport);
    dialog.addEventListener('close',()=>{observer.disconnect();cancelAnimationFrame(frame);dialog.remove();current=null;trigger.focus();},{once:true});
    dialog.showModal();rebuild();
    document.fonts.load(`12px ${fontFamily}`, data.tasks.map(t=>t.phase).join('')+data.roles.join('')+'오전오후일월화수목금토작업담당').then(scheduleDraw).catch(()=>{});
  });
})();
