(function(){
  'use strict';
  var search = document.getElementById('repo-search');
  var language = document.getElementById('repo-language');
  var status = document.getElementById('repo-status');
  var result = document.getElementById('repo-result');
  var form = document.getElementById('repo-controls');
  var rows = Array.from(document.querySelectorAll('.repo-row'));
  if (!rows.length) return;

  function filterRepositories(){
    var query = search ? search.value.trim().toLowerCase() : '';
    var selectedLanguage = language ? language.value : '';
    var selectedStatus = status ? status.value : '';
    var shown = 0;
    rows.forEach(function(row){
      var matches = (!query || row.dataset.name.indexOf(query) !== -1) &&
        (!selectedLanguage || row.dataset.language === selectedLanguage) &&
        (!selectedStatus || row.dataset.status === selectedStatus);
      row.hidden = !matches;
      if (matches) shown += 1;
    });
    if (result) result.textContent = shown === rows.length ? 'Showing all ' + rows.length + ' repositories.' : 'Showing ' + shown + ' of ' + rows.length + ' repositories.';
  }

  if (search) search.addEventListener('input', filterRepositories);
  if (language) language.addEventListener('change', filterRepositories);
  if (status) status.addEventListener('change', filterRepositories);
  if (form) form.addEventListener('submit', function(event){ event.preventDefault(); });
})();
