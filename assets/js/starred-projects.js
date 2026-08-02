(function(){
  'use strict';

  var grid = document.getElementById('starred-projects');
  var status = document.getElementById('starred-status');
  if (!grid) return;

  var username = grid.dataset.githubUser || 'ildrm';
  var apiUrl = 'https://api.github.com/users/' + encodeURIComponent(username) + '/starred';

  function formatCount(value){
    return new Intl.NumberFormat('en').format(value || 0);
  }

  function addCube(parent){
    var scene = document.createElement('div');
    var cube = document.createElement('div');
    scene.className = 'cube-scene';
    cube.className = 'cube';
    ['front', 'back', 'right', 'left', 'top', 'bottom'].forEach(function(face){
      var side = document.createElement('div');
      side.className = 'face f-' + face;
      cube.appendChild(side);
    });
    scene.appendChild(cube);
    parent.appendChild(scene);
  }

  function createCard(repository, index){
    var card = document.createElement('article');
    var head = document.createElement('div');
    var label = document.createElement('span');
    var title = document.createElement('h3');
    var description = document.createElement('p');
    var tags = document.createElement('div');
    var link = document.createElement('a');
    var owner = repository.owner && repository.owner.login ? repository.owner.login : username;

    card.className = 'fig-card starred-card';
    card.dataset.tilt = '';
    head.className = 'fig-head';
    label.className = 'fig-label';
    label.textContent = 'STAR ' + String(index + 1).padStart(2, '0');
    head.appendChild(label);
    addCube(head);

    title.textContent = repository.name;
    description.textContent = repository.description || 'No repository description has been provided.';
    tags.className = 'tags';
    [owner, repository.language || 'Not specified', formatCount(repository.stargazers_count) + ' stars'].forEach(function(value){
      var tag = document.createElement('span');
      tag.textContent = value;
      tags.appendChild(tag);
    });

    link.className = 'fig-link';
    link.href = repository.html_url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'View repository';

    card.appendChild(head);
    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(tags);
    card.appendChild(link);
    return card;
  }

  function renderRepositories(repositories){
    var fragment = document.createDocumentFragment();
    repositories.forEach(function(repository, index){
      fragment.appendChild(createCard(repository, index));
    });
    grid.replaceChildren(fragment);
    if (status) status.textContent = repositories.length + ' starred repositories synced from GitHub.';
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  async function fetchStarredRepositories(){
    var repositories = [];
    var page = 1;

    while (page <= 10){
      var response = await fetch(apiUrl + '?per_page=100&page=' + page, {
        headers:{
          Accept:'application/vnd.github+json',
          'X-GitHub-Api-Version':'2022-11-28'
        }
      });
      if (!response.ok) throw new Error('GitHub API returned ' + response.status);

      var batch = await response.json();
      if (!Array.isArray(batch)) throw new Error('GitHub API returned an unexpected response');
      repositories = repositories.concat(batch);
      if (batch.length < 100) return repositories;
      page += 1;
    }

    return repositories;
  }

  fetchStarredRepositories()
    .then(function(repositories){
      if (!repositories.length) throw new Error('No public starred repositories were returned');
      renderRepositories(repositories);
    })
    .catch(function(error){
      if (status) status.textContent = 'GitHub is temporarily unavailable. Showing the default selection.';
      console.warn('Unable to load starred repositories:', error);
    });
})();
