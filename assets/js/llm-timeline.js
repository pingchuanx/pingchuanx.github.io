(function () {
  const rawData = Array.isArray(window.LLM_TIMELINE_DATA) ? window.LLM_TIMELINE_DATA : [];
  const state = {
    layout: 'combined',
    companies: new Set(),
    modalities: new Set(),
    search: '',
    sort: 'desc'
  };

  const els = {
    companyFilters: document.getElementById('company-filters'),
    modalityFilters: document.getElementById('modality-filters'),
    searchInput: document.getElementById('timeline-search'),
    sortSelect: document.getElementById('timeline-sort'),
    resultCount: document.getElementById('result-count'),
    timelineRoot: document.getElementById('timeline-root'),
    resetButton: document.getElementById('reset-filters'),
    selectAllButton: document.getElementById('select-all-companies')
  };

  const normalized = rawData
    .map(normalizeItem)
    .filter(item => item.dateValue instanceof Date && !Number.isNaN(item.dateValue.valueOf()));

  const allCompanies = uniqueValues(normalized.map(item => item.company));
  const allModalities = uniqueValues(normalized.map(item => item.modality));
  allCompanies.forEach(v => state.companies.add(v));
  allModalities.forEach(v => state.modalities.add(v));

  renderFilterChips(els.companyFilters, allCompanies, state.companies, 'company');
  renderFilterChips(els.modalityFilters, allModalities, state.modalities, 'modality');

  document.querySelectorAll('input[name="timeline-layout"]').forEach(radio => {
    radio.addEventListener('change', function (event) {
      state.layout = event.target.value;
      render();
    });
  });

  els.searchInput.addEventListener('input', function (event) {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });

  els.sortSelect.addEventListener('change', function (event) {
    state.sort = event.target.value;
    render();
  });

  els.resetButton.addEventListener('click', function () {
    state.search = '';
    state.sort = 'desc';
    state.companies = new Set(allCompanies);
    state.modalities = new Set(allModalities);
    els.searchInput.value = '';
    els.sortSelect.value = 'desc';
    syncCheckboxes('company', state.companies);
    syncCheckboxes('modality', state.modalities);
    document.querySelector('input[name="timeline-layout"][value="combined"]').checked = true;
    state.layout = 'combined';
    render();
  });

  els.selectAllButton.addEventListener('click', function () {
    if (state.companies.size === allCompanies.length) {
      state.companies.clear();
    } else {
      allCompanies.forEach(v => state.companies.add(v));
    }
    syncCheckboxes('company', state.companies);
    render();
  });

  render();

  function normalizeItem(item) {
    const date = item.date || '';
    const dateValue = new Date(date + 'T00:00:00');
    return {
      date,
      dateValue,
      dateLabel: formatDate(dateValue),
      year: dateValue.getFullYear(),
      company: item.company || 'Unknown',
      modelName: item.modelName || 'Untitled model',
      family: item.family || '',
      modality: item.modality || 'Unknown',
      paperTitle: item.paperTitle || item.modelName || '',
      link: item.link || '',
      notes: item.notes || ''
    };
  }

  function uniqueValues(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function renderFilterChips(container, values, activeSet, kind) {
    container.innerHTML = '';
    values.forEach(value => {
      const id = `${kind}-${slugify(value)}`;
      const label = document.createElement('label');
      label.className = 'llm-chip';
      label.setAttribute('for', id);
      label.innerHTML = `
        <input type="checkbox" id="${id}" data-kind="${kind}" value="${escapeHtml(value)}" checked>
        <span>${escapeHtml(value)}</span>
      `;
      const input = label.querySelector('input');
      input.addEventListener('change', handleChipChange);
      container.appendChild(label);
    });
  }

  function handleChipChange(event) {
    const value = event.target.value;
    const kind = event.target.dataset.kind;
    const targetSet = kind === 'company' ? state.companies : state.modalities;
    if (event.target.checked) {
      targetSet.add(value);
    } else {
      targetSet.delete(value);
    }
    render();
  }

  function syncCheckboxes(kind, activeSet) {
    document.querySelectorAll(`input[data-kind="${kind}"]`).forEach(input => {
      input.checked = activeSet.has(input.value);
    });
  }

  function getFilteredItems() {
    const filtered = normalized.filter(item => {
      const companyPass = state.companies.has(item.company);
      const modalityPass = state.modalities.has(item.modality);
      const haystack = [item.modelName, item.company, item.family, item.modality, item.paperTitle, item.notes]
        .join(' ')
        .toLowerCase();
      const searchPass = !state.search || haystack.includes(state.search);
      return companyPass && modalityPass && searchPass;
    });

    filtered.sort((a, b) => {
      const diff = a.dateValue - b.dateValue;
      return state.sort === 'asc' ? diff : -diff;
    });

    return filtered;
  }

  function render() {
    const items = getFilteredItems();
    els.resultCount.textContent = `${items.length} record${items.length === 1 ? '' : 's'}`;

    if (!items.length) {
      els.timelineRoot.innerHTML = '<div class="llm-empty">No records match the current filters. Try resetting the company, modality, or keyword filters.</div>';
      return;
    }

    if (state.layout === 'grouped') {
      els.timelineRoot.innerHTML = renderGroupedByCompany(items);
    } else {
      els.timelineRoot.innerHTML = renderCombined(items);
    }
  }

  function renderCombined(items) {
    const byYear = groupBy(items, item => String(item.year));
    return Object.keys(byYear)
      .sort((a, b) => state.sort === 'asc' ? Number(a) - Number(b) : Number(b) - Number(a))
      .map(year => `
        <section class="llm-year-group">
          <h2 class="llm-year-heading">${year}</h2>
          <ol class="llm-list">
            ${byYear[year].map(renderCardItem).join('')}
          </ol>
        </section>
      `)
      .join('');
  }

  function renderGroupedByCompany(items) {
    const byCompany = groupBy(items, item => item.company);
    return Object.keys(byCompany)
      .sort((a, b) => a.localeCompare(b))
      .map(company => `
        <section class="llm-company-group">
          <h2 class="llm-company-heading">${escapeHtml(company)}</h2>
          ${renderCombined(byCompany[company])}
        </section>
      `)
      .join('');
  }

  function renderCardItem(item) {
    return `
      <li class="llm-item">
        <article class="llm-card">
          <div class="llm-card-top">
            <div>
              <h3 class="llm-title">${escapeHtml(item.modelName)}</h3>
              ${item.family ? `<div>${escapeHtml(item.family)}</div>` : ''}
            </div>
            <div><strong>${escapeHtml(item.dateLabel)}</strong></div>
          </div>
          <div class="llm-meta">
            <span class="llm-badge">${escapeHtml(item.company)}</span>
            <span class="llm-badge">${escapeHtml(item.modality)}</span>
          </div>
          ${item.paperTitle ? `<p class="llm-paper"><strong>Paper / Report:</strong> ${escapeHtml(item.paperTitle)}</p>` : ''}
          ${item.link ? `<p><a href="${escapeAttribute(item.link)}" target="_blank" rel="noopener noreferrer">Open reference</a></p>` : ''}
          ${item.notes ? `<p class="llm-notes">${escapeHtml(item.notes)}</p>` : ''}
        </article>
      </li>
    `;
  }

  function groupBy(items, getKey) {
    return items.reduce((acc, item) => {
      const key = getKey(item);
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  }

  function formatDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.valueOf())) return 'Unknown date';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).format(date);
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

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
