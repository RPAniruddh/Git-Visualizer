// GitSim — client-side Git simulation + commit-graph layout. No DOM, no framework.
var FILES = ['app.js', 'styles.css', 'api.js', 'auth.js', 'ui.js', 'tests.js', 'config.yml', 'index.html'];
var PALETTE = ['#7C5CE6', '#0E9488', '#C65BA2', '#5560C9', '#B07A2F'];

function mk() {
  return {
    exists: false, commits: [], branches: {}, lanes: {}, head: null,
    remotes: {}, tags: {}, working: [], staged: [], stash: null,
    pending: null, hasRemote: false, cloneable: false, seq: 0, fileN: 0, nextLane: 0
  };
}
function nid(r) {
  var id;
  do { id = Math.floor(Math.random() * 4096).toString(16); while (id.length < 3) id = '0' + id; }
  while (r.commits.some(function (c) { return c.id === id; }));
  return id;
}
function get(r, id) { return r.commits.find(function (c) { return c.id === id; }); }
function headTip(r) {
  if (!r.head) return null;
  return r.head.branch ? r.branches[r.head.branch] : r.head.detached;
}
function mkCommit(r, msg, parents, lane) {
  var c = { id: nid(r), parents: parents || [], msg: msg, lane: lane, t: r.seq++ };
  r.commits.push(c);
  return c;
}
function touch(r) {
  r.fileN++;
  var f = FILES[r.fileN % FILES.length];
  if (r.working.indexOf(f) < 0) r.working.push(f);
}
function ancestors(r, id) {
  var seen = {}, q = [id];
  while (q.length) {
    var cur = q.pop();
    if (!cur || seen[cur]) continue;
    seen[cur] = true;
    var c = get(r, cur);
    if (c) c.parents.forEach(function (p) { q.push(p); });
  }
  return seen;
}
function isAncestor(r, a, b) { return !!ancestors(r, b)[a]; }
function reachable(r) {
  var set = {};
  var roots = [];
  Object.keys(r.branches).forEach(function (b) { if (r.branches[b]) roots.push(r.branches[b]); });
  Object.keys(r.remotes).forEach(function (b) { if (r.remotes[b]) roots.push(r.remotes[b]); });
  Object.keys(r.tags).forEach(function (t) { roots.push(r.tags[t]); });
  if (r.head && r.head.detached) roots.push(r.head.detached);
  roots.forEach(function (id) { var a = ancestors(r, id); Object.keys(a).forEach(function (k) { set[k] = true; }); });
  return set;
}
function resolveRef(r, ref) {
  if (!ref) return null;
  var m = ref.match(/^HEAD(~(\d+))?$/);
  if (m) {
    var id = headTip(r), n = m[2] ? parseInt(m[2], 10) : 0;
    while (n-- > 0 && id) { var c = get(r, id); id = c && c.parents.length ? c.parents[0] : null; }
    return id;
  }
  if (r.branches[ref] !== undefined) return r.branches[ref];
  if (r.remotes[ref] !== undefined) return r.remotes[ref];
  if (r.tags[ref] !== undefined) return r.tags[ref];
  var hit = r.commits.filter(function (c) { return c.id.indexOf(ref) === 0; });
  return hit.length === 1 ? hit[0].id : null;
}
function initRepo(r) {
  r.exists = true; r.branches = { main: null }; r.lanes = { main: 0 };
  r.nextLane = 1; r.head = { branch: 'main' };
}
function commitOnBranch(r, b, msg) {
  var p = r.branches[b];
  var c = mkCommit(r, msg, p ? [p] : [], r.lanes[b]);
  r.branches[b] = c.id;
  return c;
}

/* ------------------------------ seeds ------------------------------ */
function seed(name) {
  var r = mk();
  var A = function (b, m) { return commitOnBranch(r, b, m); };
  var branchAt = function (name2, id) { r.branches[name2] = id; r.lanes[name2] = r.nextLane++; };
  var base3 = function () { initRepo(r); A('main', 'Initial commit'); A('main', 'Set up routing'); A('main', 'Add homepage'); };
  var twoBranch = function () {
    initRepo(r);
    A('main', 'Initial commit');
    var b = A('main', 'Set up routing');
    A('main', 'Fix homepage bug');
    branchAt('feature', b.id);
    A('feature', 'Add login form');
    A('feature', 'Style login page');
  };
  switch (name) {
    case 'init': r.cloneable = false; break;
    case 'add': initRepo(r); A('main', 'Initial commit'); r.working = ['app.js', 'styles.css']; break;
    case 'commit': initRepo(r); A('main', 'Initial commit'); A('main', 'Add homepage'); r.staged = ['login.js']; break;
    case 'branch': case 'tag': case 'log0': base3(); r.working = []; break;
    case 'checkout': base3(); branchAt('feature', r.branches.main); break;
    case 'merge': twoBranch(); break;
    case 'rebase': twoBranch(); r.head = { branch: 'feature' }; break;
    case 'cherry':
      initRepo(r);
      A('main', 'Initial commit');
      var b2 = A('main', 'Set up routing');
      branchAt('feature', b2.id);
      A('feature', 'Add dark mode');
      A('feature', 'Fix flaky test');
      break;
    case 'reset': initRepo(r); A('main', 'Initial commit'); A('main', 'Add payments'); A('main', 'Refactor API'); A('main', 'Oops — break the build'); break;
    case 'revert': initRepo(r); A('main', 'Initial commit'); A('main', 'Add signup page'); A('main', 'Change pricing logic'); break;
    case 'stash': initRepo(r); A('main', 'Initial commit'); A('main', 'Add dashboard'); r.working = ['hotfix.js']; break;
    case 'log':
      initRepo(r);
      A('main', 'Initial commit');
      var lb = A('main', 'Set up routing');
      var lc = A('main', 'Fix homepage bug');
      branchAt('feature', lb.id);
      A('feature', 'Add login form');
      var le = A('feature', 'Style login page');
      var mcommit = mkCommit(r, "Merge branch 'feature'", [lc.id, le.id], 0);
      r.branches.main = mcommit.id;
      break;
    case 'clone': r.cloneable = true; break;
    case 'remote': initRepo(r); A('main', 'Initial commit'); A('main', 'Add readme'); break;
    case 'push':
      initRepo(r);
      A('main', 'Initial commit');
      var pb = A('main', 'Add API client');
      A('main', 'Wire up UI');
      r.remotes['origin/main'] = pb.id; r.hasRemote = true;
      break;
    case 'fetch': case 'pull':
      initRepo(r);
      A('main', 'Initial commit');
      A('main', 'Add readme');
      r.remotes['origin/main'] = r.branches.main; r.hasRemote = true;
      r.pending = ['Update dependencies', 'Fix CI pipeline'];
      break;
    default: /* freeplay */
      initRepo(r); A('main', 'Initial commit'); r.working = ['app.js'];
  }
  return r;
}

/* ------------------------------ exec ------------------------------ */
function L(k, t) { return { k: k, t: t }; }
function err(t) { return { ok: false, lines: [L('err', t)] }; }
function ok(lines) { return { ok: true, lines: lines.map(function (t) { return typeof t === 'string' ? L('out', t) : t; }) }; }

var HELP = ['init', 'add', 'commit -m "…"', 'status', 'log', 'branch', 'checkout / switch', 'merge', 'rebase', 'cherry-pick', 'reset', 'revert', 'stash / stash pop', 'tag', 'remote add', 'push', 'pull', 'fetch', 'clone'];

function exec(r, line) {
  var raw = (line || '').trim();
  if (!raw) return { ok: false, lines: [] };
  if (raw === 'help') return ok([L('ok', 'Supported: ' + HELP.join(' · '))]);
  var t = (raw.match(/"[^"]*"|\S+/g) || []).map(function (s) { return s.replace(/^"|"$/g, ''); });
  if (t[0] !== 'git') return err("Commands here start with 'git' — try 'git " + t[0] + "'.");
  var cmd = t[1];
  if (!cmd) return err("git: missing a command. Type 'help' for the list.");
  if (!r.exists && ['init', 'clone'].indexOf(cmd) < 0)
    return err("There's no repository yet. Run 'git init'" + (r.cloneable ? " — or 'git clone <url>'" : '') + ' first.');
  var b = r.head && r.head.branch;
  var tipId = headTip(r);

  switch (cmd) {
    case 'init':
      if (r.exists) return err('This folder is already a Git repository.');
      initRepo(r); r.working = ['readme.md'];
      return ok([L('ok', 'Initialized empty Git repository in ~/project/.git/'), "You're on branch 'main'. There's a new file to track — try 'git status'."]);

    case 'clone': {
      if (r.exists) return err('This folder already has a repository.');
      if (!t[2]) return err('usage: git clone <url>');
      initRepo(r);
      commitOnBranch(r, 'main', 'Initial commit');
      commitOnBranch(r, 'main', 'Add rocket engine');
      commitOnBranch(r, 'main', 'Tune trajectory');
      r.remotes['origin/main'] = r.branches.main; r.hasRemote = true;
      return ok([L('ok', "Cloning into 'rocket'…"), 'Receiving objects: 100% (12/12), done.', "You now have the full history, plus a remote named 'origin'."]);
    }

    case 'status': {
      var lines = [r.head.branch ? "On branch " + b : 'HEAD detached at ' + tipId];
      if (r.staged.length) lines.push(L('ok', 'Staged for commit:  ' + r.staged.join(', ')));
      if (r.working.length) lines.push(L('err', 'Not staged (modified): ' + r.working.join(', ')));
      if (!r.staged.length && !r.working.length) lines.push('nothing to commit, working tree clean');
      return { ok: true, lines: lines.map(function (x) { return typeof x === 'string' ? L('out', x) : x; }) };
    }

    case 'add': {
      var target = t[2];
      if (!target) return err("usage: git add <file> — or 'git add .' for everything");
      if (!r.working.length) return err('Nothing to add — the working tree is clean.');
      if (target === '.' || target === '-A' || target === '--all') {
        r.staged = r.staged.concat(r.working); r.working = [];
        return ok([L('ok', 'Staged ' + r.staged.length + ' file(s). They will be in the next commit.')]);
      }
      var i = r.working.indexOf(target);
      if (i < 0) return err("pathspec '" + target + "' did not match any modified files (" + r.working.join(', ') + ')');
      r.working.splice(i, 1); r.staged.push(target);
      return ok([L('ok', "Staged '" + target + "'.")]);
    }

    case 'commit': {
      if (!r.head.branch) return err('You are in detached HEAD — check out a branch before committing here.');
      if (!r.staged.length) return err("Nothing staged. Stage changes first with 'git add .'");
      var mi = t.indexOf('-m');
      var msg = mi > -1 && t[mi + 1] ? t[mi + 1] : 'Update ' + r.staged[0];
      var n = r.staged.length;
      var c = commitOnBranch(r, b, msg);
      r.staged = []; touch(r);
      return ok([L('ok', '[' + b + ' ' + c.id + '] ' + msg), n + ' file(s) changed. (You kept editing — new changes appeared in the working tree.)']);
    }

    case 'branch': {
      if (!t[2]) {
        return ok(Object.keys(r.branches).map(function (name) { return (name === b ? '* ' : '  ') + name; }));
      }
      if (t[2] === '-d' || t[2] === '-D') {
        var dn = t[3];
        if (!dn || !(dn in r.branches)) return err("branch '" + (dn || '?') + "' not found.");
        if (dn === b) return err("Cannot delete the branch you're on.");
        delete r.branches[dn];
        return ok([L('ok', "Deleted branch '" + dn + "'.")]);
      }
      var name = t[2];
      if (r.branches[name] !== undefined) return err("A branch named '" + name + "' already exists.");
      if (!tipId) return err('Make a first commit before branching.');
      r.branches[name] = tipId; r.lanes[name] = r.nextLane++;
      return ok([L('ok', "Created branch '" + name + "' pointing at " + tipId + '. HEAD is still on ' + b + '.')]);
    }

    case 'checkout': case 'switch': {
      var arg = t[2];
      if (arg === '-b' || arg === '-c') {
        var nn = t[3];
        if (!nn) return err('usage: git ' + cmd + ' ' + arg + ' <name>');
        if (r.branches[nn] !== undefined) return err("A branch named '" + nn + "' already exists.");
        if (!tipId) return err('Make a first commit before branching.');
        r.branches[nn] = tipId; r.lanes[nn] = r.nextLane++; r.head = { branch: nn };
        return ok([L('ok', "Switched to a new branch '" + nn + "'.")]);
      }
      if (!arg) return err('usage: git ' + cmd + ' <branch>');
      if (r.branches[arg] !== undefined) {
        r.head = { branch: arg };
        return ok([L('ok', "Switched to branch '" + arg + "'. New commits will move this pointer.")]);
      }
      var id = resolveRef(r, arg);
      if (!id) return err("'" + arg + "' didn't match a branch or commit.");
      r.head = { detached: id };
      return ok(["You are in 'detached HEAD' state at " + id + '. Look around, then check out a branch.']);
    }

    case 'merge': {
      var mn = t.filter(function (x, ix) { return ix > 1 && x[0] !== '-'; })[0];
      if (!mn) return err('usage: git merge <branch>');
      var mt = r.branches[mn] !== undefined ? r.branches[mn] : r.remotes[mn];
      if (mt === undefined) return err("'" + mn + "' is not a branch here.");
      if (!r.head.branch) return err('Check out a branch before merging.');
      if (mt === tipId || isAncestor(r, mt, tipId)) return ok(['Already up to date.']);
      var noff = t.indexOf('--no-ff') > -1;
      if (isAncestor(r, tipId, mt) && !noff) {
        r.branches[b] = mt;
        return ok([L('ok', 'Fast-forward'), "'" + b + "' simply moved up to " + mt + " — no new commit needed, the histories never diverged."]);
      }
      var mc = mkCommit(r, "Merge branch '" + mn + "'", [tipId, mt], r.lanes[b]);
      r.branches[b] = mc.id;
      return ok([L('ok', "Merge made by the 'ort' strategy."), 'Created merge commit ' + mc.id + ' with two parents: ' + tipId + ' and ' + mt + '.']);
    }

    case 'rebase': {
      var rn = t[2];
      if (!rn) return err('usage: git rebase <branch>');
      var rt = r.branches[rn] !== undefined ? r.branches[rn] : r.remotes[rn];
      if (rt === undefined) return err("'" + rn + "' is not a branch here.");
      if (!r.head.branch) return err('Check out a branch before rebasing.');
      if (isAncestor(r, tipId, rt)) { r.branches[b] = rt; return ok([L('ok', 'Fast-forwarded ' + b + ' to ' + rn + '.')]); }
      if (isAncestor(r, rt, tipId)) return ok(['Current branch ' + b + ' is up to date.']);
      var onto = ancestors(r, rt);
      var mine = r.commits.filter(function (c) { return ancestors(r, tipId)[c.id] && !onto[c.id]; })
        .sort(function (a2, b2) { return a2.t - b2.t; });
      var prev = rt;
      mine.forEach(function (c) {
        var copy = mkCommit(r, c.msg, [prev], r.lanes[b]);
        prev = copy.id;
      });
      r.branches[b] = prev;
      return ok([L('ok', 'Successfully rebased ' + b + ' onto ' + rn + '.'), mine.length + ' commit(s) were replayed as new commits — the old ones are now unreachable (faded).']);
    }

    case 'cherry-pick': {
      var ref = t[2];
      if (!ref) return err('usage: git cherry-pick <commit>');
      var cid = resolveRef(r, ref);
      var src = cid && get(r, cid);
      if (!src) return err("Couldn't find commit '" + ref + "'.");
      if (!r.head.branch) return err('Check out a branch first.');
      var cp = mkCommit(r, src.msg, tipId ? [tipId] : [], r.lanes[b]);
      r.branches[b] = cp.id;
      return ok([L('ok', '[' + b + ' ' + cp.id + '] ' + src.msg), 'Copied ' + src.id + ' onto ' + b + ' as a brand-new commit. The original stays where it was.']);
    }

    case 'reset': {
      if (!r.head.branch) return err('Check out a branch before resetting.');
      var mode = 'mixed';
      var args = t.slice(2).filter(function (x) {
        if (x === '--hard') { mode = 'hard'; return false; }
        if (x === '--soft') { mode = 'soft'; return false; }
        if (x === '--mixed') { return false; }
        return true;
      });
      var rref = args[0] || 'HEAD';
      var nt = resolveRef(r, rref);
      if (!nt) return err("Couldn't resolve '" + rref + "'.");
      r.branches[b] = nt;
      if (mode === 'hard') { r.working = []; r.staged = []; }
      var target2 = get(r, nt);
      return ok([L('ok', 'HEAD is now at ' + nt + ' ' + target2.msg), "'" + b + "' moved back. Commits ahead of it are unreachable (faded) — not deleted yet." + (mode === 'hard' ? ' (--hard also cleared your working tree.)' : '')]);
    }

    case 'revert': {
      if (!r.head.branch) return err('Check out a branch first.');
      var vref = t[2] || 'HEAD';
      var vid = resolveRef(r, vref);
      var vc = vid && get(r, vid);
      if (!vc) return err("Couldn't find commit '" + vref + "'.");
      var rc = mkCommit(r, 'Revert "' + vc.msg + '"', [tipId], r.lanes[b]);
      r.branches[b] = rc.id;
      return ok([L('ok', '[' + b + ' ' + rc.id + '] Revert "' + vc.msg + '"'), 'History moved forward — the bad commit is still there, its changes are just undone by a new one.']);
    }

    case 'stash': {
      var sub = t[2];
      if (!sub) {
        if (!r.working.length && !r.staged.length) return err('No local changes to save.');
        r.stash = { w: r.working, s: r.staged }; r.working = []; r.staged = [];
        return ok([L('ok', 'Saved working directory and index state.'), 'Your changes are shelved — the working tree is clean. Get them back with git stash pop.']);
      }
      if (sub === 'pop' || sub === 'apply') {
        if (!r.stash) return err('The stash is empty.');
        r.working = r.working.concat(r.stash.w); r.staged = r.staged.concat(r.stash.s);
        if (sub === 'pop') r.stash = null;
        return ok([L('ok', 'Restored stashed changes' + (sub === 'pop' ? ' and dropped the stash.' : '.'))]);
      }
      if (sub === 'list') return ok([r.stash ? 'stash@{0}: WIP on ' + b : '(no stash entries)']);
      return err("git stash: unknown option '" + sub + "'");
    }

    case 'tag': {
      if (!t[2]) {
        var names = Object.keys(r.tags);
        return ok(names.length ? names : ['(no tags yet)']);
      }
      if (r.tags[t[2]]) return err("tag '" + t[2] + "' already exists.");
      if (!tipId) return err('Nothing to tag yet.');
      r.tags[t[2]] = tipId;
      return ok([L('ok', "Tagged " + tipId + " as '" + t[2] + "'. Tags never move — perfect for releases.")]);
    }

    case 'log': {
      var reach = reachable(r);
      var list = r.commits.filter(function (c) { return reach[c.id]; }).sort(function (a2, b2) { return b2.t - a2.t; }).slice(0, 8);
      if (!list.length) return ok(['(no commits yet)']);
      return ok(list.map(function (c) {
        var refs = [];
        Object.keys(r.branches).forEach(function (nm) { if (r.branches[nm] === c.id) refs.push(nm); });
        Object.keys(r.remotes).forEach(function (nm) { if (r.remotes[nm] === c.id) refs.push(nm); });
        Object.keys(r.tags).forEach(function (nm) { if (r.tags[nm] === c.id) refs.push('tag: ' + nm); });
        return '* ' + c.id + (refs.length ? ' (' + refs.join(', ') + ')' : '') + ' ' + c.msg;
      }));
    }

    case 'remote': {
      if (t[2] === 'add') {
        if (!t[3] || !t[4]) return err('usage: git remote add <name> <url>');
        r.hasRemote = true;
        return ok([L('ok', "Added remote '" + t[3] + "'. Now 'git push -u " + t[3] + ' ' + b + "' publishes your work.")]);
      }
      if (!r.hasRemote) return ok(['(no remotes configured — add one with git remote add origin <url>)']);
      return ok(['origin  https://github.com/you/rocket.git (fetch)', 'origin  https://github.com/you/rocket.git (push)']);
    }

    case 'push': {
      if (!r.hasRemote && !Object.keys(r.remotes).length) return err("No remote configured. Add one first: git remote add origin <url>");
      if (!r.head.branch) return err('Check out a branch to push.');
      if (r.pending && r.pending.length) return err('Rejected — the remote has commits you don\'t have. Fetch or pull first.');
      var key = 'origin/' + b;
      if (r.remotes[key] === r.branches[b]) return ok(['Everything up-to-date.']);
      r.remotes[key] = r.branches[b];
      return ok([L('ok', 'To origin'), '   ' + b + ' → ' + b + '  (origin/' + b + ' now points at ' + r.branches[b] + ')']);
    }

    case 'fetch': {
      if (!r.hasRemote && !Object.keys(r.remotes).length) return err('No remote configured.');
      if (!r.pending || !r.pending.length) return ok(['Already up to date.']);
      var base = r.remotes['origin/main'];
      var lane = r.branches.main === base ? r.lanes.main : r.nextLane++;
      var prev2 = base, cnt = r.pending.length;
      r.pending.forEach(function (m) { var c = mkCommit(r, m, prev2 ? [prev2] : [], lane); prev2 = c.id; });
      r.remotes['origin/main'] = prev2; r.pending = null;
      return ok([L('ok', 'From origin'), '   main → origin/main  (' + cnt + ' new commits downloaded)', "Your local 'main' hasn't moved — merge when ready: git merge origin/main"]);
    }

    case 'pull': {
      if (!r.hasRemote && !Object.keys(r.remotes).length) return err('No remote configured.');
      var out = [];
      if (r.pending && r.pending.length) {
        var fr = exec(r, 'git fetch');
        out = out.concat(fr.lines.slice(0, 2));
      }
      var key2 = 'origin/' + b;
      if (r.remotes[key2] === undefined) return err("The remote has no branch '" + b + "'.");
      var mr = exec(r, 'git merge ' + key2);
      return { ok: mr.ok, lines: out.concat(mr.lines) };
    }

    default:
      return err("'git " + cmd + "' isn't supported in this sandbox. Type 'help' for the list.");
  }
}

/* ------------------------------ layout ------------------------------ */
function laneColor(l, accent) { return l === 0 ? accent : PALETTE[(l - 1) % PALETTE.length]; }

function layout(r, opts) {
  opts = opts || {};
  var accent = opts.accent || '#2F6BD8';
  var showHashes = opts.showHashes !== false;
  if (!r || !r.exists || !r.commits.length) {
    return { empty: true, nodes: [], edges: [], labels: [], legend: [], vb: '0 0 760 260' };
  }
  var reach = reachable(r);
  var tipId = headTip(r);
  // SVG fills are attribute values (not CSS), so theme them here
  var dark = !!opts.dark;
  var cardBg = dark ? '#232936' : '#F5F6F8';
  var inkCol = dark ? '#E8EBF2' : '#171B26';
  var X0 = 70, DX = 84, Y0 = 74, DY = 76;
  var maxLane = 0;
  r.commits.forEach(function (c) { if (c.lane > maxLane) maxLane = c.lane; });
  var pos = {};
  var nodes = r.commits.map(function (c, i) {
    var x = X0 + i * DX, y = Y0 + c.lane * DY;
    pos[c.id] = { x: x, y: y, lane: c.lane };
    var ghost = !reach[c.id];
    var isTip = c.id === tipId;
    var col = laneColor(c.lane, accent);
    return {
      id: c.id, x: x, y: y,
      r: isTip ? 11 : 9,
      fill: isTip ? col : cardBg,
      stroke: col,
      sw: isTip ? 0 : 2,
      op: ghost ? 0.25 : 1,
      dash: ghost ? '3 3' : 'none',
      haloOp: isTip ? 0.35 : 0,
      haloStroke: col,
      hash: showHashes ? c.id : '',
      msg: c.msg
    };
  });
  var edges = [];
  r.commits.forEach(function (c) {
    c.parents.forEach(function (p) {
      var a = pos[p], b2 = pos[c.id];
      if (!a) return;
      var col = laneColor(Math.max(a.lane, b2.lane) === a.lane ? a.lane : b2.lane, accent);
      var d = a.y === b2.y
        ? 'M' + a.x + ',' + a.y + ' L' + b2.x + ',' + b2.y
        : 'M' + a.x + ',' + a.y + ' C' + (a.x + 44) + ',' + a.y + ' ' + (b2.x - 44) + ',' + b2.y + ' ' + b2.x + ',' + b2.y;
      edges.push({ d: d, color: col, op: reach[c.id] ? 1 : 0.2 });
    });
  });
  // labels stacked per commit: branches, HEAD, remotes, tags
  var perCommit = {};
  function pushLabel(id, lab) { if (!id || !pos[id]) return; (perCommit[id] = perCommit[id] || []).push(lab); }
  Object.keys(r.branches).forEach(function (nm) {
    if (!r.branches[nm]) return;
    var col = laneColor(r.lanes[nm] || 0, accent);
    pushLabel(r.branches[nm], { text: nm, fill: col, stroke: 'none', tfill: '#fff', dash: 'none' });
    if (r.head && r.head.branch === nm)
      pushLabel(r.branches[nm], { text: 'HEAD', fill: 'none', stroke: inkCol, tfill: inkCol, dash: 'none' });
  });
  if (r.head && r.head.detached)
    pushLabel(r.head.detached, { text: 'HEAD', fill: 'none', stroke: inkCol, tfill: inkCol, dash: '4 3' });
  Object.keys(r.remotes).forEach(function (nm) {
    pushLabel(r.remotes[nm], { text: nm, fill: dark ? '#1C212C' : '#fff', stroke: '#9AA3B5', tfill: dark ? '#A9B1C2' : '#565F72', dash: '4 3' });
  });
  Object.keys(r.tags).forEach(function (nm) {
    pushLabel(r.tags[nm], { text: '⌂ ' + nm, fill: dark ? '#1C212C' : '#fff', stroke: '#0E9488', tfill: '#0E9488', dash: 'none' });
  });
  var labels = [];
  Object.keys(perCommit).forEach(function (id) {
    var p = pos[id];
    perCommit[id].forEach(function (lab, i) {
      var w = 18 + lab.text.length * 6.8;
      var above = p.lane === 0;
      labels.push({
        x: p.x, y: above ? p.y - 28 - i * 30 : p.y + 34 + i * 30,
        rx: -w / 2, w: w,
        text: lab.text, fill: lab.fill, stroke: lab.stroke, tfill: lab.tfill, dash: lab.dash
      });
    });
  });
  var legend = Object.keys(r.branches).map(function (nm) {
    return { text: nm, color: laneColor(r.lanes[nm] || 0, accent) };
  });
  if (Object.keys(r.remotes).length) legend.push({ text: 'origin/…', color: '#9AA3B5' });
  // Fit the viewBox to everything drawn (halos, hash text below nodes,
  // stacked ref pills above/below) so nothing clips at the canvas edges.
  var minX = 0, minY = 0, maxX = X0 + r.commits.length * DX + 66, maxY = Y0 + maxLane * DY + 40;
  nodes.forEach(function (n) {
    minX = Math.min(minX, n.x - 20); maxX = Math.max(maxX, n.x + 20);
    minY = Math.min(minY, n.y - 20); maxY = Math.max(maxY, n.y + (n.hash ? 33 : 20));
  });
  labels.forEach(function (l) {
    minX = Math.min(minX, l.x - l.w / 2 - 4); maxX = Math.max(maxX, l.x + l.w / 2 + 4);
    minY = Math.min(minY, l.y - 14); maxY = Math.max(maxY, l.y + 14);
  });
  var pad = 12;
  var vbX = minX - pad, vbY = minY - pad;
  var w = Math.max(760, maxX - vbX + pad);
  var h = Math.max(250, maxY - vbY + pad);
  return { empty: false, nodes: nodes, edges: edges, labels: labels, legend: legend, vb: vbX + ' ' + vbY + ' ' + w + ' ' + h };
}

export { seed, exec, layout, headTip };
