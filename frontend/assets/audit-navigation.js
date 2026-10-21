(() => {
  const nav = document.querySelector('.brand-nav, .day-brand-nav');
  if (!nav || document.getElementById('auditNavButton')) return;
  const style = document.createElement('style');
  style.textContent = '.audit-nav-button{font:inherit;white-space:nowrap;cursor:pointer;background:transparent;color:inherit;border:0;padding:8px 12px;border-radius:7px}.audit-nav-button:hover,.audit-nav-button[aria-expanded="true"]{background:#e0edff;color:#1d4ed8}.audit-nav-menu{position:fixed;z-index:10000;width:220px;max-width:calc(100vw - 24px);padding:8px;background:#fff;color:#17243a;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 12px 35px #0f172a26}.audit-nav-menu a{display:block;color:#17243a;padding:12px;border-radius:6px;text-decoration:none;font:600 14px sans-serif}.audit-nav-menu a:hover,.audit-nav-menu a:focus{background:#e0edff;color:#1d4ed8}';
  document.head.append(style);
  const button = document.createElement('button');
  button.id = 'auditNavButton'; button.className = 'brand-nav-btn audit-nav-button';button.type='button';button.textContent='감리대응 ▾';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','auditNavMenu');
  const menu=document.createElement('div');menu.setAttribute('role','navigation');menu.id='auditNavMenu';menu.className='audit-nav-menu';menu.hidden=true;menu.setAttribute('aria-label','감리대응 서브 메뉴');
  [['rfp','RFP'],['proposal','제안서 요약'],['requirements','요구사항 정의서'],['traceability','요구사항 추적표']].forEach(([id,label])=>{const a=document.createElement('a');a.href='/static/audit-response.html#'+id;a.textContent=label;menu.append(a);});
  nav.append(button);document.body.append(menu);
  function close(){menu.hidden=true;button.setAttribute('aria-expanded','false');}
  function position(){const rect=button.getBoundingClientRect();menu.style.left=Math.max(12,Math.min(rect.left,innerWidth-244))+'px';menu.style.top=Math.min(rect.bottom+6,innerHeight-menu.offsetHeight-12)+'px';}
  button.addEventListener('click',()=>{if(!menu.hidden){close();return;}menu.hidden=false;button.setAttribute('aria-expanded','true');position();});
  button.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();menu.hidden=false;button.setAttribute('aria-expanded','true');position();menu.querySelector('a').focus();}});
  document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!button.contains(e.target))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){close();button.focus();}});
  menu.addEventListener('click',close);window.addEventListener('resize',close);document.addEventListener('scroll',close,true);
})();
