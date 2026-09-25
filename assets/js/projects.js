(function(){
  'use strict';
  var search = document.getElementById('repo-search');
  var language = document.getElementById('repo-language');
  var status = document.getElementById('repo-status');
  var sort = document.getElementById('repo-sort');
  var result = document.getElementById('repo-result');
  var empty = document.getElementById('repo-empty');
  var form = document.getElementById('repo-controls');
  var list = document.getElementById('repo-list');
  var rows = Array.from(document.querySelectorAll('.repo-row'));
  if (!rows.length) return;
  document.documentElement.classList.add('js');

  function filterRepositories(){
    var query = search ? search.value.trim().toLowerCase() : '';
    var selectedLanguage = language ? language.value : '';
    var selectedStatus = status ? status.value : '';
    var shown = 0;
    rows.forEach(function(row){
      var matches = (!query || row.dataset.search.indexOf(query) !== -1) &&
        (!selectedLanguage || row.dataset.language === selectedLanguage) &&
        (!selectedStatus || row.dataset.status === selectedStatus);
      row.hidden = !matches;
      if (matches) shown += 1;
    });
    if (empty) empty.hidden = shown !== 0;
    if (result) result.textContent = shown === rows.length ? 'Showing all ' + rows.length + ' repositories.' : 'Showing ' + shown + ' of ' + rows.length + ' repositories.';
  }

  function sortRepositories(){
    var mode = sort ? sort.value : 'name';
    var ordered = rows.slice().sort(function(a, b){
      if (mode === 'language') return a.dataset.language.localeCompare(b.dataset.language) || a.dataset.name.localeCompare(b.dataset.name);
      return mode === 'name-desc' ? b.dataset.name.localeCompare(a.dataset.name) : a.dataset.name.localeCompare(b.dataset.name);
    });
    ordered.forEach(function(row, index){
      row.querySelector('.repo-index').textContent = String(index + 1).padStart(2, '0');
      list.appendChild(row);
    });
  }

  if (search) search.addEventListener('input', filterRepositories);
  if (language) language.addEventListener('change', filterRepositories);
  if (status) status.addEventListener('change', filterRepositories);
  if (sort) sort.addEventListener('change', sortRepositories);
  if (form) form.addEventListener('submit', function(event){ event.preventDefault(); });
})();
