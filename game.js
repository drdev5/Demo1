/* ==========================================================
   ЧИСТЮЛЯ — game.js
   Мини-игра «Уборка квартиры» — вид сверху, Canvas 2D.

   5 средств чистки:
     • пылесос  — пыль, ворсинки, пыль в щелях
     • губка    — жирные пятна
     • щётка    — старые пятна и подпалины
     • тряпка   — разводы воды и засохший клей
     • веник    — крупный мусор: крошки, осколки

   В каждой игре — своя конфигурация грязи (по 3 вида).
   Неверное средство → понятная подсказка: «Для такой грязи нужна губка».
   ========================================================== */
(function (global) {
  'use strict';

  /* ---------- средства чистки ---------- */
  var TOOLS = {
    vac:   { id:'vac',   name:'Пылесос', color:'#0ea5e9', dark:'#0369a1', radius:50, desc:'пыль и ворсинки' },
    sponge:{ id:'sponge',name:'Губка',   color:'#facc15', dark:'#a16207', radius:46, desc:'жирные пятна' },
    brush: { id:'brush', name:'Щётка',   color:'#b45309', dark:'#78350f', radius:36, desc:'старые пятна' },
    rag:   { id:'rag',   name:'Тряпка',  color:'#16a34a', dark:'#14532d', radius:44, desc:'разводы и клей' },
    broom: { id:'broom', name:'Веник',   color:'#a16207', dark:'#713f12', radius:42, desc:'крошки и мусор' }
  };
  var TOOL_ORDER = ['vac','sponge','brush','rag','broom'];

  /* ---------- виды грязи ---------- */
  var TYPES = {
    dust:  { name:'Пыль',          tool:'vac',   look:'dust'  },
    hair:  { name:'Шерсть',        tool:'vac',   look:'hair'  },
    crumb: { name:'Крошки',        tool:'broom', look:'crumb' },
    grease:{ name:'Жирное пятно',  tool:'sponge',look:'grease'},
    stain: { name:'Старое пятно',  tool:'brush', look:'stain' },
    water: { name:'Разводы воды',  tool:'rag',   look:'water' },
    burnt: { name:'Подпалина',     tool:'brush', look:'burnt' },
    glue:  { name:'Засохший клей', tool:'rag',   look:'glue'  },
    dustin:{ name:'Пыль в щелях',  tool:'vac',   look:'dustin'}
  };

  /* чем чистим: сколько «проходов» нужно (1 — мгновенно, >1 — водить инструментом) */
  function passesFor(type, toolId){
    var t = TYPES[type];
    if (!t) return -1;
    if (t.tool === toolId) return toolId === 'sponge' ? 1 : (toolId === 'rag' ? 2 : 1);
    return -1;
  }
  function toolGender(id){ return (id === 'vac' || id === 'broom') ? 'нужен' : 'нужна'; }
  function wrongToolMsg(type){
    var need = TYPES[type].tool;
    return 'Для такой грязи ' + toolGender(need) + ' ' + TOOLS[need].name.toLowerCase();
  }

  var MODES = {
    vac: {
      title:'Пропылесось ковёр',
      hint:'Пылесосом — пыль и шерсть, веником — крошки',
      seconds:60, scene:'carpet',
      mix:[ ['dust',6], ['hair',4], ['crumb',4] ]
    },
    wipe:{
      title:'Отмой диван',
      hint:'Губкой — жир, щёткой — старые пятна, тряпкой — разводы',
      seconds:60, scene:'sofa',
      mix:[ ['grease',5], ['stain',4], ['water',3] ]
    },
    floor:{
      title:'Отдери подпалины',
      hint:'Щёткой — подпалины, тряпкой — клей, пылесосом — пыль',
      seconds:60, scene:'floor',
      mix:[ ['burnt',5], ['glue',4], ['dustin',3] ]
    }
  };

  /* ==========================================================
     Stage
     ========================================================== */
  function Stage(opts){
    opts = opts || {};
    this.mode = opts.mode;
    this.cfg = MODES[this.mode];
    if (!this.cfg) throw new Error('Неизвестный режим игры: ' + this.mode);
    this.host = opts.host;
    this.onTick = opts.onTick || function(){};
    this.onProgress = opts.onProgress || function(){};
    this.onWin = opts.onWin || function(){};
    this.onLose = opts.onLose || function(){};
    this.running = false;
    this.timeLeft = this.cfg.seconds;
    this.tool = TOOLS.vac;
    this.targets = [];
    this.sparks = [];
    this.dust = [];
    this.drips = [];
    this.puffs = [];
    this.floats = [];
    this.pressed = false;
    this.hover = null;
    this._t = null;
    this._hintT = null;
    this._raf = null;
    this.dead = false;
  }

  Stage.prototype.start = function () {
    var self = this;
    this.stop();
    this.dead = false;

    var total = this.cfg.mix.reduce(function(s,m){ return s + m[1]; }, 0);

    this.host.innerHTML =
      '<div class="g-stage g2-stage">' +
        '<canvas class="g2-canvas"></canvas>' +
        '<div class="g2-hud"><b>' + this.cfg.title + '</b><span>Осталось: <i id="g2Left">' + total + '</i></span></div>' +
      '</div>' +
      '<div class="g-hud">' +
        '<span class="g-timer">' + this.cfg.seconds + ' с</span>' +
        '<div class="g-meter"><i></i></div>' +
        '<span class="g-count">0 / ' + total + '</span>' +
      '</div>' +
      '<div class="g-legend" id="gLegend"></div>' +
      '<div class="g-tools"></div>' +
      '<div class="g-msg"></div>';

    this.toolsEl = this.host.querySelector('.g-tools');
    this.timerEl = this.host.querySelector('.g-timer');
    this.barEl = this.host.querySelector('.g-meter i');
    this.countEl = this.host.querySelector('.g-count');
    this.msgEl = this.host.querySelector('.g-msg');
    this.leftEl = this.host.querySelector('#g2Left');
    this.legendEl = this.host.querySelector('#gLegend');
    this.canvas = this.host.querySelector('.g2-canvas');
    this.ctx = this.canvas.getContext('2d');

    /* кнопки средств */
    TOOL_ORDER.forEach(function (id) {
      var t = TOOLS[id];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'g-tool-btn';
      b.dataset.tool = id;
      b.innerHTML =
        '<span class="g-tool-ico" style="background:' + t.color + '">' + iconFor(id) + '</span>' +
        '<span class="g-tool-txt"><b>' + t.name + '</b><small>' + t.desc + '</small></span>';
      b.addEventListener('click', function () { self.setTool(id); });
      self.toolsEl.appendChild(b);
    });
    this.setTool('vac');

    this._layout();
    try { this._spawn(); }
    catch (e) { this._fatal('GAME SPAWN ERROR: ' + ((e && e.message) || e), e); return; }

    this.running = true;
    this._bind();
    this._loop();
    this._startClock();
    global.GAME.lastStage = this;
  };

  Stage.prototype.setTool = function (id) {
    if (!TOOLS[id]) return;
    this.tool = TOOLS[id];
    var self = this;
    Array.prototype.slice.call(this.toolsEl.querySelectorAll('.g-tool-btn'))
      .forEach(function (b) { b.classList.toggle('on', b.dataset.tool === id); });
    this._legend();
    this._hint('Теперь: ' + this.tool.name.toLowerCase() + ' — ' + this.tool.desc);
  };

  /* подсказка «что чем чистить» — всегда на виду */
  Stage.prototype._legend = function () {
    if (!this.legendEl) return;
    var items = this.cfg.mix.map(function (m){
      var t = TYPES[m[0]], tool = TOOLS[t.tool];
      var note = (t.tool === 'rag') ? ' <em>(протирать)</em>' : '';
      return '<span class="g-leg-item"><i style="background:' + tool.color + '"></i>' +
             t.name + ' — ' + tool.name.toLowerCase() + note + '</span>';
    }).join('');
    this.legendEl.innerHTML = '<b>Чем чистить:</b>' + items;
  };

  Stage.prototype._fatal = function (msg, e) {
    console.error(msg, e);
    var bar = document.getElementById('errBar');
    if (bar) {
      bar.style.display = 'block';
      var txt = document.getElementById('errText');
      if (txt) { txt.textContent = msg; } else { bar.textContent = msg; }
    }
  };

  /* ---------- геометрия ---------- */
  Stage.prototype._layout = function () {
    var w = this.host.clientWidth || 720;
    var h = Math.round(w * 0.8);
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    this.W = w; this.H = h; this.dpr = dpr;
    this.canvas.width  = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
  };

  /* ---------- генерация грязи ---------- */
  Stage.prototype._spawn = function () {
    var cfg = this.cfg;
    this.targets = [];
    var taken = [];
    var self = this;

    function free(x, y, r){
      for (var i = 0; i < taken.length; i++){
        if (Math.hypot(x - taken[i].x, y - taken[i].y) < r + taken[i].r) return false;
      }
      return true;
    }

    /* зоны грязи по сцене */
    var zones = ZONES[cfg.scene];

    cfg.mix.forEach(function (m){
      var type = m[0], n = m[1];
      var placed = 0, tries = 0;
      while (placed < n && tries < 700) {
        tries++;
        var zone = zones[Math.floor(Math.random() * zones.length)];
        var x = rand(zone.x1, zone.x2) * this.W;
        var y = rand(zone.y1, zone.y2) * this.H;
        var r = rand(zone.r1, zone.r2);
        if (!free(x, y, r)) continue;
        taken.push({ x:x, y:y, r:r });
        this.targets.push({
          x:x, y:y, r:r, type:type, alive:true,
          prog:0, soul:Math.random()*Math.PI*2, seed:Math.random()*1000
        });
        placed++;
      }
    }, this);
    this.left = this.targets.length;
    this._renderHUD();
  };

  /* зоны грязи (доли от размера сцены) */
  var ZONES = {
    sofa:  [ {x1:0.13,x2:0.87,y1:0.30,y2:0.50,r1:16,r2:26} ],
    carpet:[ {x1:0.12,x2:0.88,y1:0.62,y2:0.90,r1:13,r2:23} ],
    floor: [ {x1:0.12,x2:0.88,y1:0.62,y2:0.90,r1:13,r2:23} ]
  };

  Stage.prototype._renderHUD = function () {
    var total = this.targets.length || 1;
    var done = total - this.left;
    if (this.countEl) this.countEl.textContent = done + ' / ' + total;
    if (this.leftEl) this.leftEl.textContent = this.left;
    if (this.barEl) this.barEl.style.width = (done / total * 100) + '%';
    this.onProgress(done, total);
  };

  /* ---------- ввод ---------- */
  Stage.prototype._bind = function () {
    var self = this, canvas = this.canvas;
    this._bound = [];
    function on(ev, fn){ canvas.addEventListener(ev, fn, { passive:false }); self._bound.push({ ev:ev, fn:fn }); }

    on('pointerdown', function (e){
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      self.pressed = true;
      self._work(self._pos(e), true);
    });
    on('pointermove', function (e){
      var p = self._pos(e);
      self.hover = p;
      /* тряпка протирает и просто от движения мыши — не нужно держать кнопку */
      self._work(p, self.pressed);
    });
    on('pointerup', function () { self.pressed = false; });
    on('pointercancel', function () { self.pressed = false; });
    on('pointerleave', function () { self.pressed = false; self.hover = null; });
  };

  Stage.prototype._pos = function (e) {
    var r = this.canvas.getBoundingClientRect();
    return { x:(e.clientX - r.left) * (this.W / r.width), y:(e.clientY - r.top) * (this.H / r.height) };
  };

  Stage.prototype._hint = function (msg) {
    if (!this.msgEl) return;
    this.msgEl.textContent = msg;
    this.msgEl.classList.add('show');
    var self = this;
    clearTimeout(this._hintT);
    this._hintT = setTimeout(function () { self.msgEl.classList.remove('show'); }, 1700);
  };

  /* ---------- работа инструментом ----------
     dragging = true  — игрок нажал мышь (клик по грязи).
     dragging = false — просто навёл мышь (важно для тряпки: достаточно водить). */
  Stage.prototype._work = function (p, dragging) {
    if (!this.running) return;
    var tool = this.tool;
    var hit = null, best = Infinity;
    for (var i = 0; i < this.targets.length; i++){
      var t = this.targets[i];
      if (!t.alive) continue;
      var d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d <= tool.radius + t.r && d < best){ best = d; hit = t; }
    }
    if (!hit) return;

    var need = passesFor(hit.type, tool.id);
    if (need < 0){
      /* подсказку даём только по клику, чтобы не спамить при наведении */
      if (!dragging) return;
      this._hint(wrongToolMsg(hit.type));
      this._float(hit.x, hit.y, 'не то', '#dc2626');
      hit.bad = 0.6;
      return;
    }

    /* мгновенные средства — только по клику */
    if (need === 1){
      if (!dragging) return;
      this._effect(hit, p);
      this._clear(hit);
      return;
    }

    /* тряпка — протирание: ведём по пятну, кнопку держать не обязательно.
       Движение считаем от предыдущей позиции курсора, чтобы прогресс
       не терялся, когда курсор слегка соскальзывает на соседнее пятно. */
    var moved = 0;
    if (this.lastP) moved = Math.hypot(p.x - this.lastP.x, p.y - this.lastP.y);
    this.lastP = { x:p.x, y:p.y };
    if (moved < 1.2) return;

    hit.prog += Math.min(0.4, moved / 70);
    this._effect(hit, p);
    if (hit.prog >= 1) this._clear(hit);
  };

  Stage.prototype._clear = function (t) {
    t.alive = false;
    this.left--;
    this._burst(t.x, t.y, t.type);
    this._float(t.x, t.y, 'чисто', '#16a34a');
    this._renderHUD();
    if (this.left <= 0) this._win();
  };

  /* частицы от инструмента */
  Stage.prototype._effect = function (t, p) {
    var tool = this.tool;
    if (tool.id === 'vac'){
      for (var i = 0; i < 2; i++){
        var a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 40;
        this.dust.push({ x:t.x + Math.cos(a)*d*0.6, y:t.y + Math.sin(a)*d*0.6,
                        tx:p.x, ty:p.y, life:22, max:22, r:1.4 + Math.random()*2 });
      }
    } else if (tool.id === 'broom'){
      if (Math.random() < 0.5) this.puffs.push({ x:t.x + (Math.random()-.5)*t.r, y:t.y + (Math.random()-.5)*t.r, life:20, max:20, r:3 + Math.random()*4, col:'#d6d3d1' });
    } else if (tool.id === 'sponge'){
      if (Math.random() < 0.35) this.drips.push({ x:t.x + (Math.random()-.5)*t.r, y:t.y + (Math.random()-.5)*t.r, life:26, max:26, r:1 + Math.random()*1.6 });
    } else if (tool.id === 'rag'){
      if (Math.random() < 0.4) this.drips.push({ x:t.x + (Math.random()-.5)*t.r, y:t.y + (Math.random()-.5)*t.r, life:24, max:24, r:1.4 + Math.random()*1.8, col:'#86efac' });
    } else {
      if (Math.random() < 0.45) this.puffs.push({ x:t.x + (Math.random()-.5)*t.r, y:t.y + (Math.random()-.5)*t.r, life:22, max:22, r:3 + Math.random()*4, col:'#e7c48a' });
    }
  };

  Stage.prototype._burst = function (x, y, type) {
    var col = BURST_COLORS[type] || '#bae6fd';
    var count = 12;
    for (var i = 0; i < count; i++){
      var a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      var v = 2.6 + Math.random() * 2.4;
      this.sparks.push({ x:x, y:y, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 1.2, life:32 + Math.random()*16, max:46, col:col });
    }
  };
  var BURST_COLORS = { dust:'#cbd5e1', hair:'#cbd5e1', crumb:'#d6d3d1', grease:'#fde68a', stain:'#fbbf24',
                       water:'#86efac', burnt:'#f59e0b', glue:'#a3e635', dustin:'#cbd5e1' };

  Stage.prototype._float = function (x, y, text, col) {
    this.floats.push({ x:x, y:y, text:text, col:col, life:52, max:52 });
  };

  /* ---------- таймер ---------- */
  Stage.prototype._startClock = function () {
    var self = this;
    this._startedAt = Date.now();
    this.timeLeft = this.cfg.seconds;
    clearTimeout(this._t);
    function tick(){
      if (!self.running) return;
      var passed = Math.floor((Date.now() - self._startedAt) / 1000);
      var left = self.cfg.seconds - passed;
      if (left !== self.timeLeft){
        self.timeLeft = left;
        self.timerEl.textContent = Math.max(0, left) + ' с';
        self.onTick(Math.max(0, left), self.cfg.seconds);
      }
      if (left <= 0){ self._lose(); return; }
      self._t = setTimeout(tick, 250);
    }
    this._t = setTimeout(tick, 250);
  };

  /* ---------- цикл ---------- */
  Stage.prototype._loop = function () {
    var self = this;
    function frame(){
      if (self.dead) return;
      self._raf = requestAnimationFrame(frame);
      try { self._draw(); }
      catch (e){ self._fatal('GAME DRAW ERROR: ' + ((e && e.message) || e), e); self.dead = true; }
    }
    frame();
  };

  Stage.prototype._draw = function () {
    var ctx = this.ctx, W = this.W, H = this.H;
    ctx.clearRect(0, 0, W, H);
    drawRoom(ctx, W, H, this.cfg.scene);

    for (var i = 0; i < this.targets.length; i++){
      var t = this.targets[i];
      if (!t.alive) continue;
      drawDirt(ctx, t);
    }

    this._drawParticles(ctx);
    if (this.hover) this._drawTool(ctx, this.hover.x, this.hover.y);
  };

  Stage.prototype._drawParticles = function (ctx) {
    var i;
    for (i = this.dust.length - 1; i >= 0; i--){
      var d = this.dust[i];
      d.x += (d.tx - d.x) * 0.28; d.y += (d.ty - d.y) * 0.28;
      d.life--;
      if (d.life <= 0){ this.dust.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, d.life / d.max);
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (i = this.drips.length - 1; i >= 0; i--){
      var dr = this.drips[i];
      dr.y += 0.9; dr.life--;
      if (dr.life <= 0){ this.drips.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, dr.life / dr.max) * 0.75;
      ctx.fillStyle = dr.col || '#7dd3fc';
      ctx.beginPath(); ctx.ellipse(dr.x, dr.y, dr.r, dr.r * 1.5, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (i = this.puffs.length - 1; i >= 0; i--){
      var pf = this.puffs[i];
      pf.x += (Math.random() - 0.5) * 1.4; pf.y -= 0.5; pf.r += 0.16; pf.life--;
      if (pf.life <= 0){ this.puffs.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, pf.life / pf.max) * 0.5;
      ctx.fillStyle = pf.col || '#d6d3d1';
      ctx.beginPath(); ctx.arc(pf.x, pf.y, pf.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (i = this.sparks.length - 1; i >= 0; i--){
      var sp = this.sparks[i];
      sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.14; sp.life--;
      if (sp.life <= 0){ this.sparks.splice(i, 1); continue; }
      var a = Math.max(0, sp.life / sp.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = sp.col;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 3.4 * a + 0.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (i = this.floats.length - 1; i >= 0; i--){
      var fl = this.floats[i];
      fl.y -= 0.7; fl.life--;
      if (fl.life <= 0){ this.floats.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, fl.life / fl.max);
      ctx.fillStyle = fl.col;
      ctx.font = '800 14px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(fl.text, fl.x, fl.y);
    }
    ctx.globalAlpha = 1;
  };

  /* ==========================================================
     Курсор-инструмент
     ========================================================== */
  Stage.prototype._drawTool = function (ctx, x, y) {
    var t = this.tool;
    var press = this.pressed ? 0.94 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(press, press);

    if (t.id === 'vac'){
      /* только шланг и насадка — корпуса нет */
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(8,47,73,.45)'; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(-6, 6); ctx.bezierCurveTo(-28, 22, -52, 32, -82, 26); ctx.stroke();
      ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(-6, 6); ctx.bezierCurveTo(-28, 22, -52, 32, -82, 26); ctx.stroke();
      ctx.strokeStyle = 'rgba(186,230,253,.85)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-10, 3); ctx.bezierCurveTo(-30, 19, -52, 28, -80, 23); ctx.stroke();
      ctx.fillStyle = '#0369a1'; ctx.strokeStyle = '#082f49'; ctx.lineWidth = 2;
      roundRect(ctx, -16, -6, 16, 18, 6); ctx.fill(); ctx.stroke();
      var g = ctx.createLinearGradient(0, -18, 0, 18);
      g.addColorStop(0, '#a5f3fc'); g.addColorStop(.45, '#38bdf8'); g.addColorStop(1, '#0369a1');
      ctx.fillStyle = g; ctx.strokeStyle = '#082f49'; ctx.lineWidth = 2.6;
      roundRect(ctx, -34, -17, 54, 32, 9); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0c4a6e';
      roundRect(ctx, -28, -7, 42, 14, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(186,230,253,.75)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(10, 0); ctx.stroke();
      ctx.strokeStyle = '#075985'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (var b = -30; b <= 16; b += 6){ ctx.beginPath(); ctx.moveTo(b, 14); ctx.lineTo(b, 20); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(125,211,252,.6)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-6, 20); ctx.lineTo(-24, 42); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, 20); ctx.lineTo(0, 44); ctx.stroke();
    }
    else if (t.id === 'sponge'){
      ctx.fillStyle = 'rgba(15,23,42,.16)';
      roundRect(ctx, -32, -18, 68, 52, 14); ctx.fill();
      var gs = ctx.createLinearGradient(0, -28, 0, 28);
      gs.addColorStop(0, '#fef9a0'); gs.addColorStop(.5, '#fde047'); gs.addColorStop(1, '#eab308');
      ctx.fillStyle = gs; ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2.6;
      roundRect(ctx, -34, -28, 68, 52, 15); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(161,98,7,.5)';
      [[-20,-12],[0,-15],[20,-12],[-25,4],[-2,2],[22,4],[-14,19],[12,19]].forEach(function(p){
        ctx.beginPath(); ctx.arc(p[0], p[1], 4.6, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      roundRect(ctx, -26, -23, 30, 9, 5); ctx.fill();
      ctx.fillStyle = 'rgba(125,211,252,.35)';
      roundRect(ctx, -34, 14, 68, 10, 5); ctx.fill();
    }
    else if (t.id === 'brush'){
      ctx.fillStyle = 'rgba(15,23,42,.16)';
      roundRect(ctx, -26, -20, 60, 44, 10); ctx.fill();
      ctx.fillStyle = '#92400e'; ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2;
      roundRect(ctx, -24, -8, 48, 16, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2.8; ctx.lineCap = 'round';
      for (var i = -19; i <= 19; i += 7.6){ ctx.beginPath(); ctx.moveTo(i, 6); ctx.lineTo(i * 0.92, 24); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(120,53,15,.55)'; ctx.lineWidth = 1.2;
      for (var j = -19; j <= 19; j += 7.6){ ctx.beginPath(); ctx.moveTo(j * 0.95, 6); ctx.lineTo(j * 0.88, 22); ctx.stroke(); }
      var gb = ctx.createLinearGradient(0, -32, 0, -10);
      gb.addColorStop(0, '#fcd34d'); gb.addColorStop(1, '#d97706');
      ctx.fillStyle = gb; ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2.4;
      roundRect(ctx, -28, -32, 56, 24, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      roundRect(ctx, -22, -28, 26, 7, 4); ctx.fill();
      ctx.strokeStyle = '#92400e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -20, 5, 0, Math.PI * 2); ctx.stroke();
    }
    else if (t.id === 'rag'){
      /* тряпка: свёрнутый квадрат ткани */
      ctx.fillStyle = 'rgba(15,23,42,.16)';
      roundRect(ctx, -30, -26, 60, 52, 8); ctx.fill();
      var gr = ctx.createLinearGradient(-30, -26, 30, 26);
      gr.addColorStop(0, '#86efac'); gr.addColorStop(1, '#16a34a');
      ctx.fillStyle = gr; ctx.strokeStyle = '#14532d'; ctx.lineWidth = 2.4;
      roundRect(ctx, -32, -28, 64, 54, 10); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(20,83,45,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-26, -18); ctx.quadraticCurveTo(0, -4, 26, -16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-26, 2); ctx.quadraticCurveTo(0, 16, 26, 4); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      roundRect(ctx, -24, -22, 26, 9, 4); ctx.fill();
    }
    else {
      /* веник: ручка + метла */
      ctx.strokeStyle = 'rgba(15,23,42,.16)'; ctx.lineWidth = 11; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-30, -30); ctx.stroke();
      ctx.strokeStyle = '#a16207'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-30, -30); ctx.stroke();
      ctx.strokeStyle = 'rgba(253,230,138,.6)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(-29, -32); ctx.stroke();
      /* метла */
      var gbr = ctx.createLinearGradient(0, 0, 0, 30);
      gbr.addColorStop(0, '#d6a84f'); gbr.addColorStop(1, '#a16207');
      ctx.fillStyle = gbr; ctx.strokeStyle = '#713f12'; ctx.lineWidth = 2.2;
      roundRect(ctx, -16, -2, 34, 16, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      for (var k = -12; k <= 14; k += 5.2){ ctx.beginPath(); ctx.moveTo(k, 12); ctx.lineTo(k * 0.9, 30); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(113,63,18,.6)'; ctx.lineWidth = 1.2;
      for (var m2 = -12; m2 <= 14; m2 += 5.2){ ctx.beginPath(); ctx.moveTo(m2 * 0.95, 12); ctx.lineTo(m2 * 0.86, 28); ctx.stroke(); }
    }
    ctx.restore();
  };

  /* ==========================================================
     Отрисовка грязи по видам
     ========================================================== */
  function drawDirt(ctx, t) {
    var look = TYPES[t.type].look;
    var p = Math.min(1, t.prog);
    var r = t.r * (1 - p * 0.16);
    var wob = Math.sin(Date.now() / 900 + t.soul) * 0.05 + 1;
    ctx.save();
    ctx.translate(t.x, t.y);

    if (look === 'dust'){
      ctx.fillStyle = 'rgba(141,155,171,.92)';
      ctx.beginPath(); ctx.arc(0, 0, r * wob, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(84,98,116,.85)';
      ctx.beginPath(); ctx.arc(-r * .3, -r * .25, r * .55 * wob, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * .35, r * .18, r * .38 * wob, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.arc(-r * .2, -r * .3, r * .22, 0, Math.PI * 2); ctx.fill();
    }
    else if (look === 'hair'){
      /* спутанные ворсинки */
      ctx.strokeStyle = 'rgba(100,116,139,.9)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (var h = 0; h < 5; h++){
        var a = (t.seed + h * 1.3) % (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(a) * r * .9, Math.sin(a) * r * .9,
                           Math.cos(a + .9) * r * 1.35, Math.sin(a + .9) * r * 1.35);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(148,163,184,.85)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, r * .35, 0, Math.PI * 2); ctx.stroke();
    }
    else if (look === 'crumb'){
      /* мелкий мусор: осколки и крошки */
      for (var c2 = 0; c2 < 7; c2++){
        var ang = (t.seed + c2 * 0.9) % (Math.PI * 2), rr = r * (0.35 + (c2 % 3) * 0.22);
        ctx.fillStyle = c2 % 2 ? 'rgba(87,83,78,.9)' : 'rgba(120,113,108,.85)';
        ctx.beginPath();
        ctx.ellipse(Math.cos(ang) * rr, Math.sin(ang) * rr * .6, 2.6 + (c2 % 2), 1.8, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(87,83,78,.75)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-r * .5, r * .2); ctx.lineTo(r * .45, -r * .3); ctx.stroke();
    }
    else if (look === 'grease'){
      /* масляное жирное пятно — тёмное с радужным ободком */
      ctx.fillStyle = 'rgba(120,53,15,.8)';
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.12 * wob, r * .8 * wob, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(87,40,10,.6)';
      ctx.beginPath(); ctx.ellipse(-r * .25, -r * .12, r * .55 * wob, r * .38 * wob, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(202,138,4,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.12 * wob, r * .8 * wob, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.beginPath(); ctx.ellipse(r * .25, r * .18, r * .3 * wob, r * .16 * wob, 0, 0, Math.PI * 2); ctx.fill();
    }
    else if (look === 'stain'){
      /* старое въевшееся пятно с кольцом */
      ctx.fillStyle = 'rgba(87,40,10,.72)';
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.05 * wob, r * .82 * wob, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(120,53,15,.85)'; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.ellipse(0, 0, r * .72 * wob, r * .52 * wob, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(146,64,14,.55)';
      ctx.beginPath(); ctx.ellipse(r * .1, r * .1, r * .38 * wob, r * .26 * wob, 0, 0, Math.PI * 2); ctx.fill();
    }
    else if (look === 'water'){
      /* потёки воды */
      ctx.fillStyle = 'rgba(56,189,248,.5)';
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1 * wob, r * .55 * wob, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(186,230,253,.75)';
      ctx.beginPath(); ctx.ellipse(-r * .2, -r * .1, r * .45 * wob, r * .22 * wob, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(14,165,233,.6)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(r * .5, r * .1); ctx.quadraticCurveTo(r * .8, r * .5, r * .55, r * .95); ctx.stroke();
    }
    else if (look === 'burnt'){
      /* подпалина с тлеющими трещинами */
      ctx.fillStyle = 'rgba(45,25,12,.92)';
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15 * wob, r * .82 * wob, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(20,12,6,.9)';
      ctx.beginPath(); ctx.ellipse(r * .12, r * .08, r * .6 * wob, r * .42 * wob, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(180,83,9,' + (0.5 + p * 0.2) + ')'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-r * .7, r * .1); ctx.quadraticCurveTo(0, -r * .35, r * .75, r * .05); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * .1, -r * .5); ctx.quadraticCurveTo(r * .2, 0, -r * .15, r * .55); ctx.stroke();
    }
    else if (look === 'glue'){
      /* засохший клей — серые наросты */
      ctx.fillStyle = 'rgba(148,163,184,.85)';
      ctx.beginPath(); ctx.ellipse(0, 0, r * .95 * wob, r * .7 * wob, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(100,116,139,.9)';
      [[-r*.3,-r*.15],[r*.25,-r*.1],[0,r*.3],[r*.5,r*.25]].forEach(function(q){
        ctx.beginPath(); ctx.arc(q[0], q[1], r * .22, 0, Math.PI * 2); ctx.fill();
      });
      ctx.strokeStyle = 'rgba(226,232,240,.5)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-r * .5, r * .1); ctx.lineTo(r * .45, -r * .2); ctx.stroke();
    }
    else {
      /* пыль в щелях — россыпь мелких точек */
      ctx.fillStyle = 'rgba(148,163,184,.8)';
      for (var dp = 0; dp < 9; dp++){
        var aa = (t.seed + dp * 0.7) % (Math.PI * 2), dd = r * (0.25 + (dp % 4) * 0.2);
        ctx.beginPath(); ctx.arc(Math.cos(aa) * dd, Math.sin(aa) * dd * .7, 1.5 + (dp % 2) * .8, 0, Math.PI * 2); ctx.fill();
      }
    }

    /* неверный инструмент — красная вспышка */
    if (t.bad > 0){
      t.bad -= 0.03;
      ctx.strokeStyle = 'rgba(220,38,38,' + Math.max(0, t.bad) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2); ctx.stroke();
    }

    /* прогресс протирки */
    if (p > 0){
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ==========================================================
     Комнаты
     ========================================================== */
  function drawRoom(ctx, W, H, scene) {
    var g = ctx.createLinearGradient(0, 0, 0, H * 0.56);
    g.addColorStop(0, '#f6fbff'); g.addColorStop(1, '#ddeaf4');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.56);
    ctx.strokeStyle = 'rgba(2,132,199,.05)'; ctx.lineWidth = 1.4;
    for (var x = 18; x < W; x += 46){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * 0.55); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(2,132,199,.04)'; ctx.lineWidth = 1.2;
    for (var y2 = 108; y2 < 300; y2 += 68){ ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(W, y2); ctx.stroke(); }

    ctx.fillStyle = '#e7ecf1'; ctx.fillRect(0, 296, W, 9);
    ctx.fillStyle = '#c7d3dc'; ctx.fillRect(0, 303, W, 4);

    var gf = ctx.createLinearGradient(0, H * 0.6, 0, H);
    gf.addColorStop(0, '#f4e5c8'); gf.addColorStop(1, '#dcc094');
    ctx.fillStyle = gf; ctx.fillRect(0, H * 0.6, W, H * 0.4);
    ctx.strokeStyle = 'rgba(150,110,60,.22)'; ctx.lineWidth = 1.5;
    for (var y3 = 316; y3 < H; y3 += 30){
      for (var x2 = -60; x2 < W + 60; x2 += 56){
        ctx.beginPath(); ctx.moveTo(x2, y3); ctx.lineTo(x2 + 14, y3 + 11); ctx.lineTo(x2 + 28, y3); ctx.lineTo(x2 + 14, y3 - 11); ctx.closePath(); ctx.stroke();
      }
    }
    var lg = ctx.createRadialGradient(W * 0.78, -H * 0.1, 10, W * 0.78, -H * 0.1, H * 1.1);
    lg.addColorStop(0, 'rgba(255,255,255,.55)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);

    if (scene === 'sofa')   drawSofaScene(ctx, W, H);
    if (scene === 'carpet') drawCarpetScene(ctx, W, H);
    if (scene === 'floor')  drawFloorScene(ctx, W, H);
  }

  /* ---------- диван ---------- */
  function drawSofaScene(ctx, W, H){
    /* картина */
    ctx.fillStyle = '#fdfdfd'; ctx.strokeStyle = '#c9d5de'; ctx.lineWidth = 7;
    ctx.fillRect(W * 0.07, H * 0.08, W * 0.15, H * 0.19);
    ctx.strokeRect(W * 0.07, H * 0.08, W * 0.15, H * 0.19);
    ctx.fillStyle = '#dceefb'; ctx.fillRect(W * 0.085, H * 0.095, W * 0.12, H * 0.16);
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(W * 0.12, H * 0.13, W * 0.016, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9fd4f0';
    ctx.beginPath(); ctx.moveTo(W * 0.085, H * 0.25); ctx.lineTo(W * 0.125, H * 0.16); ctx.lineTo(W * 0.165, H * 0.25); ctx.closePath(); ctx.fill();
    /* часы */
    ctx.fillStyle = '#fdfdfd'; ctx.strokeStyle = '#c9d5de'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(W * 0.295, H * 0.13, H * 0.037, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(W * 0.295, H * 0.13); ctx.lineTo(W * 0.295, H * 0.10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.295, H * 0.13); ctx.lineTo(W * 0.315, H * 0.14); ctx.stroke();
    /* постер */
    ctx.fillStyle = '#fdfdfd'; ctx.strokeStyle = '#c9d5de'; ctx.lineWidth = 5;
    ctx.fillRect(W * 0.40, H * 0.07, W * 0.11, H * 0.18);
    ctx.strokeRect(W * 0.40, H * 0.07, W * 0.11, H * 0.18);
    ctx.fillStyle = '#e2f2fe'; ctx.fillRect(W * 0.412, H * 0.085, W * 0.086, H * 0.085);
    ctx.fillStyle = '#7dd3fc'; ctx.beginPath(); ctx.arc(W * 0.455, H * 0.115, W * 0.017, 0, Math.PI * 2); ctx.fill();
    /* окно — ясный день */
    ctx.fillStyle = '#7ec8f5'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 8;
    ctx.fillRect(W * 0.56, H * 0.06, W * 0.19, H * 0.21);
    ctx.strokeRect(W * 0.56, H * 0.06, W * 0.19, H * 0.21);
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath(); ctx.arc(W * 0.62, H * 0.115, W * 0.026, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,236,150,.7)'; ctx.lineWidth = 3;
    for (var sr = 0; sr < 8; sr++){
      var sa = sr * 0.785;
      ctx.beginPath(); ctx.moveTo(W * 0.62, H * 0.115);
      ctx.lineTo(W * 0.62 + Math.cos(sa) * W * 0.035, H * 0.115 + Math.sin(sa) * W * 0.035);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath(); ctx.ellipse(W * 0.68, H * 0.15, W * 0.028, H * 0.014, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * 0.65, H * 0.13, W * 0.021, H * 0.011, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(W * 0.655, H * 0.05); ctx.lineTo(W * 0.655, H * 0.28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.55, H * 0.16); ctx.lineTo(W * 0.76, H * 0.16); ctx.stroke();
    ctx.fillStyle = '#eef3f7'; ctx.fillRect(W * 0.545, H * 0.275, W * 0.22, H * 0.014);
    /* радиатор */
    ctx.fillStyle = '#eef2f6'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
    ctx.fillRect(W * 0.58, H * 0.30, W * 0.13, H * 0.035);
    for (var rr2 = 0; rr2 < 7; rr2++) ctx.fillRect(W * 0.588 + rr2 * W * 0.017, H * 0.305, W * 0.011, H * 0.025);
    /* ковёр */
    ctx.fillStyle = 'rgba(56,189,248,.2)';
    ctx.beginPath(); ctx.ellipse(W * .5, H * .82, W * .42, H * .13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(W * .5, H * .82, W * .36, H * .11, 0, 0, Math.PI * 2); ctx.stroke();
    /* диван */
    ctx.fillStyle = 'rgba(15,23,42,.14)';
    roundRect(ctx, W * .12, H * .48, W * .76, H * .26, 18); ctx.fill();
    var gb = ctx.createLinearGradient(0, H * .34, 0, H * .62);
    gb.addColorStop(0, '#7fe9ff'); gb.addColorStop(.5, '#38bdf8'); gb.addColorStop(1, '#0284c7');
    ctx.fillStyle = gb; ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 2;
    roundRect(ctx, W * .12, H * .34, W * .76, H * .28, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(2,132,199,.16)';
    for (var tx = W * .13; tx < W * .87; tx += 10) for (var ty = H * .35; ty < H * .47; ty += 10) ctx.fillRect(tx, ty, 3, 3);
    var gc = ctx.createLinearGradient(0, H * .44, 0, H * .60);
    gc.addColorStop(0, '#a5f3fc'); gc.addColorStop(1, '#22d3ee');
    ctx.fillStyle = gc; ctx.strokeStyle = '#0891b2'; ctx.lineWidth = 1.6;
    roundRect(ctx, W * .135, H * .455, W * .35, H * .155, 10); ctx.fill(); ctx.stroke();
    roundRect(ctx, W * .515, H * .455, W * .35, H * .155, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0284c7';
    roundRect(ctx, W * .12, H * .39, W * .055, H * .23, 12); ctx.fill();
    roundRect(ctx, W * .825, H * .39, W * .055, H * .23, 12); ctx.fill();
    /* подушки */
    ctx.save(); ctx.translate(W * .19, H * .45); ctx.rotate(-.12);
    ctx.fillStyle = '#fde047'; ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 2;
    roundRect(ctx, -20, -19, 40, 38, 11); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(W * .80, H * .45); ctx.rotate(.12);
    ctx.fillStyle = '#fbcfe8'; ctx.strokeStyle = '#db9ec4'; ctx.lineWidth = 2;
    roundRect(ctx, -19, -18, 38, 36, 10); ctx.fill(); ctx.stroke(); ctx.restore();
    /* столик */
    ctx.fillStyle = 'rgba(15,23,42,.12)';
    ctx.beginPath(); ctx.ellipse(W * .5, H * .74, W * .11, H * .022, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c08f5e'; ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2;
    roundRect(ctx, W * .40, H * .70, W * .20, H * .035, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a16207';
    ctx.fillRect(W * .42, H * .732, W * .012, H * .045);
    ctx.fillRect(W * .565, H * .732, W * .012, H * .045);
    /* растение */
    ctx.fillStyle = 'rgba(15,23,42,.13)';
    ctx.beginPath(); ctx.ellipse(W * .90, H * .72, W * .05, H * .018, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a16207'; ctx.fillRect(W * .865, H * .60, W * .07, H * .07);
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.ellipse(W * .90, H * .52, W * .035, H * .09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * .875, H * .55, W * .022, H * .06, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * .925, H * .545, W * .02, H * .065, 0, 0, Math.PI * 2); ctx.fill();
  }

  /* ---------- ковёр ---------- */
  function drawCarpetScene(ctx, W, H){
    /* окно — ясный день */
    ctx.fillStyle = '#7ec8f5'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 8;
    ctx.fillRect(W * 0.05, H * 0.06, W * 0.19, H * 0.21);
    ctx.strokeRect(W * 0.05, H * 0.06, W * 0.19, H * 0.21);
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath(); ctx.arc(W * 0.10, H * 0.115, W * 0.026, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,236,150,.7)'; ctx.lineWidth = 3;
    for (var sr = 0; sr < 8; sr++){
      var sa = sr * 0.785;
      ctx.beginPath(); ctx.moveTo(W * 0.10, H * 0.115);
      ctx.lineTo(W * 0.10 + Math.cos(sa) * W * 0.035, H * 0.115 + Math.sin(sa) * W * 0.035);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath(); ctx.ellipse(W * 0.17, H * 0.16, W * 0.028, H * 0.014, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * 0.14, H * 0.135, W * 0.021, H * 0.011, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(W * 0.145, H * 0.05); ctx.lineTo(W * 0.145, H * 0.28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.04, H * 0.16); ctx.lineTo(W * 0.25, H * 0.16); ctx.stroke();
    ctx.fillStyle = '#eef3f7'; ctx.fillRect(W * 0.035, H * 0.275, W * 0.22, H * 0.014);
    /* картина */
    ctx.fillStyle = '#fdfdfd'; ctx.strokeStyle = '#c9d5de'; ctx.lineWidth = 5;
    ctx.fillRect(W * 0.61, H * 0.08, W * 0.13, H * 0.16);
    ctx.strokeRect(W * 0.61, H * 0.08, W * 0.13, H * 0.16);
    ctx.fillStyle = '#dceefb'; ctx.fillRect(W * 0.622, H * 0.095, W * 0.106, H * 0.13);
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(W * 0.675, H * 0.13, W * 0.018, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9fd4f0';
    ctx.beginPath(); ctx.moveTo(W * 0.622, H * 0.225); ctx.lineTo(W * 0.66, H * 0.15); ctx.lineTo(W * 0.70, H * 0.225); ctx.closePath(); ctx.fill();
    /* тумба с лампой */
    ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
    roundRect(ctx, W * 0.78, H * 0.29, W * 0.14, H * 0.24, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(W * 0.79, H * 0.32, W * 0.055, H * 0.07);
    ctx.fillRect(W * 0.855, H * 0.32, W * 0.05, H * 0.07);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(W * 0.85, H * 0.245, H * 0.028, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a16207'; ctx.fillRect(W * 0.845, H * 0.245, H * 0.011, H * 0.05);
    /* диван сверху */
    var gb = ctx.createLinearGradient(0, H * 0.06, 0, H * 0.22);
    gb.addColorStop(0, '#7dd3fc'); gb.addColorStop(1, '#38bdf8');
    ctx.fillStyle = gb; ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 2;
    roundRect(ctx, W * 0.28, H * 0.06, W * 0.44, H * 0.16, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    roundRect(ctx, W * 0.31, H * 0.095, W * 0.18, H * 0.08, 8); ctx.fill();
    roundRect(ctx, W * 0.51, H * 0.095, W * 0.18, H * 0.08, 8); ctx.fill();
    /* большой ковёр */
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath(); ctx.ellipse(W * .5, H * .78, W * .42, H * .175, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(W * .5, H * .78, W * .35, H * .14, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(W * .5, H * .78, W * .25, H * .095, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(W * .5, H * .78, W * .15, H * .055, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.beginPath(); ctx.moveTo(W * .5, H * .73); ctx.lineTo(W * .54, H * .78); ctx.lineTo(W * .5, H * .83); ctx.lineTo(W * .46, H * .78); ctx.closePath(); ctx.fill();
    /* бахрома */
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
    for (var a = 0; a < Math.PI * 2; a += 0.05){
      var px = W * .5 + Math.cos(a) * W * .42, py = H * .78 + Math.sin(a) * H * .175;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * 8, py + Math.sin(a) * 8); ctx.stroke();
    }
  }

  /* ---------- пол ---------- */
  function drawFloorScene(ctx, W, H){
    /* картина */
    ctx.fillStyle = '#fdfdfd'; ctx.strokeStyle = '#c9d5de'; ctx.lineWidth = 5;
    ctx.fillRect(W * 0.08, H * 0.09, W * 0.14, H * 0.17);
    ctx.strokeRect(W * 0.08, H * 0.09, W * 0.14, H * 0.17);
    ctx.fillStyle = '#dceefb'; ctx.fillRect(W * 0.092, H * 0.105, W * 0.116, H * 0.14);
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(W * 0.15, H * 0.145, W * 0.018, 0, Math.PI * 2); ctx.fill();
    /* шкаф */
    ctx.fillStyle = 'rgba(15,23,42,.13)';
    roundRect(ctx, W * 0.72, H * 0.30, W * 0.20, H * 0.26, 8); ctx.fill();
    var gcab = ctx.createLinearGradient(W * 0.72, 0, W * 0.92, 0);
    gcab.addColorStop(0, '#f1f5f9'); gcab.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = gcab; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    roundRect(ctx, W * 0.71, H * 0.28, W * 0.20, H * 0.26, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.4;
    ctx.fillRect(W * 0.725, H * 0.31, W * 0.08, H * 0.09); ctx.strokeRect(W * 0.725, H * 0.31, W * 0.08, H * 0.09);
    ctx.fillRect(W * 0.835, H * 0.31, W * 0.06, H * 0.09); ctx.strokeRect(W * 0.835, H * 0.31, W * 0.06, H * 0.09);
    ctx.fillStyle = '#64748b';
    ctx.beginPath(); ctx.arc(W * 0.805, H * 0.355, 3, 0, Math.PI * 2); ctx.fill();
    /* лужа */
    ctx.fillStyle = 'rgba(56,189,248,.28)';
    ctx.beginPath(); ctx.ellipse(W * 0.34, H * 0.74, W * 0.075, H * 0.032, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath(); ctx.ellipse(W * 0.32, H * 0.73, W * 0.025, H * 0.01, 0, 0, Math.PI * 2); ctx.fill();
    /* маленький коврик */
    ctx.fillStyle = '#bae6fd'; ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(W * 0.55, H * 0.86, W * 0.17, H * 0.07, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    /* растение */
    ctx.fillStyle = '#b45309'; ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2;
    roundRect(ctx, W * 0.05, H * 0.50, W * 0.05, H * 0.055, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.ellipse(W * 0.075, H * 0.44, W * 0.013, H * 0.048, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * 0.058, H * 0.415, W * 0.011, H * 0.038, 0, 0, Math.PI * 2); ctx.fill();
  }

  /* ---------- утилиты ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function iconFor(id) {
    if (id === 'vac')    return '<svg viewBox="0 0 24 24" fill="white" stroke="none"><path d="M8 5h7l4 6H9l-1-6z"/><circle cx="6" cy="14" r="2"/><circle cx="13" cy="14" r="2"/></svg>';
    if (id === 'sponge') return '<svg viewBox="0 0 24 24" fill="white" stroke="none"><rect x="4" y="7" width="16" height="10" rx="3"/><circle cx="8" cy="11" r=".9"/><circle cx="12" cy="12" r=".9"/><circle cx="16" cy="11" r=".9"/></svg>';
    if (id === 'brush')  return '<svg viewBox="0 0 24 24" fill="white" stroke="none"><path d="M6 18l5-5"/><path d="M9 13l-3-3 6-6 3 3-6 6z"/></svg>';
    if (id === 'rag')    return '<svg viewBox="0 0 24 24" fill="white" stroke="none"><path d="M5 6h14v12H5z"/><path d="M7 9c3 2 7 2 10 0M7 13c3 2 7 2 10 0" stroke="#15803d" stroke-width="1.4" fill="none"/></svg>';
    return '<svg viewBox="0 0 24 24" fill="white" stroke="none"><path d="M14 4l6 6"/><path d="M13 5L6 12l-2 7 7-2 7-7z"/></svg>';
  }

  Stage.prototype.showTool = function (on) {
    if (!this.toolEl) return;
    this.toolEl.style.display = on && this.running ? 'block' : 'none';
  };

  Stage.prototype._win = function () {
    if (!this.running) return;
    this.running = false;
    clearTimeout(this._t);
    this.onWin(this.mode);
  };

  Stage.prototype._lose = function () {
    if (!this.running) return;
    this.running = false;
    clearTimeout(this._t);
    this.onLose(this.targets.length - this.left, this.targets.length);
  };

  /* полная остановка этапа — при закрытии окна или смене игры */
  Stage.prototype.stop = function () {
    this.dead = true;
    this.running = false;
    this.pressed = false;
    clearTimeout(this._t);
    clearTimeout(this._hintT);
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._bound && this.canvas) {
      this._bound.forEach(function (b) { try { this.canvas.removeEventListener(b.ev, b.fn); } catch (e) {} }, this);
    }
    this._bound = [];
    this.sparks = []; this.dust = []; this.drips = []; this.puffs = []; this.floats = [];
  };

  global.GAME = { Stage: Stage, MODES: MODES, TOOLS: TOOLS, TOOL_ORDER: TOOL_ORDER, TYPES: TYPES };
})(window);
