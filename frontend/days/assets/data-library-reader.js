(function () {
  'use strict';

  const day = Number(document.body.dataset.day || 0);
  const libraryUrl = '/learning/documents';
  const documentUrl = '/learning/document?path=';
  const dayDocuments = {
    1: [
      'samples/finance_high_school_product_guide.txt',
      'samples/finance_financial_products_classification.txt',
      'samples/finance_lending_sectors_guide.txt',
      'samples/finance_aihub_rag_case.txt',
    ],
    2: [
      'samples/finance_etf_deep_dive.txt',
      'samples/finance_stock_dividend_basics.txt',
      'samples/finance_financial_statements_1.txt',
      'samples/finance_financial_statements_2.txt',
    ],
    3: [
      'samples/finance_accounting_tax_basics.txt',
      'samples/finance_economic_indicators.txt',
      'samples/finance_macro_analysis_practice.txt',
      'samples/finance_industry_analysis.txt',
    ],
    4: [
      'samples/finance_technical_analysis_1.txt',
      'samples/finance_technical_analysis_2.txt',
      'samples/finance_foreign_investor_flows.txt',
      'samples/finance_kospi200_foreign_futures_options_hts_guide.txt',
      'samples/finance_pair_trading_cases.txt',
      'samples/finance_industry_analysis_practice.txt',
    ],
    5: [
      'samples/finance_asset_allocation.txt',
      'samples/finance_portfolio_theory.txt',
      'samples/finance_valuation_multiples.txt',
      'samples/finance_glossary.txt',
      'samples/finance_quantopian_intro.txt',
    ],
  };
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));

  function renderMarkdown(source) {
    const html = [];
    let fence = false;
    let code = [];
    let table = [];
    let list = '';
    const closeList = () => { if (list) html.push(`</${list}>`); list = ''; };
    const closeCode = () => { if (code.length) html.push(`<pre class="source-code"><code>${esc(code.join('\n'))}</code></pre>`); code = []; };
    const closeTable = () => {
      if (!table.length) return;
      const rows = table.filter((line) => !/^[-:\s|]+$/.test(line));
      if (rows.length) html.push(`<div class="source-table-wrap"><table class="source-table"><tbody>${rows.map((line) => `<tr>${line.replace(/^\||\|$/g, '').split('|').map((cell) => `<td>${esc(cell.trim())}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      table = [];
    };
    source.split('\n').forEach((line) => {
      if (line.startsWith('```')) { fence = !fence; if (!fence) closeCode(); return; }
      if (fence) { code.push(line); return; }
      if (/^\|.*\|\s*$/.test(line)) { closeList(); table.push(line); return; }
      closeTable();
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) { closeList(); const level = Math.min(heading[1].length + 1, 6); html.push(`<h${level}>${esc(heading[2])}</h${level}>`); return; }
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
      if (bullet || ordered) { const next = bullet ? 'ul' : 'ol'; if (list !== next) { closeList(); html.push(`<${next}>`); list = next; } html.push(`<li>${esc((bullet || ordered)[1])}</li>`); return; }
      closeList();
      if (!line.trim()) return;
      html.push(line.startsWith('> ') ? `<blockquote>${esc(line.slice(2))}</blockquote>` : `<p>${esc(line)}</p>`);
    });
    closeCode(); closeTable(); closeList();
    return html.join('');
  }

  function renderDocument(document) {
    return `<section class="source-document"><header><span>DATA SOURCE</span><h3>${esc(document.title)}</h3><code>data/${esc(document.path)}</code></header><div>${renderMarkdown(document.content)}</div></section>`;
  }

  async function mountDataLibrary() {
    const target = document.querySelector('.lesson-list');
    if (!target || !day) return;
    try {
      const response = await fetch(libraryUrl, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(String(response.status));
      const available = await response.json();
      const byPath = new Map(available.map((document) => [document.path, document]));
      const assignedPaths = Object.values(dayDocuments).flat();
      // 새로 추가된 data 텍스트 파일도 누락하지 않도록, 사전 분류되지 않은 문서는
      // 5일차의 통합 자료에 자동 배정한다.
      const additionalPaths = day === 5
        ? available.map((document) => document.path).filter((path) => !assignedPaths.includes(path))
        : [];
      const paths = [...(dayDocuments[day] || []), ...additionalPaths];
      const missing = paths.filter((path) => !byPath.has(path));
      if (missing.length) throw new Error(`missing documents: ${missing.join(', ')}`);
      const documents = await Promise.all(paths.map(async (path) => {
        const item = await fetch(`${documentUrl}${encodeURIComponent(path)}`, { headers: { Accept: 'application/json' } });
        if (!item.ok) throw new Error(`unable to load ${path}`);
        return item.json();
      }));
      target.insertAdjacentHTML('beforeend', `<section class="source-library" aria-label="data 원문 상세 학습 자료"><div class="source-library-head"><span>DATA 원문 상세 학습 자료</span><h2>이 일차에 배정된 학습 문서 전체</h2><p><code>data</code> 아래의 텍스트 문서를 한 번씩 1~5일차에 배정해, 원문 전체를 HTML 학습 화면에서 표시합니다.</p></div><div class="source-library-body">${documents.map(renderDocument).join('')}</div></section>`);
    } catch (error) {
      target.insertAdjacentHTML('beforeend', '<section class="source-library source-library-error"><strong>데이터 학습 자료를 불러오지 못했습니다.</strong><p>서버 실행 상태와 문서 경로를 확인한 뒤 다시 시도해 주세요.</p></section>');
    }
  }

  document.addEventListener('DOMContentLoaded', mountDataLibrary);
}());
