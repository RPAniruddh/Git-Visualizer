/* contentService — the single source of command content for Git Visualizer.
   Mirrors the REST contract served by the Git Visualizer backend:
     GET /api/v1/commands        → [{id,title,category,shortExplanation}]
     GET /api/v1/commands/{id}   → full command object (incl. graphs, sandboxSeed)
     GET /api/v1/workflows       → [{id,title,description}]
     GET /api/v1/workflows/{id}  → {id,title,description,steps,note}

   BACKEND MODE (this file): all content is fetched once at boot and cached in
   memory; the synchronous accessors below then read the cache, so nothing
   downstream (picker, lesson view, graph renderer) changed when we swapped from
   the bundled JSON. window.contentService is only assigned AFTER the fetch
   completes — the app's ready() poll shows its loading screen until then.

   Config: window.GV_API_BASE   (default http://localhost:8080)
   If the backend is unreachable, a full-page interruption screen is shown with
   a retry button — the app is not started with stale bundled content. */
(function () {
  var API_BASE = (typeof window !== 'undefined' && window.GV_API_BASE) || 'http://localhost:8080';
  var db = null;

  // Apply the saved theme as early as possible so the loading screen and the
  // interruption overlay render in the right palette before the app boots.
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('gv-theme') === 'dark') {
      document.documentElement.classList.add('gv-dark');
      window.GV_DARK = true;
    }
  } catch (e) { /* storage unavailable — stay light */ }

  function need() {
    if (!db) throw new Error('contentService: content not loaded yet');
    return db;
  }

  function categoriesFrom(commands) {
    // Preserve the contract's category ordering when the bundle is present;
    // otherwise fall back to order of first appearance in the command list.
    var bundled = (typeof window !== 'undefined') && window.GV_CONTENT && window.GV_CONTENT.categories;
    if (bundled && bundled.length) return bundled.slice();
    var seen = {}, order = [];
    commands.forEach(function (c) {
      if (!seen[c.category]) { seen[c.category] = true; order.push(c.category); }
    });
    return order;
  }

  function getJson(path) {
    return fetch(API_BASE + path).then(function (r) {
      if (!r.ok) throw new Error('GET ' + path + ' → HTTP ' + r.status);
      return r.json();
    });
  }

  function loadFromBackend() {
    return Promise.all([getJson('/api/v1/commands'), getJson('/api/v1/workflows')])
      .then(function (lists) {
        var detailFetches = lists[0].map(function (c) { return getJson('/api/v1/commands/' + c.id); });
        var workflowFetches = lists[1].map(function (w) { return getJson('/api/v1/workflows/' + w.id); });
        return Promise.all([Promise.all(detailFetches), Promise.all(workflowFetches)]);
      })
      .then(function (full) {
        return { categories: categoriesFrom(full[0]), commands: full[0], workflows: full[1] };
      });
  }

  var contentService = {
    getCategories: function () { return need().categories.slice(); },

    listCommands: function () {
      return need().commands.map(function (c) {
        return { id: c.id, title: c.title, category: c.category, shortExplanation: c.shortExplanation };
      });
    },

    // Picker grid grouped by category, categories in contract order.
    listByCategory: function () {
      var cats = need().categories;
      var all = this.listCommands();
      return cats.map(function (cat) {
        return { category: cat, commands: all.filter(function (c) { return c.category === cat; }) };
      }).filter(function (g) { return g.commands.length; });
    },

    getCommand: function (id) {
      return need().commands.find(function (c) { return c.id === id; }) || null;
    },

    getWorkflows: function () { return (need().workflows || []).slice(); },

    firstCommandId: function () { var c = need().commands[0]; return c && c.id; },

    // Async mirrors of the documented HTTP contract.
    async fetchCommands() { return this.listCommands(); },
    async fetchCommand(id) { return this.getCommand(id); }
  };

  function showInterruptionScreen(err) {
    function render() {
      if (document.getElementById('gv-interruption')) return;
      var overlay = document.createElement('div');
      overlay.id = 'gv-interruption';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--gv-bg,#F5F6F8);display:flex;align-items:center;justify-content:center;font-family:\'Instrument Sans\',system-ui,sans-serif;color:var(--gv-ink,#171B26)';
      overlay.innerHTML =
        '<div style="max-width:420px;text-align:center;padding:32px">' +
          '<div style="font-size:44px;margin-bottom:18px">&#9888;&#65039;</div>' +
          '<div style="font-weight:700;font-size:22px;letter-spacing:-.02em;margin-bottom:10px">We’re facing some interruption</div>' +
          '<div style="font-size:14.5px;line-height:1.55;color:var(--gv-text2,#565F72);margin-bottom:26px">The command library couldn’t be reached right now. Please check your connection or try again in a moment.</div>' +
          '<div id="gv-retry" style="display:inline-block;font-size:14px;font-weight:600;color:var(--gv-on-ink,#fff);background:var(--gv-ink,#171B26);border-radius:8px;padding:10px 22px;cursor:pointer">Try again</div>' +
          '<div style="margin-top:16px;font-size:12px;color:var(--gv-muted,#9AA3B5);font-family:\'JetBrains Mono\',monospace">' + String(err && err.message || err).replace(/</g, '&lt;') + '</div>' +
        '</div>';
      document.body.appendChild(overlay);
      document.getElementById('gv-retry').onclick = function () { location.reload(); };
    }
    if (document.body) render();
    else document.addEventListener('DOMContentLoaded', render);
  }

  if (typeof window === 'undefined') return;

  loadFromBackend()
    .then(function (loaded) {
      db = loaded;
      window.contentService = contentService;
    })
    .catch(function (err) {
      console.error('contentService: backend unavailable (' + err.message + ')');
      showInterruptionScreen(err);
    });
})();
