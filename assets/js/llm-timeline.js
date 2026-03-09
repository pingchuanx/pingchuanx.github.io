
(function () {
  const rawData = Array.isArray(window.LLM_TIMELINE_DATA) ? window.LLM_TIMELINE_DATA : [];
  const normalized = rawData
    .map(item => ({
      date: item.date || '',
      company: item.company || 'Unknown',
      modelName: item.modelName || 'Untitled',
      modality: item.modality || '',
      link: item.link || '',
      notes: item.notes || ''
    }))
    .filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  const allCompanies = [...new Set(normalized.map(item => item.company))].sort((a, b) => a.localeCompare(b));
  const selectedCompanies = new Set(allCompanies);

  const els = {
    companyFilters: document.getElementById('company-filters'),
    resultCount: document.getElementById('result-count'),
    tableRoot: document.getElementById('timeline-table-root'),
    selectAllBtn: document.getElementById('select-all-companies'),
    clearBtn: document.getElementById('clear-companies'),
    resetBtn: document.getElementById('reset-filters')
  };

  renderCompanyFilters();
  bindEvents();
  render();

  function bindEvents() {
    els.selectAllBtn.addEventListener('click', function () {
      allCompanies.forEach(company => selectedCompanies.add(company));
      syncCheckboxes();
      render();
    });

    els.clearBtn.addEventListener('click', function () {
      selectedCompanies.clear();
      syncCheckboxes();
      render();
    });

    els.resetBtn.addEventListener('click', function () {
      selectedCompanies.clear();
      allCompanies.forEach(company => selectedCompanies.add(company));
      syncCheckboxes();
      render();
    });
  }

  function renderCompanyFilters() {
    els.companyFilters.innerHTML = '';
    allCompanies.forEach(company => {
      const id = `company-${slugify(company)}`;
      const label = document.createElement('label');
      label.className = 'llm-chip';
      label.setAttribute('for', id);
      label.innerHTML = `
        <input type="checkbox" id="${id}" value="${escapeHtml(company)}" checked>
        <span>${escapeHtml(company)}</span>
      `;
      const input = label.querySelector('input');
      input.addEventListener('change', function (event) {
        if (event.target.checked) {
          selectedCompanies.add(company);
        } else {
          selectedCompanies.delete(company);
        }
        render();
      });
      els.companyFilters.appendChild(label);
    });
  }

  function syncCheckboxes() {
    els.companyFilters.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = selectedCompanies.has(input.value);
    });
  }

  function render() {
    const companies = allCompanies.filter(company => selectedCompanies.has(company));
    const items = normalized.filter(item => selectedCompanies.has(item.company));
    els.resultCount.textContent = `当前显示 ${companies.length} 家公司，${items.length} 条记录`;

    if (!companies.length) {
      els.tableRoot.innerHTML = '<div class="llm-empty">请至少勾选一个公司。</div>';
      return;
    }

    if (!items.length) {
      els.tableRoot.innerHTML = '<div class="llm-empty">当前所选公司下还没有记录。</div>';
      return;
    }

    const byDate = new Map();
    items.forEach(item => {
      if (!byDate.has(item.date)) byDate.set(item.date, []);
      byDate.get(item.date).push(item);
    });

    const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
    let lastYear = null;
    let rows = '';

    dates.forEach(date => {
      const year = date.slice(0, 4);
      if (year !== lastYear) {
        rows += `<tr class="llm-year-row"><td colspan="${companies.length + 1}">${year}</td></tr>`;
        lastYear = year;
      }

      const entriesForDate = byDate.get(date);
      rows += `<tr><td class="llm-date-col">${escapeHtml(date)}</td>`;
      companies.forEach(company => {
        const companyEntries = entriesForDate.filter(entry => entry.company === company);
        rows += `<td>${companyEntries.length ? companyEntries.map(renderEntry).join('') : '<span class="llm-cell-empty">—</span>'}</td>`;
      });
      rows += `</tr>`;
    });

    els.tableRoot.innerHTML = `
      <div class="llm-table-wrap">
        <table class="llm-table">
          <thead>
            <tr>
              <th class="llm-date-col">Date</th>
              ${companies.map(company => `<th>${escapeHtml(company)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function renderEntry(entry) {
    const title = entry.link
      ? `<a class="llm-model-link" href="${escapeAttr(entry.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(entry.modelName)}</a>`
      : `<span class="llm-model-link">${escapeHtml(entry.modelName)}</span>`;
    return `
      <div class="llm-entry">
        <div>${title}</div>
        ${entry.modality ? `<div class="llm-modality">${escapeHtml(entry.modality)}</div>` : ''}
        ${entry.notes ? `<div class="llm-notes">${escapeHtml(entry.notes)}</div>` : ''}
      </div>
    `;
  }

  function slugify(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
