/* ==========================================================
   ЧИСТЮЛЯ — admin.js
   Кабинет оператора: заявки, статусы, заметки, скидки
   ========================================================== */
(function(){
  'use strict';
  var $  = function(s,r){ return (r||document).querySelector(s); };
  var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  var C = window.CHIST;

  var toastEl = $('#toast'), toastT;
  function toast(msg){
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function(){ toastEl.classList.remove('on'); }, 3000);
  }

  var modal = $('#modal');
  function closeModal(){ modal.classList.remove('open'); }
  $('#mClose').addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if (e.target === modal) closeModal(); });

  /* ---------- Табы ---------- */
  var tab = 'apps';
  $$('#tabs .adm-tab').forEach(function(b){
    b.addEventListener('click', function(){
      $$('#tabs .adm-tab').forEach(function(x){ x.classList.remove('on'); });
      b.classList.add('on');
      tab = b.dataset.tab;
      render();
    });
  });

  /* ---------- Поиск ---------- */
  var q = '';
  $('#search').addEventListener('input', function(){ q = this.value.trim().toLowerCase(); render(); });

  $('#refreshBtn').addEventListener('click', function(){ render(); toast('Обновлено'); });
  $('#logoutBtn').addEventListener('click', function(){ location.href = 'index.html'; });

  /* авто-обновление: новая заявка появляется сама, без перезагрузки страницы */
  C.onExternalChange = function(){
    render();
    toast('Новая заявка');
  };
  setInterval(function(){
    if (document.hidden) return;
    try { C.reload(); render(); } catch (e) {}
  }, 15000);

  /* ---------- Отрисовка ---------- */
  function plural(n, one, few, many){
    var n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
  }
  function render(){
    if (!C) return;
    C.reload();                      /* перечитываем хранилище: заявки могли прийти из другой вкладки */
    var apps = C.allApps();
    var live = apps.filter(function(a){ return !a.archived; });
    var arch = apps.length - live.length;

    /* статистика-плитки */
    var nNew = live.filter(function(a){ return a.status === 'new'; }).length;
    var nWork = live.filter(function(a){ return a.status === 'in_progress'; }).length;
    var nDone = live.filter(function(a){ return a.status === 'done'; }).length;
    var totalSum = live.reduce(function(s,a){ return s + (a.total||0); },0);
    var nDisc = C.allPromos().length;
    var stat = '';
    stat += '<div class="stat"><b>' + live.length + '</b><span>' + plural(live.length,'заявка','заявки','заявок') + '</span></div>';
    stat += '<div class="stat"><b>' + nNew + '</b><span>' + plural(nNew,'новая','новые','новых') + '</span></div>';
    stat += '<div class="stat"><b>' + nWork + '</b><span>в работе</span></div>';
    stat += '<div class="stat"><b>' + nDone + '</b><span>' + plural(nDone,'готова','готовые','готовых') + '</span></div>';
    stat += '<div class="stat"><b>' + C.money(totalSum) + '</b><span>сумма заказов</span></div>';
    stat += '<div class="stat"><b>' + nDisc + '</b><span>' + plural(nDisc,'скидка','скидки','скидок') + '</span></div>';
    if (arch) stat += '<div class="stat"><b>' + arch + '</b><span>' + plural(arch,'заменена','заменены','заменённых') + '</span></div>';
    $('#admStats').innerHTML = stat;

    $('#appsPane').style.display  = (tab === 'disc') ? 'none' : '';
    $('#discPane').style.display  = (tab === 'disc') ? '' : 'none';
    $('#search').style.display    = (tab === 'disc') ? 'none' : '';

    if (tab === 'disc'){ renderDiscounts(); return; }

    var list = apps.slice();
    if (tab === 'new')  list = list.filter(function(a){ return a.status === 'new' && !a.archived; });
    if (tab === 'work') list = list.filter(function(a){ return a.status === 'in_progress' && !a.archived; });
    if (tab === 'done') list = list.filter(function(a){ return a.status === 'done' && !a.archived; });
    if (q) list = list.filter(function(a){
      var digits = q.replace(/\D/g, '');
      var phoneOk = digits.length >= 3 && (a.phone||'').replace(/\D/g,'').indexOf(digits) >= 0;
      return (a.name||'').toLowerCase().indexOf(q) >= 0 || phoneOk;
    });

    var body = $('#appsBody'), html = '';
    list.forEach(function(a){
      var st = C.STATUSES[a.status] || C.STATUSES.new;
      html += '<tr' + (a.archived ? ' style="opacity:.6"' : '') + '>' +
        '<td><b>#' + String(a.id).slice(-4) + '</b></td>' +
        '<td style="white-space:nowrap;color:var(--muted);font-size:13px">' + C.fmtDate(a.createdAt) + '</td>' +
        '<td>' + (a.name||'—') + '</td>' +
        '<td style="white-space:nowrap">' + C.maskPhone(a.phone) + '</td>' +
        '<td style="font-size:13px;color:var(--muted);max-width:300px">' + a.items.map(function(i){ return i.name; }).join(', ') + '</td>' +
        '<td class="num">' + C.money(a.total) + '</td>' +
        '<td><span class="st ' + (a.archived ? 'st-cancel' : st.cls) + '">' + (a.archived ? 'заменена' : st.label) + '</span></td>' +
        '<td><button class="btn-mini" data-open="' + a.id + '">Открыть</button></td>' +
        '</tr>';
    });
    body.innerHTML = html;
    $('#appsEmpty').style.display = list.length ? 'none' : '';

    $$('[data-open]', body).forEach(function(b){
      b.addEventListener('click', function(){ openApp(b.dataset.open); });
    });
  }

  function renderDiscounts(){
    var list = C.allPromos();
    var body = $('#discBody'), html = '';
    list.forEach(function(d){
      var state, cls;
      if (d.supersededBy){
        state = 'заменена на «' + d.supersededBy + '»';
        cls = 'st-cancel';
      } else if (d.used){
        state = 'использована'; cls = 'st-cancel';
      } else if (d.scope === 'next'){
        state = 'сработает на следующем заказе'; cls = 'st-work';
      } else {
        state = 'активна'; cls = 'st-done';
      }
      html += '<tr>' +
        '<td><b style="color:var(--s700)">' + d.title + '</b></td>' +
        '<td style="font-size:13px;color:var(--muted)">' + (d.note || '—') + '</td>' +
        '<td style="white-space:nowrap">' + (d.phone ? C.maskPhone(d.phone) : '<span style="color:var(--muted)">—</span>') + '</td>' +
        '<td style="white-space:nowrap;color:var(--muted);font-size:13px">' + C.fmtDate(d.createdAt) + '</td>' +
        '<td><span class="st ' + cls + '">' + state + '</span></td>' +
        '<td style="font-size:12px;color:var(--muted)">' + (d.appId ? 'заказ ' + d.appId : (d.relatedApp ? 'выиграно в ' + d.relatedApp : '')) + '</td>' +
      '</tr>';
    });
    body.innerHTML = html;
    $('#discEmpty').style.display = list.length ? 'none' : '';
  }

  /* ---------- Карточка заявки ---------- */
  function openApp(id){
    var a = C.getApp(id); if (!a) return;
    var st = C.STATUSES[a.status] || C.STATUSES.new;

    var itemsHtml = a.items.map(function(i){
      return '<div class="sum-line"><span>' + i.name + ' <small style="color:var(--muted)">' + i.qty + ' ' + C.unitFor(C.svc(i.serviceId), i.qty) + ' × ' + i.rate + '</small></span><span>' + C.money(i.price) + '</span></div>';
    }).join('');

    var promo = C.promoOfApp(a);

    /* скидки клиента на следующий заказ — применяются сами, автоматически */
    var nextOnes = C.allPromos().filter(function(d){
      return !d.used && d.scope === 'next' && d.phone && C.tail9(d.phone) === C.tail9(a.phone);
    });
    var nextPromoHint = '';
    if (nextOnes.length){
      var best = nextOnes.slice().sort(function(x,y){ return (y.percent||0) - (x.percent||0); })[0];
      nextPromoHint = '<div style="margin-top:18px;background:var(--s50);border:1px solid var(--s100);border-radius:13px;padding:14px">' +
        '<b style="font-size:13px;color:var(--muted)">БОНУС КЛИЕНТА</b>' +
        '<div style="margin-top:6px">На следующий заказ сработает <b style="color:var(--s600)">' + best.title + '</b>' +
          (nextOnes.length > 1 ? ' <span style="color:var(--muted)">(это максимальная из ' + nextOnes.length + ' выигранных — остальные заменены этой)</span>' : '') +
        '. Клиенту ничего вводить не нужно — скидка применится сама.</div></div>';
    }

    $('#mTitle').textContent = 'Заявка оператора';
    $('#mBody').innerHTML = [
      '<dl class="kv">',
        '<dt>Клиент</dt><dd>' + (a.name || '—') + '</dd>',
        '<dt>Телефон</dt><dd><a href="tel:' + String(a.phone).replace(/\D/g,'') + '">' + C.maskPhone(a.phone) + '</a></dd>',
        '<dt>Связь через</dt><dd>' + (a.contactPref || '—') + '</dd>',
        '<dt>Создана</dt><dd>' + C.fmtDate(a.createdAt) + '</dd>',
        '<dt>Статус</dt><dd><span class="st ' + st.cls + '">' + st.label + '</span></dd>',
        '<dt>Игра</dt><dd>' + (a.gamePlayed ? 'сыграна' : 'ещё не сыграна') + '</dd>',
        promo ? '<dt>Скидка</dt><dd style="color:var(--s600)">' + promo.title + ' (−' + promo.percent + '%)</dd>' : '',
      '</dl>',
      a.comment ? '<div style="margin-top:16px;background:var(--s50);border:1px solid var(--s100);border-radius:13px;padding:14px"><b style="font-size:13px;color:var(--muted)">КОММЕНТАРИЙ КЛИЕНТА</b><div style="margin-top:4px">' + a.comment + '</div></div>' : '',
      a.photo ? '<div style="margin-top:16px"><b style="font-size:13px;color:var(--muted)">ФОТО ОТ КЛИЕНТА</b><img src="' + a.photo + '" style="margin-top:8px;border-radius:13px;border:1px solid var(--s100);max-height:320px" alt=""></div>' : '',
      '<div style="margin-top:18px"><b style="font-size:13px;color:var(--muted)">УСЛУГИ</b>',
        '<div style="margin-top:6px">' + itemsHtml + '</div>',
        promo ? '<div class="sum-line" style="color:var(--s600);font-weight:700"><span>' + promo.title + '</span><span>−' + promo.percent + '%</span></div>' : '',
        '<div class="sum-total"><span>' + (promo ? 'К оплате' : 'Примерная стоимость') + '</span><b style="font-size:26px">' + C.money(a.total) + '</b></div>',
        promo && a.baseTotal ? '<p class="hint" style="margin:0">Без скидки: ' + C.money(a.baseTotal) + '</p>' : '',
      '</div>',
      '<div style="margin-top:18px"><b style="font-size:13px;color:var(--muted)">ЗАПИСЬ В АДМИНКЕ</b>',
        '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">',
          '<button class="btn-mini" data-status="new">Новая</button>',
          '<button class="btn-mini" data-status="in_progress">В работе</button>',
          '<button class="btn-mini" data-status="done">Готово</button>',
          '<button class="btn-mini" data-status="cancelled">Отменена</button>',
        '</div>',
      '</div>',
      '<div style="margin-top:18px"><label class="lbl" for="admNote">Ответ клиенту (он увидит в своём кабинете)</label>',
        '<textarea class="input" id="admNote" placeholder="Например: Ирина, добрый день! Будем в четверг в 10:00, стоимость 340 BYN.">' + (a.note || '') + '</textarea>',
        '<button class="btn btn-ghost btn-sm" id="saveNote" style="margin-top:10px">Сохранить ответ</button>',
      '</div>',
      nextPromoHint,
      '<div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--s100);display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">',
        '<button class="btn-mini" id="delApp" style="color:#b91c1c;border-color:#fecaca">Удалить заявку</button>',
        '<button class="btn btn-primary btn-sm" id="closeModal2">Сохранить</button>',
      '</div>'
    ].join('');

    modal.classList.add('open');

    $$('#mBody [data-status]').forEach(function(b){
      b.addEventListener('click', function(){
        C.setStatus(a.id, b.dataset.status);
        render(); openApp(a.id); toast('Статус обновлён');
      });
    });
    $('#saveNote').addEventListener('click', function(){
      C.updateApp(a.id, { note: $('#admNote').value.trim() });
      render(); toast('Ответ сохранён');
    });
    $('#closeModal2').addEventListener('click', closeModal);
    $('#delApp').addEventListener('click', function(){
      if (!confirm('Удалить заявку?')) return;
      C.deleteApp(a.id); closeModal(); render(); toast('Заявка удалена');
    });
  }

  /* ---------- Сброс ---------- */
  $('#resetBtn').addEventListener('click', function(){
    if (!confirm('Удалить все заявки и скидки из этого браузера?')) return;
    C.reset(); render(); toast('Данные очищены');
  });

  /* где физически живут заявки — зависит от настроек config.js */
  (function(){
    var hint = document.getElementById('admStoreHint');
    if (!hint) return;
    var CFG = window.CONFIG || {};
    if (CFG.TG_BOT_TOKEN && CFG.TG_CHAT_ID) hint.textContent = 'Заявки приходят в Telegram и дублируются в этом браузере';
    else if (CFG.FORM_ENDPOINT) hint.textContent = 'Заявки отправляются на сервер и сохраняются в этом браузере';
    else hint.textContent = 'Заявки хранятся в этом браузере';
  })();

  render();

  /* диагностика: экран загрузки → видим, что доступно (только с ?debug=1) */
  try {
    var dbg = new URLSearchParams(location.search).get('debug');
    if (dbg === '1') {
      var s = 'CHIST=' + (window.CHIST ? 'OK' : 'MISSING') + '\n'
            + 'apps=' + (window.CHIST && window.CHIST.allApps ? window.CHIST.allApps().length : 'n/a') + '\n'
            + 'rows=' + C.allApps().map(function(a){ return a.id; }).join(',') + '\n'
            + 'ua=' + navigator.userAgent;
      var d = document.getElementById('diagBar');
      d.style.display = 'block';
      d.textContent = s;
    }
  } catch (e) {}
})();