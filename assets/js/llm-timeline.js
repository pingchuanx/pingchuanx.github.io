(function () {
  const raw = Array.isArray(window.LLM_TIMELINE_DATA) ? window.LLM_TIMELINE_DATA : [];

  const data = raw
    .map(normalizeItem)
    .filter(item => item.dateObj && !Number.isNaN(item.dateObj.valueOf()))
    .sort((a, b) => b.dateObj - a.dateObj);

  const els = {
    yearSelect: document.getElementById('year-select'),
    companySelect: document.getElementById('company-select'),
    searchInput: document.getElementById('overview-search'),
    yearStrip: document.getElementById('year-strip'),

    statYears: document.getElementById('stat-years'),
    statCompanies: document.getElementById('stat-companies'),
    statFamilies: document.getElementById('stat-families'),
    statRecords: document.getElementById('stat-records'),

    rangeText: document.getElementById('range-text'),
    activeCompaniesText: document.getElementById('active-companies-text'),
    latestModelText: document.getElementById('latest-model-text'),
    latestModelDesc: document.getElementById('latest-model-desc')
  };

  const state = {
    year: 'all',
    company: 'all',
    search: ''
  };

  init();

  function init() {
    populateFilters();
    bindEvents();
    render();
  }

  function normalizeItem(item) {
    const date = item.date || '';
    const dateObj = new Date(date + 'T00:00:00');
    return {
      date,
      dateObj,
      year: String(dateObj.getFullYear()),
      company: item.company || 'Unknown',
      modelName: item.modelName || 'Untitled',
      family: item.family || 'Uncategorized',
      modality: item.modality || 'Unknown',
      paperTitle: item.paperTitle || '',
      link: item.link || '',
      notes: item.notes || ''
    };
  }

  function populateFilters() {
    const years = unique(data.map(d => d.year)).sort((a, b) => Number(b) - Number(a));
    const companies = unique(data.map(d => d.company)).sort((a, b) => a.localeCompare(b));

    years.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      els.yearSelect.appendChild(option);
    });

    companies.forEach(company => {
      const option = document.createElement('option');
      option.value = company;
      option.textContent = company;
      els.companySelect.appendChild(option);
    });
  }

  function bindEvents() {
    els.yearSelect.addEventListener('change', e => {
      state.year = e.target.value;
      render();
    });

    els.companySelect.addEventListener('change', e => {
      state.company = e.target.value;
      render();
    });

    els.searchInput.addEventListener('input', e => {
      state.search = e.target.value.trim().toLowerCase();
      render();
    });
  }

  function getFilteredData() {
    return data.filter(item => {
      const yearPass = state.year === 'all' ? true : item.year === state.year;
      const companyPass = state.company === 'all' ? true : item.company === state.company;
      const haystack = [
        item.modelName,
        item.company,
        item.family,
        item.modality,
        item.paperTitle,
        item.notes
      ].join(' ').toLowerCase();

      const searchPass = state.search ? haystack.includes(state.search) : true;

      return yearPass && companyPass && searchPass;
    });
  }

  function render() {
    const filtered = getFilteredData();
    renderStats(filtered);
    renderYearStrip(filtered);
  }

  function renderStats(list) {
    const years = unique(list.map(d => d.year)).sort((a, b) => Number(a) - Number(b));
    const companies = unique(list.map(d => d.company));
    const families = unique(list.map(d => d.family));
    const latest = list[0];

    els.statYears.textContent = years.length ? `${years[0]}–${years[years.length - 1]}` : '-';
    els.statCompanies.textContent = companies.length;
    els.statFamilies.textContent = families.length;
    els.statRecords.textContent = list.length;

    els.rangeText.textContent = years.length ? `${years[0]} – ${years[years.length - 1]}` : '-';
    els.activeCompaniesText.textContent = companies.length ? companies.join(' / ') : '-';

    if (latest) {
      els.latestModelText.textContent = latest.modelName;
      els.latestModelDesc.textContent = `${latest.date} · ${latest.company}`;
    } else {
      els.latestModelText.textContent = '-';
      els.latestModelDesc.textContent = '-';
    }
  }

  function renderYearStrip(list) {
    const grouped = groupBy(list, item => item.year);
    const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

    if (!years.length) {
      els.yearStrip.innerHTML = `<div class="llm-year-card">当前筛选条件下没有结果。</div>`;
      return;
    }

    els.yearStrip.innerHTML = years.map(year => {
      const items = grouped[year];
      const companies = unique(items.map(i => i.company));
      const reps = items.slice(0, 2).map(i => i.modelName).join(' / ');

      return `
        <article class="llm-year-card">
          <div class="llm-year-card__year">${escapeHtml(year)}</div>
          <div class="llm-year-card__meta">
            <span class="llm-pill">${items.length} 节点</span>
            <span class="llm-pill">${companies.length} 公司</span>
          </div>
          <div class="llm-year-card__rep">
            代表节点：${escapeHtml(reps || '-')}
          </div>
        </article>
      `;
    }).join('');
  }

  function unique(arr) {
    return [...new Set(arr.filter(Boolean))];
  }

  function groupBy(arr, getKey) {
    return arr.reduce((acc, item) => {
      const key = getKey(item);
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
})();