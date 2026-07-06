/* GVGraph — declarative before/after DAG layout for Git Visualizer.
   Pure data in, pure data out: no DOM, no React. Turns a designed graph state
   (from git-commands-content.json's beforeGraph/afterGraph) into positioned
   nodes / edges / ref-labels that the template renders as inline SVG.

   Input state shape (see JSON _notes):
     { caption, empty?, emptyMsg?, nodes:[{id,col,lane,kind?}],
       parents:{childId:[parentId...]}, refs:[{name,at,kind,lane?,new?}],
       areas?:{<column>:[files...]} }

   layout(state, {accent}) → { empty, emptyMsg, nodes, edges, labels, vb,
                               areas:[{key,title,items:[{name,tone}]}] } */
(function () {
  var PALETTE = ['#7C5CE6', '#0E9488', '#C65BA2', '#5560C9', '#B07A2F'];
  function laneColor(lane, accent) { return !lane ? accent : PALETTE[(lane - 1) % PALETTE.length]; }

  var AREA_TITLES = {
    working: 'Working tree', staged: 'Staging area', stash: 'Stash',
    tracked: 'Tracked', untracked: 'Untracked (on disk)'
  };
  var AREA_TONE = { working: 'amber', staged: 'green', stash: 'purple', tracked: 'blue', untracked: 'muted' };

  function layoutAreas(areas) {
    if (!areas) return [];
    var order = ['working', 'staged', 'stash', 'tracked', 'untracked'];
    var keys = Object.keys(areas).sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    return keys.map(function (k) {
      var items = (areas[k] || []).map(function (f) {
        var del = f.charAt(0) === '-';
        return { name: del ? f.replace(/^-\s*/, '') : f, tone: del ? 'red' : (AREA_TONE[k] || 'muted'), del: del };
      });
      return { key: k, title: AREA_TITLES[k] || k, items: items, empty: !items.length };
    });
  }

  function layout(state, opts) {
    opts = opts || {};
    var accent = opts.accent || '#2F6BD8';
    // SVG fills are attribute values (not CSS), so theme them here
    var dark = (typeof window !== 'undefined') && !!window.GV_DARK;
    var cardBg = dark ? '#1C212C' : '#FFFFFF';
    var inkCol = dark ? '#E8EBF2' : '#171B26';
    if (!state || state.empty || !state.nodes || !state.nodes.length) {
      return { empty: true, emptyMsg: (state && state.emptyMsg) || 'no commits yet',
        caption: state && state.caption, nodes: [], edges: [], labels: [], areas: layoutAreas(state && state.areas), vb: '0 0 620 220' };
    }
    var X0 = 66, DX = 92, Y0 = 92, DY = 96;
    var pos = {}, maxCol = 0, maxLane = 0;
    state.nodes.forEach(function (n) {
      if (n.col > maxCol) maxCol = n.col;
      if (n.lane > maxLane) maxLane = n.lane;
    });
    var parents = state.parents || {};

    var nodes = state.nodes.map(function (n) {
      var x = X0 + n.col * DX, y = Y0 + n.lane * DY;
      pos[n.id] = { x: x, y: y, lane: n.lane };
      var col = laneColor(n.lane, accent);
      var kind = n.kind || 'normal';
      var ghost = kind === 'ghost';
      var isNew = kind === 'new' || kind === 'merge';
      var focus = kind === 'focus';
      var unborn = kind === 'unborn';
      return {
        id: n.id, x: x, y: y,
        r: unborn ? 13 : (isNew || focus ? 15 : 13),
        fill: unborn ? 'transparent' : (isNew ? col : cardBg),
        stroke: col,
        sw: isNew ? 0 : (unborn ? 2 : 2.5),
        dash: (ghost || unborn) ? '4 4' : 'none',
        op: ghost ? 0.32 : 1,
        hash: unborn ? '' : n.id,
        hashFill: isNew ? '#FFFFFF' : (ghost ? '#B9C2D4' : '#8A94A9'),
        haloOp: (isNew || focus) ? 0.9 : 0,
        haloStroke: focus ? '#E8A33D' : col,
        haloDash: focus ? '3 4' : 'none',
        anim: isNew ? 'pop' : 'none',
        merge: kind === 'merge'
      };
    });

    var edges = [];
    state.nodes.forEach(function (n) {
      (parents[n.id] || []).forEach(function (pid) {
        var a = pos[pid], b = pos[n.id];
        if (!a) return;
        var col = laneColor(Math.max(a.lane, b.lane), accent);
        var d = a.y === b.y
          ? 'M' + a.x + ',' + a.y + ' L' + b.x + ',' + b.y
          : 'M' + a.x + ',' + a.y + ' C' + (a.x + DX * 0.5) + ',' + a.y + ' ' + (b.x - DX * 0.5) + ',' + b.y + ' ' + b.x + ',' + b.y;
        var srcGhost = (state.nodes.find(function (m) { return m.id === n.id; }) || {}).kind === 'ghost';
        edges.push({ d: d, color: col, op: srcGhost ? 0.25 : 1 });
      });
    });

    // Ref labels, stacked per commit. Branch/head above lane-0 nodes, below otherwise.
    var perNode = {};
    var floating = [];
    (state.refs || []).forEach(function (ref) {
      if (ref.kind === 'remote-url' || !ref.at || !pos[ref.at]) { if (ref.kind === 'remote-url') floating.push(ref); return; }
      (perNode[ref.at] = perNode[ref.at] || []).push(ref);
    });

    var labels = [];
    Object.keys(perNode).forEach(function (id) {
      var p = pos[id];
      var above = p.lane === 0;
      perNode[id].forEach(function (ref, i) {
        var lane = ref.lane != null ? ref.lane : p.lane;
        var col = laneColor(lane, accent);
        var isHead = ref.kind === 'head';
        var isRemote = ref.kind === 'remote';
        var isTag = ref.kind === 'tag';
        var text = isTag ? ('⌂ ' + ref.name) : ref.name;
        var w = 20 + text.length * 6.9;
        var yOff = above ? -(34 + i * 30) : (40 + i * 30);
        labels.push({
          x: p.x, y: p.y + yOff, w: w, rx: -w / 2,
          text: text,
          fill: isHead || isTag ? cardBg : (isRemote ? (dark ? '#232936' : '#F3F6FB') : col),
          stroke: isHead ? inkCol : (isRemote ? '#9AA3B5' : (isTag ? '#0E9488' : col)),
          tfill: isHead ? inkCol : (isRemote ? (dark ? '#A9B1C2' : '#565F72') : (isTag ? '#0E9488' : '#FFFFFF')),
          dash: (isHead && ref.new) || isRemote ? '4 3' : 'none',
          glow: ref.new ? col : 'none'
        });
      });
    });

    // Fit the viewBox to everything drawn (halos, stacked ref pills) so tall
    // label stacks or wide pill names never clip at the canvas edges.
    var minX = 0, minY = 0, maxX = X0 + maxCol * DX + 110, maxY = Y0 + maxLane * DY + 40;
    nodes.forEach(function (n) {
      minX = Math.min(minX, n.x - 24); maxX = Math.max(maxX, n.x + 24);
      minY = Math.min(minY, n.y - 24); maxY = Math.max(maxY, n.y + 24);
    });
    labels.forEach(function (l) {
      minX = Math.min(minX, l.x - l.w / 2 - 4); maxX = Math.max(maxX, l.x + l.w / 2 + 4);
      minY = Math.min(minY, l.y - 14); maxY = Math.max(maxY, l.y + 14);
    });
    var pad = 14;
    var vbX = minX - pad, vbY = minY - pad;
    var w = Math.max(560, maxX - vbX + pad);
    var h = Math.max(210, maxY - vbY + pad);
    return {
      empty: false, caption: state.caption,
      nodes: nodes, edges: edges, labels: labels,
      floating: floating.map(function (f) { return { name: f.name }; }),
      areas: layoutAreas(state.areas),
      vb: vbX + ' ' + vbY + ' ' + w + ' ' + h
    };
  }

  if (typeof window !== 'undefined') window.GVGraph = { layout: layout, laneColor: laneColor };
})();
