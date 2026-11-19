/* ==========================================================
   ЧИСТЮЛЯ — bonus.js
   Страница после отправки заявки.
   Логика:
     • игра доступна ТОЛЬКО при действующей заявке с услугами
     • одна игра на один заказ
     • скидка применяется автоматически: на текущий заказ — сразу,
       на следующий — по номеру телефона
   ========================================================== */
(function(){
  'use strict';
  var $  = function(s,r){ return (r||document).querySelector(s); };
  var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  var C = window.CHIST;

  /* страница всегда открывается с начала */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  window.addEventListener('load', function(){ window.scrollTo(0, 0); });

  /* ---- Тост ---- */
  var toastEl = $('#toast'), toastT;
  function toast(msg){
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function(){ toastEl.classList.remove('on'); }, 3000);
  }

  /* ---- Какая заявка ---- */
  var params = new URLSearchParams(location.search);
  var app = params.get('id') ? C.getApp(params.get('id')) : null;
  if (!app){ var all = C.allApps(); app = all.length ? all[0] : null; }

  /* игра доступна только при заявке с услугами, которая ещё не сыграна */
  function canPlay(){
    return !!(app && app.items && app.items.length > 0 && !app.gamePlayed);
  }

  /* ================= СВОДКА ЗАЯВКИ ================= */
  function renderApplied(){
    var box = $('#applied');
    if (!app){
      $('#heroBadge').textContent = 'Бонус-счёт';
      $('#heroTitle').innerHTML = 'Оставьте заявку —<br>и выиграйте скидку';
      $('#heroText').textContent = 'Сначала оставьте заявку: свяжемся с вами в течение 15 минут, а вы почистите мебель в мини-игре и получите скидку на заказ.';
      box.className = 'applied';
      box.innerHTML = '<a href="index.html#order" class="btn btn-primary" style="width:100%">Оставить заявку</a>';
      return;
    }
    var promo = C.promoOfApp(app);
    var gameName = app.gameName || '';
    var played = !!app.gamePlayed;

    var rows = app.items.map(function(i){
      return '<div class="row"><span>' + i.name + ' <small style="color:var(--muted)">· ' + i.qty + ' ' + C.unitFor(C.svc(i.serviceId), i.qty) + '</small></span><span>' + C.money(i.price) + '</span></div>';
    }).join('');

    /* строка бонуса: за что получили скидку */
    var bonusRow = '';
    var bonusTitle = gameName ? ('Бонус за игру «' + gameName + '»') : 'Бонус по заявке';
    if (promo){
      bonusRow = '<div class="row promo"><span>' + bonusTitle + '<small>' + promo.title + '</small></span><span>−' + promo.percent + '%</span></div>';
    } else if (app.nextPromo){
      bonusRow = '<div class="row promo"><span>' + bonusTitle + '<small>' + app.nextPromo.title + '</small></span><span>−' + app.nextPromo.percent + '%</span></div>';
    }

    var btn = '';
    if (!played && canPlay()){
      btn =
        '<button class="applied-play" id="playBtn">' +
          '<div class="ap-ico">' + C.icon('game') + '</div>' +
          '<div><b>Почистить мебель</b><small>Получите скидку на этот или следующий заказ</small></div>' +
          '<span class="ap-arrow">' + C.icon('arrow') + '</span>' +
        '</button>';
    }

    box.className = 'applied';
    box.innerHTML =
      '<div class="applied-hd" style="justify-content:center;text-align:center"><b style="font-size:22px;letter-spacing:.03em">Ваша заявка принята</b></div>' +
      '<p class="hint cab-tag">Все ваши заявки и скидки привязаны к вашему номеру телефона.</p>' +
      rows +
      bonusRow +
      '<div class="tot"><span>' + (promo ? 'К оплате' : 'Примерная стоимость') + '</span><b>' + C.money(app.total) + '</b></div>' +
      '<p class="hint" style="margin:12px 0 0">Оператор ' + C.contactVerb(app.contactPref) + ' — в течение 15 минут' +
        (app.photo ? ' и назовёт точную сумму по вашему фото.' : ' и уточнит детали по телефону.') + '</p>' +
      btn +
      '<div class="applied-foot">' +
        '<a class="btn btn-primary btn-sm" href="index.html?edit=' + app.id + '#order" style="display:inline-flex;align-items:center;gap:8px">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M4 20l5.5-5.5"/><path d="M9 15l-3.2-3.2 7.4-7.4 3.2 3.2z"/><path d="M14.6 5.2l4.2 4.2"/></svg>' +
          'Править заявку' +
        '</a>' +
        '<a class="btn btn-ghost btn-sm" href="index.html#cabinet">Мои заявки</a>' +
      '</div>';

    var pb = $('#playBtn');
    if (pb) {
      pb.addEventListener('click', function(){ openMenu(); });
    }
    /* запасной путь: клик в любую точку playBtn.
       Назначаем через onclick, чтобы обработчик не накапливался при перерисовке */
    box.onclick = function(e){
      if (e.target.closest && e.target.closest('#playBtn')) openMenu();
    };
  }

  /* ================= ОКНО: ЧТО МОЖНО ВЫИГРАТЬ + ВЫБОР ИГРЫ ================= */
  var overlay = $('#gOverlay');
  var stage = null;

  function closeOverlay(){
    if (stage){ stage.stop(); stage = null; }
    overlay.classList.remove('open');
  }
  $('#gClose').addEventListener('click', closeOverlay);
  overlay.addEventListener('click', function(e){ if (e.target === overlay) closeOverlay(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeOverlay(); });

  function openMenu(){
    if (!canPlay()){ toast('Игра на этот заказ уже сыграна'); return; }

    var games = GAMES.map(function(g){
      return '<button class="m-game" data-play="' + g.mode + '">' +
        '<div class="m-game-ico">' + C.icon(g.icon) + '</div>' +
        '<b>' + g.title + '</b>' +
        '<small>' + g.text + '</small>' +
        '<span class="m-game-time">' + g.sec + ' сек</span>' +
        '</button>';
    }).join('');

    $('#gTitle').textContent = 'Что можно выиграть';
    $('#gHint').textContent = 'Один заказ — одна игра. Выберите, что почистить.';
    $('#gBody').innerHTML =
      '<div class="m-sec"><b>Приз</b><p class="m-prize-single">Скидка до <b>20%</b> на этот или следующий заказ — применится сама, ничего вводить не нужно</p></div>' +
      '<div class="m-sec"><b>Выберите игру</b><div class="m-games">' + games + '</div></div>';

    overlay.classList.add('open');

    $$('[data-play]', overlay).forEach(function(b){
      b.addEventListener('click', function(){ play(b.dataset.play); });
    });
  }

  /* ================= ИГРА ================= */
  var GAMES = [
    { mode:'vac',   icon:'vac',    title:'Пропылесось ковёр', text:'Пылесосом — пыль и шерсть, веником — крошки.', sec:60 },
    { mode:'wipe',  icon:'sponge', title:'Отмой диван',       text:'Губкой — жир, щёткой — старые пятна, тряпкой — разводы.', sec:60 },
    { mode:'floor', icon:'brush',  title:'Отдери подпалины',  text:'Щёткой — подпалины, тряпкой — клей, пылесосом — пыль.', sec:60 }
  ];

  function play(mode){
    if (!canPlay()){ closeOverlay(); toast('Игра на этот заказ уже сыграна'); return; }
    if (!window.GAME || !window.GAME.Stage || !window.GAME.MODES[mode]){
      toast('Игра не загрузилась. Обновите страницу (Ctrl+F5).');
      return;
    }
    var cfg = window.GAME.MODES[mode];
    $('#gTitle').textContent = cfg.title;
    $('#gHint').textContent = cfg.hint;
    $('#gBody').innerHTML = '<div id="gHost"></div>';
    overlay.classList.add('open');
    if (stage) stage.stop();
    try {
      stage = new window.GAME.Stage({
        mode: mode,
        host: $('#gHost'),
        onTick: function(left){ var t = document.querySelector('.g-timer'); if (t) t.textContent = left + ' с'; },
        onProgress: function(cleaned, total){
          var c = document.querySelector('.g-count'); if (c) c.textContent = cleaned + ' / ' + total;
          var b = document.querySelector('.g-meter i'); if (b) b.style.width = (cleaned/Math.max(1,total)*100) + '%';
        },
        onWin: function(){ win(mode); },
        onLose: function(done, total){ lose(mode, done, total); }
      });
      stage.start();
    } catch (err) {
      $('#gBody').innerHTML = '<p class="hint" style="padding:16px;text-align:center;color:var(--s700)">Игра не смогла запуститься: ' + (err.message || err) + '</p>';
      console.error(err);
    }
  }

  /* ================= ПРИЗ ================= */
  function win(mode){
    var p = C.rollPrize();
    var promo = C.addPromo({
      title: p.title, percent: p.percent, scope: p.scope,
      phone: app ? app.phone : '', relatedApp: app ? app.id : null,
      note: app ? ('Выиграно в заказе ' + app.id) : ''
    });

    var gameTitle = (GAMES.filter(function(g){ return g.mode === mode; })[0] || {}).title || '';
    var now = p.scope === 'now';
    if (app){
      if (now){
        C.applyPromoToApp(app, promo);
        C.updateApp(app.id, { gamePlayed: true, gameName: gameTitle });
      } else {
        C.updateApp(app.id, { gamePlayed: true, gameName: gameTitle,
                              nextPromo: { title: p.title, percent: p.percent } });
      }
    }

    var explain = now
      ? 'Скидка уже учтена в стоимости заказа — оператор подтвердит её при звонке.'
      : 'Скидка закреплена за вашим номером — сработает автоматически на следующем заказе.';

    $('#gBody').innerHTML =
      '<div class="gain" style="text-align:center;padding:26px 22px">' +
        '<div class="gain-ico">' + C.icon('gift') + '</div>' +
        '<b style="font-size:19px;display:block;margin-top:6px">Скидка получена</b>' +
        '<code style="display:block;font-size:26px;font-weight:900;letter-spacing:.02em;margin:12px 0 8px">' + p.title + '</code>' +
        '<div style="font-size:14px;opacity:.96;max-width:420px;margin:0 auto;line-height:1.5">' + explain + '</div>' +
        (now ? '<div style="margin:16px auto 0;display:inline-block;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);border-radius:14px;padding:9px 16px;font-size:14px">К оплате: ' + C.money(app ? app.total : 0) + '</div>' : '') +
        '<div style="display:flex;justify-content:center;margin-top:22px">' +
          '<button class="btn" id="pOk" style="background:#fff;color:var(--s700);border-color:#fff;font-size:16px;padding:13px 38px;box-shadow:0 12px 26px -10px rgba(0,0,0,.45)">Отлично</button>' +
        '</div>' +
      '</div>';
    $('#pOk').addEventListener('click', function(){ closeOverlay(); renderApplied(); });
    toast('Приз: ' + p.title);
  }

  function lose(mode, done, total){
    $('#gBody').innerHTML =
      '<div class="gain is-lost" style="text-align:center">' +
        '<div class="gain-ico">' + C.icon('timer') + '</div>' +
        '<b style="font-size:19px;display:block;margin-top:6px">Время вышло</b>' +
        '<p style="margin:8px 0 0;font-size:14px;opacity:.95">Убрано ' + done + ' из ' + total + '. Попробуйте ещё раз — скидка ждёт вас.</p>' +
        '<button class="btn btn-sm" style="margin-top:16px;background:#fff;color:#991b1b;border-color:#fff" id="gAgain">Попробовать снова</button>' +
      '</div>';
    $('#gAgain').addEventListener('click', function(){ play(mode); });
  }

  renderApplied();
})();
