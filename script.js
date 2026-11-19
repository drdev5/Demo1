/* ==========================================================
   ЧИСТЮЛЯ — script.js
   Часть 1: общий модуль (хранилище, справочник услуг, помощники)
   Часть 2: логика клиентской страницы
   ========================================================== */
(function (global) {
  'use strict';

  /* =======================================================
     ЧАСТЬ 1 — ОБЩИЙ МОДУЛЬ
     ======================================================= */
  var KEY = 'chistulya_v1';

  /* ------------------------------------------------------------------
     УСЛУГИ
     unit      — 'm2' (за квадратный метр) | 'unit' (за штуку)
     rate      — цена за единицу, BYN
     min       — минимальный заказ по этой услуге, BYN
     hrs       — [мин, макс] времени для «эталонного» объёма, часов
     crew      — [мин, макс] людей на этот объём
     qtyLabel  — подпись поля количества
     ------------------------------------------------------------------ */
  var SERVICES = [
    /* --- Квартиры и дома --- */
    { id:'gen', group:'home', name:'Генеральная уборка', unit:'m2', unitWord:'м²', rate:6, min:40,
      hrs:[2,4], crew:[1,2], icon:'sparkles', tag:'Хит',
      desc:'Полная уборка: полы, плинтусы, стены, санузел, кухня, шкафы, зеркала, освещение.' },
    { id:'surf', group:'home', name:'Поверхностная уборка', unit:'m2', unitWord:'м²', rate:4, min:30,
      hrs:[1,2], crew:[1,1], icon:'broom',
      desc:'Кухня, ванная, комнаты, пыль и мусор. Когда нужно быстро привести в порядок.' },
    { id:'repair', group:'home', name:'Уборка после ремонта', unit:'m2', unitWord:'м²', rate:8, min:60,
      hrs:[3,6], crew:[2,3], icon:'paint', tag:'Сложная',
      desc:'Строительная пыль, следы штробления и краски, очистка после поклейки обоев.' },
    { id:'fire', group:'home', name:'Уборка после пожара', unit:'m2', unitWord:'м²', rate:20, min:150,
      hrs:[4,8], crew:[3,4], icon:'flame',
      desc:'Удаление копоти и запаха гари, обработка поверхностей, промывка текстиля.' },
    { id:'movein', group:'home', name:'Уборка перед въездом', unit:'m2', unitWord:'м²', rate:7, min:60,
      hrs:[3,5], crew:[2,2], icon:'box',
      desc:'Квартира как новая перед заселением: полы, стены, шкафы, санузел, окна.' },

    /* --- Мебель и текстиль --- */
    { id:'furn', group:'furniture', name:'Химчистка мебели', unit:'unit', unitWord:'место', rate:15, min:15,
      hrs:[1,2], crew:[1,1], icon:'sofa',
      desc:'Диван, кресла, стулья. Выезд с оборудованием и профессиональной химией.' },
    { id:'mattress', group:'furniture', name:'Чистка матраса', unit:'unit', unitWord:'матрас', rate:40, min:40,
      hrs:[2,3], crew:[1,1], icon:'bed', tag:'Хит',
      desc:'Глубокая чистка с сушкой: аллергены, пылевые клещи, запахи, пятна пота.' },
    { id:'carpet', group:'furniture', name:'Химчистка ковров', unit:'m2', unitWord:'м²', rate:12, min:30,
      hrs:[1,3], crew:[1,1], icon:'layers',
      desc:'Влажная чистка, удаление въевшихся пятен и запахов, сушка за 3–4 часа.' },

    /* --- Дополнительно --- */
    { id:'window', group:'extras', name:'Мойка окон', unit:'unit', unitWord:'окно', rate:35, min:35,
      hrs:[1,3], crew:[1,2], icon:'window',
      desc:'Двусторонняя мойка, рама и подоконник, любой этаж. Сетки включены в стоимость.' },
    { id:'decon', group:'extras', name:'Дезинфекция', unit:'m2', unitWord:'м²', rate:5, min:40,
      hrs:[1,2], crew:[1,1], icon:'shield',
      desc:'Обработка сертифицированными средствами, акты и заключения по запросу.' },
    { id:'odor', group:'extras', name:'Удаление запахов', unit:'m2', unitWord:'м²', rate:12, min:50,
      hrs:[2,4], crew:[1,2], icon:'nose', tag:'Хит',
      desc:'Затхлость, сигареты, животные, плесень. Обработка + вентиляция, гарантия 6 мес.' },
    { id:'facade', group:'extras', name:'Мойка кухонных фасадов', unit:'unit', unitWord:'фасад', rate:25, min:25,
      hrs:[1,3], crew:[1,1], icon:'kitchen',
      desc:'Жир и застывшие разводы снимаются без царапин. Верхние и нижние шкафы.' },
    { id:'flood', group:'extras', name:'Уборка после затопления', unit:'m2', unitWord:'м²', rate:15, min:100,
      hrs:[3,6], crew:[2,3], icon:'drop', tag:'Сложная',
      desc:'Сушилка, вынос мусора и мебели, промывка и восстановление покрытий.' },

    /* --- Бизнес --- */
    { id:'office', group:'biz', name:'Уборка офиса', unit:'m2', unitWord:'м²', rate:4, min:50,
      hrs:[1,2], crew:[1,1], icon:'building',
      desc:'Регулярная уборка по договору, закрывающие документы для бухгалтерии.' },
    { id:'shop', group:'biz', name:'Уборка торгового зала', unit:'m2', unitWord:'м²', rate:6, min:60,
      hrs:[2,4], crew:[1,2], icon:'store',
      desc:'Витрины, полки, санузлы, зона касс. Уборка до и после открытия.' },
    { id:'stock', group:'biz', name:'Уборка склада и производства', unit:'m2', unitWord:'м²', rate:7, min:80,
      hrs:[2,5], crew:[2,3], icon:'box2',
      desc:'Полы, проходы, упаковочные зоны, техника безопасности.' },

    /* --- Авто --- */
    { id:'auto', group:'auto', name:'Химчистка салона авто', unit:'unit', unitWord:'машина', rate:280, max:350, min:280,
      hrs:[2,4], crew:[1,2], icon:'car', tag:'Выезд',
      desc:'Салон, потолок, ковролин, сиденья, багажник, двери. Комплекс с выездом. Цена зависит от машины: 280–350 BYN.' }
  ];

  var GROUPS = [
    { id:'home',     title:'Квартиры и дома' },
    { id:'furniture',title:'Мебель и текстиль' },
    { id:'extras',   title:'Дополнительно' },
    { id:'biz',      title:'Бизнес и помещения' },
    { id:'auto',     title:'Авто' }
  ];

  /* разумные пределы по количеству — чтобы нельзя было заказать «10 машин химчистки» */
  var LIMITS = {
    gen:400, surf:300, repair:400, fire:300, movein:400,
    furn:15, mattress:10, carpet:300, window:40, decon:300, flood:300,
    odor:400, facade:30, office:800, shop:800, stock:1000, auto:5
  };
  var QTY_LABEL = {
    furn:'Количество мест', mattress:'Количество матрасов',
    auto:'Количество машин', facade:'Количество фасадов', window:'Количество окон'
  };
  function limitOf(s){ return LIMITS[s.id] || 999; }
  function qtyLabel(s){
    if (s.unit === 'm2') return 'Площадь, м²';
    return QTY_LABEL[s.id] || ('Количество, ' + s.unitWord);
  }

  /* ==========================================================
     ПРИЗЫ БОНУС-ИГРЫ.
     Взвешенная лотерея от 5% до 20%:
       now  (на этот заказ)  — чаще 5–10, реже 11–17, ещё реже 18–20;
       next (на следующий)   — те же 5–20, но крупные чуть чаще.
     ========================================================== */
  /* таблица весов [percent, weight] */
  var NOW_WEIGHTS = [
    [5,8],[6,8],[7,8],[8,8],[9,7],[10,6],        /* 5–10  → 45% */
    [11,6],[12,6],[13,6],[14,6],[15,6],[16,5],[17,5], /* 11–17 → 40% */
    [18,5],[19,5],[20,5]                          /* 18–20 → 15% */
  ];
  var NEXT_WEIGHTS = [
    [5,4],[6,4],[7,4],[8,4],[9,2],[10,2],        /* 5–10  → 20% */
    [11,6],[12,6],[13,6],[14,6],[15,6],[16,6],[17,7], /* 11–17 → 43% */
    [18,13],[19,12],[20,12]                     /* 18–20 → 37% */
  ];
  function rollFrom(table){
    var total = 0, i, sum = 0;
    for (i = 0; i < table.length; i++) total += table[i][1];
    var r = Math.random() * total;
    for (i = 0; i < table.length; i++){ sum += table[i][1]; if (r < sum) return table[i][0]; }
    return table[table.length - 1][0];
  }
  function rollPrize(){
    var scope = Math.random() < 0.30 ? 'next' : 'now';   /* 30% — приз на следующий заказ */
    var percent = rollFrom(scope === 'next' ? NEXT_WEIGHTS : NOW_WEIGHTS);
    var title = 'Скидка ' + percent + '%' + (scope === 'next' ? ' на следующий заказ' : ' на заказ');
    return { id:'pr' + Date.now() + Math.floor(Math.random()*1000),
             title: title, scope: scope, percent: percent, service: null };
  }

  var ICONS = {
    sparkles:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z"/>',
    broom:'<path d="M14.5 3.5l6 6-3.5 3.5-6-6 3.5-3.5z"/><path d="M10 8l-6.5 6.5L6 18l3.5-2.5L16 9"/><path d="M4 20l3-3"/>',
    paint:'<rect x="4" y="3" width="16" height="5" rx="2"/><path d="M6 8v5h12V8"/><path d="M12 13v8"/><path d="M9 21h6"/>',
    flame:'<path d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.5.7-2.5 1.5-3.5.3 1.2 1 1.8 1.8 2C11.6 7.5 11.5 5 12 3z"/>',
    sofa:'<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M2 12a2 2 0 0 1 4 0v3h12v-3a2 2 0 0 1 4 0v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5z"/>',
    layers:'<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
    window:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M4 12h16"/>',
    shield:'<path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
    drop:'<path d="M12 3s6 6.4 6 10.4A6 6 0 0 1 6 13.4C6 9.4 12 3 12 3z"/><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5"/>',
    building:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10 21v-3h4v3"/>',
    store:'<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9v11h18V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M9 20v-6h6v6"/>',
    box2:'<path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/><path d="M7 10.5l9-5"/>',
    bed:'<path d="M3 18v-8h18v8"/><path d="M3 14h18"/><path d="M3 18v2M21 18v2"/><rect x="5" y="7" width="6" height="4" rx="1.5"/><rect x="13" y="7" width="6" height="4" rx="1.5"/>',
    nose:'<path d="M12 3c-3 0-5 2.2-5 5 0 2 .8 3.2 1.6 4.3.7 1 .6 2 .6 3.2 0 2-1.4 3.5-3 3.5-2 0-3.2-1.6-3.2-3.6"/><circle cx="14.5" cy="15" r="1.6"/>',
    kitchen:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 11h16"/><path d="M9 7v2M15 7v2"/><path d="M8 14v3M16 14v3"/>',
    car:'<path d="M4 16v-3l2-5h12l2 5v3"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/><path d="M4 13h16"/>',
    box:'<path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',

    /* --- иконки интерфейса --- */
    game:'<path d="M6.5 11h4M8.5 9v4"/><path d="M15 10.5h.01M18 13h.01"/><path d="M17.5 5H6.5A4.5 4.5 0 0 0 2 9.5v5A4.5 4.5 0 0 0 6.5 19c1.6 0 2.6-.6 3.5-1.4h4c.9.8 1.9 1.4 3.5 1.4A4.5 4.5 0 0 0 22 14.5v-5A4.5 4.5 0 0 0 17.5 5z"/>',
    vac:'<path d="M4 5h9l4.5 6.5H8.5z"/><path d="M8.5 11.5V16"/><circle cx="6.5" cy="18.5" r="2"/><circle cx="13.5" cy="18.5" r="2"/>',
    sponge:'<rect x="3" y="6" width="18" height="12" rx="3.5"/><path d="M7 10.5h.01M11 10.5h.01M15 10.5h.01M7 14h.01M11 14h.01M15 14h.01"/>',
    brush:'<path d="M4 20l5.5-5.5"/><path d="M9 15l-3.2-3.2 7.4-7.4 3.2 3.2z"/><path d="M14.6 5.2l4.2 4.2"/>',
    check:'<path d="M20 6.5L9.5 17 4 11.5"/>',
    lock:'<rect x="4.5" y="10" width="15" height="10.5" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    gift:'<path d="M20 12v9H4v-9"/><path d="M2.5 7h19v5h-19z"/><path d="M12 21V7"/><path d="M12 7H7.8a2.2 2.2 0 0 1 0-4.4C11 2.6 12 7 12 7z"/><path d="M12 7h4.2a2.2 2.2 0 0 0 0-4.4C13 2.6 12 7 12 7z"/>',
    timer:'<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.5 1.8"/><path d="M9.5 2.5h5"/>',
    camera:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3.5L9.5 4h5L16.5 7H20a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.6"/>',
    telegram:'<path d="M21.5 3.5L2.5 10.7l5.8 2.4L18.9 6l-8.4 8 1.4 5.6 3-3.8 4.6 3.3z"/>',
    whatsapp:'<path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.3L3.2 20.6l1.8-4.8a8.4 8.4 0 1 1 15.5-4.2z"/><path d="M8.8 9.2c.5 2.4 2.4 4.3 4.8 4.8"/>',
    phone:'<path d="M21.5 16.9v3a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3 19.3 19.3 0 0 1-5.9-5.9A19.6 19.6 0 0 1 2 4.4 2 2 0 0 1 4 2.2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a15.8 15.8 0 0 0 5.9 5.9l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    viber:'<path d="M21.5 16.9v3a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3 19.3 19.3 0 0 1-5.9-5.9A19.6 19.6 0 0 1 2 4.4 2 2 0 0 1 4 2.2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a15.8 15.8 0 0 0 5.9 5.9l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/><path d="M14.5 4.5a6 6 0 0 1 5 5"/><path d="M13.5 7.5a3.2 3.2 0 0 1 3 3"/>',
    users:'<path d="M16.5 20.5v-1.8a3.8 3.8 0 0 0-3.8-3.8H6.3a3.8 3.8 0 0 0-3.8 3.8v1.8"/><circle cx="9.5" cy="7.5" r="3.6"/><path d="M21.5 20.5v-1.8a3.8 3.8 0 0 0-2.8-3.7"/><path d="M15.5 4.1a3.6 3.6 0 0 1 0 6.9"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    arrow:'<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
    close:'<path d="M18 6L6 18M6 6l12 12"/>',
    shield:'<path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
    key:'<circle cx="8" cy="14" r="4"/><path d="M11 11.5L20 3M17 6l2.5 2.5M15 8l2 2"/>'
  };

  function icon(name, cls){
    return '<svg class="' + (cls||'ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name]||'') + '</svg>';
  }
  function iconFilled(name, cls){
    return '<svg class="' + (cls||'ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name]||'') + '</svg>';
  }

  function blank(){ return { apps: [], promos: [], seq: 0 }; }

  function load(){
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && Array.isArray(p.apps)) {
          p.promos = p.promos || p.discounts || [];   /* миграция со старой версии */
          p.seq = p.seq || p.apps.length;
          return p;
        }
      }
    } catch (e) {}
    return blank();
  }

  var db = load();

  /* перечитать данные из хранилища — нужно, когда заявка пришла
     из другой вкладки (кабинет оператора) или из другого устройства */
  function reload(){
    db = load();
    return db;
  }

  function save(){
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch (e) {
      try {
        var light = JSON.parse(JSON.stringify(db));
        light.apps.forEach(function(a){ a.photo = null; });
        localStorage.setItem(KEY, JSON.stringify(light));
        return true;
      } catch (e2) { return false; }
    }
  }

  /* в другой вкладке/окне изменились данные — подхватываем */
  window.addEventListener('storage', function(e){
    if (e.key !== KEY && e.key !== null) return;
    reload();
    try { if (global.CHIST && global.CHIST.onExternalChange) global.CHIST.onExternalChange(); } catch (err) {}
  });

  function svc(id){ for (var i=0;i<SERVICES.length;i++) if (SERVICES[i].id===id) return SERVICES[i]; return null; }

  function money(n){
    n = Math.round(Number(n)||0);
    return n.toLocaleString('ru-BY').replace(/\u00A0/g,' ') + ' BYN';
  }
  function unitLabel(u){ return u === 'm2' ? 'м²' : 'шт'; }

  /* склонение единиц: 1 машина / 2 машины / 5 машин */
  var UNIT_FORMS = {
    'машина': ['машина','машины','машин'],
    'место':  ['место','места','мест'],
    'матрас': ['матрас','матраса','матрасов'],
    'фасад':  ['фасад','фасада','фасадов'],
    'предмет':['предмет','предмета','предметов'],
    'окно':   ['окно','окна','окон'],
    'диван':  ['диван','дивана','диванов'],
    'кресло': ['кресло','кресла','кресел'],
    'стул':   ['стул','стульев','стульев']
  };
  function pluralUnit(word, n){
    var f = UNIT_FORMS[word];
    if (!f) return word;
    n = Math.abs(Number(n) || 0);
    var n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return f[0];
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return f[1];
    return f[2];
  }
  /* подпись единицы с учётом количества */
  function unitFor(s, qty){
    if (!s) return '';
    return s.unit === 'm2' ? 'м²' : pluralUnit(s.unitWord, qty);
  }

  /* как оператор свяжется с клиентом */
  function contactVerb(pref){
    switch (pref) {
      case 'Звонок':   return 'позвонит вам';
      case 'WhatsApp': return 'свяжется через WhatsApp';
      case 'Viber':    return 'свяжется через Viber';
      case 'Telegram': return 'свяжется через Telegram';
      default:         return 'свяжется с вами';
    }
  }

  /* ---- оценка времени и количества людей ---- */
  function scale(s, qty){
    if (s.unit === 'm2') return Math.max(1, qty) / 50;      /* эталон — 50 м² */
    return Math.max(1, qty);                                /* эталон — 1 предмет */
  }
  function fmtHours(h){
    h = Math.max(1, Math.round(h));
    return String(h);
  }
  function timeEstimate(s, qty){
    var k = scale(s, qty);
    var lo = Math.max(0.5, s.hrs[0] * k);
    var hi = Math.max(lo, s.hrs[1] * k);
    return fmtHours(lo) + '–' + fmtHours(hi) + ' ч';
  }
  function crewEstimate(s, qty){
    var k = scale(s, qty);
    var extra = Math.floor(Math.max(0, k - 1) / 1.2);        /* каждые ~60 м² добавляем человека */
    var lo = Math.min(6, s.crew[0] + extra);
    var hi = Math.min(6, s.crew[1] + extra);
    if (lo === hi) return lo + ' ' + plural(lo, 'человек', 'человека', 'человек');
    return lo + '–' + hi + ' ' + plural(hi, 'человек', 'человека', 'человек');
  }
  function plural(n, one, few, many){
    var n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
  }

  function fmtDate(iso){
    var d = new Date(iso), p = function(n){ return (n<10?'0':'')+n; };
    return p(d.getDate())+'.'+p(d.getMonth()+1)+'.'+d.getFullYear()+' '+p(d.getHours())+':'+p(d.getMinutes());
  }

  function nextId(){ db.seq = (db.seq||0)+1; return 'CH-' + String(db.seq).padStart(4,'0'); }

  function calc(items){
    var total = 0, norm = [];
    (items||[]).forEach(function(it){
      var s = svc(it.serviceId); if (!s) return;
      var qty = Math.max(0, Number(it.qty)||0);
      var price = Math.max(s.min, s.rate*qty);
      total += price;
      norm.push({ serviceId:s.id, name:s.name, unit:s.unit, unitWord:s.unitWord,
                  qty:qty, rate:s.rate, price:price,
                  time:timeEstimate(s, qty), crew:crewEstimate(s, qty) });
    });
    return { items: norm, total: total };
  }

  function addApp(data){
    var a = Object.assign({ id: nextId(), createdAt: new Date().toISOString(), status:'new', note:'', discount:null, photo:null }, data);
    db.apps.unshift(a); save(); return a;
  }
  function allApps(){ return db.apps.slice(); }
  function getApp(id){ for (var i=0;i<db.apps.length;i++) if (db.apps[i].id===id) return db.apps[i]; return null; }
  function updateApp(id, patch){ var a = getApp(id); if (!a) return null; Object.assign(a, patch); save(); return a; }
  function setStatus(id, status){ return updateApp(id, { status: status }); }
  function deleteApp(id){ db.apps = db.apps.filter(function(a){ return a.id !== id; }); save(); }

  function tail9(p){ return String(p||'').replace(/\D/g,'').slice(-9); }
  function appsByPhone(phone){
    var p = tail9(phone);
    return db.apps.filter(function(a){ return tail9(a.phone) === p; });
  }

  /* ---------- Промо-скидки ----------
     Клиенту не нужно ничего вводить: скидка хранится на его номере
     и применяется автоматически — на текущий заказ сразу,
     на следующий — при оформлении следующего. */
  function makeCode(){ return 'CHIST-' + Math.floor(1000 + Math.random()*9000); }

  function addPromo(data){
    var p = Object.assign({
      id: nextId(), code: makeCode(), createdAt: new Date().toISOString(),
      used:false, appId:null, phone:'', title:'', percent:10, scope:'now'
    }, data);
    db.promos.unshift(p); save(); return p;
  }
  function allPromos(){ return db.promos.slice(); }
  function promosByPhone(phone){
    var p = tail9(phone);
    return db.promos.filter(function(x){ return x.phone && tail9(x.phone) === p; });
  }
  /* неиспользованная скидка на следующий заказ.
     Если у клиента несколько — применяется максимальная, остальные заменяются ею. */
  function nextPromo(phone){
    var list = promosByPhone(phone).filter(function(x){ return x.scope === 'next' && !x.used; });
    if (!list.length) return null;
    var best = list[0];
    for (var i = 1; i < list.length; i++){
      if ((list[i].percent || 0) > (best.percent || 0)) best = list[i];
    }
    return best;
  }
  /* все меньшие скидки клиента помечаем заменёнными — чтобы в списке не копились */
  function supersedeSmallerPromos(phone, applied){
    if (!applied) return 0;
    var list = promosByPhone(phone).filter(function(x){
      return x.scope === 'next' && !x.used && x.id !== applied.id &&
             (x.percent || 0) <= (applied.percent || 0);
    });
    list.forEach(function(x){ x.used = true; x.supersededBy = applied.title; });
    return list.length;
  }
  /* применяем промо к заявке: уменьшаем итог, фиксируем.
     Работаем со «свежими» объектами из хранилища — иначе после reload()
     изменения потерялись бы. */
  function applyPromoToApp(app, promo){
    if (!app || !promo) return app;
    var live = (app.id ? getApp(app.id) : null) || app;
    var livePromo = (promo.id ? db.promos.filter(function(x){ return x.id === promo.id; })[0] : null) || promo;
    live.baseTotal = (live.baseTotal != null) ? live.baseTotal : live.total;
    live.promo = { code: livePromo.code, title: livePromo.title, percent: livePromo.percent, scope: livePromo.scope };
    live.total = Math.round(live.baseTotal * (1 - livePromo.percent/100));
    livePromo.used = true;
    livePromo.appId = live.id;
    save();
    return live;
  }
  /* скидка, уже применённая к конкретной заявке */
  function promoOfApp(app){ return (app && app.promo) ? app.promo : null; }

  var STATUSES = {
    new:         { label:'Новая',      cls:'st-new' },
    in_progress: { label:'В работе',   cls:'st-work' },
    done:        { label:'Выполнена',  cls:'st-done' },
    cancelled:   { label:'Отменена',   cls:'st-cancel' }
  };

  function maskPhone(v){
    var d = String(v||'').replace(/\D/g,'');
    if (!d) return '';
    if (d.length === 9) d = '375'+d;
    if (d.length === 10) d = '7'+d;
    if (d.length === 12 && d.slice(0,3) !== '375') d = '375'+d.slice(-9);
    if (d.length !== 12) return v;
    var op = d.slice(3,5);
    return '+375 ('+op+') '+d.slice(5,8)+'-'+d.slice(8,10)+'-'+d.slice(10,12);
  }

  /* ---- Поле телефона: +375 живёт отдельным блоком и не стирается ---- */
  function localDigits(v){
    var d = String(v||'').replace(/\D/g,'');
    if (d.length > 9){
      if (d.slice(0,3) === '375') d = d.slice(3);
      else if (d.charAt(0) === '8') d = d.slice(1);
    }
    return d.slice(0,9);
  }
  function formatLocal(d){
    if (!d) return '';
    var s = '(' + d.slice(0,2);
    if (d.length > 2) s += ') ' + d.slice(2,5);
    else if (d.length === 2) s += ')';
    if (d.length > 5) s += '-' + d.slice(5,7);
    if (d.length > 7) s += '-' + d.slice(7,9);
    return s;
  }
  function isDigit(ch){ return ch >= '0' && ch <= '9'; }
  function digitsBefore(str, pos){
    var n = 0;
    for (var i=0;i<pos && i<str.length;i++) if (isDigit(str.charAt(i))) n++;
    return n;
  }
  function caretAfter(str, k){
    if (k <= 0) return 0;
    var seen = 0;
    for (var i=0;i<str.length;i++){
      if (isDigit(str.charAt(i))){
        seen++;
        if (seen === k) return i+1;
      }
    }
    return str.length;
  }

  function bindPhone(input){
    if (!input) return;
    function refresh(){
      var pos = input.selectionStart;
      var k = digitsBefore(input.value, pos);
      var d = localDigits(input.value);
      var out = formatLocal(d);
      input.value = out;
      var np = caretAfter(out, Math.min(k, d.length));
      try { input.setSelectionRange(np, np); } catch(e){}
    }
    input.addEventListener('input', refresh);
    input.addEventListener('focus', function(){ setTimeout(refresh, 0); });
    input.addEventListener('click', refresh);
    input.value = formatLocal(localDigits(input.value));
  }

  /* полный номер из поля (для сохранения) */
  function phoneFull(input){
    if (!input) return '';
    var d = String(input.value||'').replace(/\D/g,'');
    if (!d.length) return '';
    return maskPhone('375' + d);
  }

  function compressImage(file, maxW, quality){
    return new Promise(function(resolve, reject){
      if (!file || !/^image\//.test(file.type)) { reject(new Error('Это не изображение')); return; }
      var reader = new FileReader();
      reader.onload = function(e){
        var img = new Image();
        img.onload = function(){
          var w = img.width, h = img.height;
          var scaleK = Math.min(1, (maxW||900)/w);
          var cw = Math.max(1, Math.round(w*scaleK)), ch = Math.max(1, Math.round(h*scaleK));
          var c = document.createElement('canvas'); c.width = cw; c.height = ch;
          c.getContext('2d').drawImage(img, 0, 0, cw, ch);
          try { resolve(c.toDataURL('image/jpeg', quality||0.72)); } catch (err) { reject(err); }
        };
        img.onerror = function(){ reject(new Error('Не удалось прочитать файл')); };
        img.src = e.target.result;
      };
      reader.onerror = function(){ reject(new Error('Ошибка чтения файла')); };
      reader.readAsDataURL(file);
    });
  }

  global.CHIST = {
    SERVICES:SERVICES, GROUPS:GROUPS, rollPrize:rollPrize, ICONS:ICONS, icon:icon, iconFilled:iconFilled, STATUSES:STATUSES,
    limitOf:limitOf, qtyLabel:qtyLabel, pluralUnit:pluralUnit, unitFor:unitFor, contactVerb:contactVerb,
    money:money, unitLabel:unitLabel, fmtDate:fmtDate, svc:svc, calc:calc,
    timeEstimate:timeEstimate, crewEstimate:crewEstimate,
    addApp:addApp, allApps:allApps, getApp:getApp, updateApp:updateApp, setStatus:setStatus, deleteApp:deleteApp,
    appsByPhone:appsByPhone,
    makeCode:makeCode,
    addPromo:addPromo, allPromos:allPromos, promosByPhone:promosByPhone, nextPromo:nextPromo,
    supersedeSmallerPromos:supersedeSmallerPromos,
    applyPromoToApp:applyPromoToApp, promoOfApp:promoOfApp,
    maskPhone:maskPhone, bindPhone:bindPhone, phoneFull:phoneFull, compressImage:compressImage,
    tail9:tail9,
    reload:reload,
    reset:function(){ db = blank(); save(); }
  };

  /* =======================================================
     ЧАСТЬ 2 — КЛИЕНТСКАЯ СТРАНИЦА (только на index.html)
     ======================================================= */
  if (document.getElementById('svcGrid')) {
  var $  = function(s,r){ return (r||document).querySelector(s); };
  var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  var C = global.CHIST;

  /* ---- Тост ---- */
  var toastEl = $('#toast'), toastT;
  function toast(msg){
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function(){ toastEl.classList.remove('on'); }, 3200);
  }

  /* ---- Модалка ---- */
  var modal = $('#modal');
  function openModal(title, html){ if (!modal) return; $('#mTitle').textContent = title; $('#mBody').innerHTML = html; modal.classList.add('open'); }
  function closeModal(){ if (modal) modal.classList.remove('open'); }
  var mClose = $('#mClose'); if (mClose) mClose.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', function(e){ if (e.target === modal) closeModal(); });

  /* ---- До/После ---- */
  (function(){
    var td = $('#tplDirty'); if (!td) return;
    var tc = $('#tplClean'); if (!tc) return;
    $('#baDirty').appendChild(td.content.cloneNode(true));
    $('#baClean').appendChild(tc.content.cloneNode(true));

    var ba = $('#ba'), range = $('#baRange');
    var tagL = ba.querySelector('.ba-tag.l');
    var tagR = ba.querySelector('.ba-tag.r');

    /* Подписи «ДО» и «ПОСЛЕ» живут по бокам от бегунка:
       «ДО» — слева, «ПОСЛЕ» — справа. Круг бегунка перекрывает
       подпись с той стороны, в которую он направлен. */
    function set(v){
      var p = Math.max(0, Math.min(100, Number(v) || 0));
      ba.style.setProperty('--pos', p + '%');
      if (!tagL || !tagR) return;
      var w = ba.clientWidth;
      if (!w) return;
      var x = w * p / 100;
      var lw = tagL.offsetWidth, rw = tagR.offsetWidth;

      /* «ДО» — прижата к бегунку слева, «ПОСЛЕ» — справа.
         Если подпись уезжает за край — прячем её полностью. */
      var lx = x - 14 - lw;
      if (lx < 6){ tagL.style.opacity = '0'; tagL.style.left = '0px'; }
      else { tagL.style.opacity = '1'; tagL.style.left = lx + 'px'; }

      var rx = x + 14;
      if (rx + rw > w - 6){ tagR.style.opacity = '0'; tagR.style.left = Math.max(0, w - rw) + 'px'; }
      else { tagR.style.opacity = '1'; tagR.style.left = rx + 'px'; }
    }
    set(range.value);
    range.addEventListener('input', function(){ set(range.value); });
    window.addEventListener('resize', function(){ set(range.value); });
    /* первичная раскладка — после загрузки шрифтов */
    window.addEventListener('load', function(){ set(range.value); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ set(range.value); });
  })();

  /* ================= ГАЛЕРЕЯ УСЛУГ ================= */
  var picked = {};            /* id -> qty */
  var lastM2 = null;          /* последний осознанно введённый пользователем метраж; null — ещё ничего не вводил */
  var svcGrid = $('#svcGrid');
  var cardEls = {};           /* id -> element */

  /* пустое поле при свежей загрузке — без жёсткого «54 м²» */
  function defaultQty(s){ return s.unit === 'm2' ? (lastM2 == null ? 1 : lastM2) : 1; }
  function inpValue(s){ return (s.unit === 'm2' && lastM2 == null && !picked[s.id]) ? '' : defaultQty(s); }
  function clampQty(s, v){
    v = Math.max(1, Math.min(limitOf(s), Math.round(Number(v) || 1)));
    return v;
  }

  function buildGallery(){
    var html = '';
    C.GROUPS.forEach(function(g, gi){
      var items = C.SERVICES.filter(function(s){ return s.group === g.id; });
      html += '<div class="svc-group" id="grp-' + g.id + '" data-g="' + g.id + '">' +
        '<div class="svc-group-hd"><h3>' + g.title + '</h3><span class="cnt">' + items.length + ' ' + plural(items.length,'услуга','услуги','услуг') + '</span></div>' +
        '<div class="svc-row">';
      items.forEach(function(s, ci){
        var delay = (gi*0.06 + ci*0.035).toFixed(2);
        html +=
          '<button type="button" class="svc2" data-id="' + s.id + '" style="animation-delay:' + delay + 's">' +
            '<div class="svc2-hd">' +
              '<div class="svc2-ico">' + C.icon(s.icon) + '<span class="svc2-check">' + C.icon('check') + '</span></div>' +
              '<div style="flex:1;min-width:0">' +
                '<div class="svc2-name">' + s.name + (s.tag ? '<span class="svc2-tag">' + s.tag + '</span>' : '') + '</div>' +
                '<div class="svc2-price"><b>' + (s.max ? (s.rate + '–' + s.max) : ('от ' + s.rate)) + ' BYN</b><small>за ' + ({'машина':'машину','матрас':'матрас','мест':'мест','фасад':'фасад'}[s.unitWord] || s.unitWord) + '</small></div>' +
              '</div>' +
            '</div>' +
            '<p class="svc2-desc">' + s.desc + '</p>' +
            '<div class="svc2-meta">' +
              '<span class="mchip">' + C.icon('clock') + '<span data-time="' + s.id + '">' + C.timeEstimate(s, defaultQty(s)) + '</span></span>' +
              '<span class="mchip">' + C.icon('users') + '<span data-crew="' + s.id + '">' + C.crewEstimate(s, defaultQty(s)) + '</span></span>' +
            '</div>' +
            '<div class="svc2-qty">' +
              '<div class="svc2-qty-row">' +
                '<label for="qty-' + s.id + '">' + qtyLabel(s) + '</label>' +
                '<input id="qty-' + s.id + '" type="number" min="1" max="' + limitOf(s) + '" value="' + inpValue(s) + '" placeholder="' + (s.unit === 'm2' ? 'м²' : '') + '" data-qty="' + s.id + '">' +
                '<span class="unit">' + unitFor(s, defaultQty(s)) + '</span>' +
                '<span class="sum" data-sum="' + s.id + '">' + C.money(Math.max(s.min, s.rate * defaultQty(s))) + '</span>' +
              '</div>' +
              '<div class="hint" style="margin-top:6px">Максимум ' + limitOf(s) + ' ' + pluralUnit(s.unitWord, limitOf(s)) + ' за один заказ. Больше — по договорённости с оператором.</div>' +
            '</div>' +
          '</button>';
      });
      html += '</div></div>';
    });
    svcGrid.innerHTML = html;

    $$('.svc2', svcGrid).forEach(function(el){
      var id = el.dataset.id;
      cardEls[id] = el;
      el.addEventListener('click', function(e){
        if (e.target.tagName === 'INPUT') return;
        toggle(id);
      });
      var inp = el.querySelector('[data-qty]');
      inp.addEventListener('input', function(e){
        e.stopPropagation();
        var raw = String(inp.value).trim();
        if (raw === '') return;           /* человек временно стёр цифры — подождём */
        var v = clampQty(C.svc(id), raw);
        if (Number(raw) !== v) inp.value = v;
        if (C.svc(id).unit === 'm2') lastM2 = v;
        picked[id] = v;
        syncCard(id);
        renderAll();
      });
      inp.addEventListener('click', function(e){ e.stopPropagation(); });
    });
  }

  function toggle(id){
    if (picked[id]) delete picked[id];
    else picked[id] = defaultQty(C.svc(id));
    syncCard(id);
    renderAll();
  }

  function syncCard(id){
    var s = C.svc(id), el = cardEls[id]; if (!s || !el) return;
    var on = !!picked[id];
    el.classList.toggle('on', on);
    var qty = picked[id] || defaultQty(s);
    var inp = el.querySelector('[data-qty]');
    if (inp && document.activeElement !== inp) inp.value = (s.unit === 'm2' && lastM2 == null && !picked[id]) ? '' : qty;
    el.querySelector('[data-time]').textContent = C.timeEstimate(s, qty);
    el.querySelector('[data-crew]').textContent = C.crewEstimate(s, qty);
    el.querySelector('[data-sum]').textContent = C.money(Math.max(s.min, s.rate * qty));
  }

  /* ---- «Ваш выбор» в форме ---- */
  function renderChosen(){
    var box = $('#chosenBox');
    var ids = Object.keys(picked);
    if (!ids.length){
      box.className = 'chosen empty';
      box.innerHTML = '<b>Пока ничего не выбрано</b>Нажмите на карточку услуги выше — она добавится сюда, и вы укажете площадь или количество.';
      return;
    }
    box.className = 'chosen';
    var res = C.calc(ids.map(function(id){ return { serviceId:id, qty:picked[id] }; }));
    var html = '';
    res.items.forEach(function(it){
      html += '<div class="crow">' +
        '<div class="cname">' + it.name + '<small>' + it.time + ' · ' + it.crew + '</small></div>' +
        '<input type="number" min="1" value="' + it.qty + '" data-cq="' + it.serviceId + '">' +
        '<span class="unit" style="font-size:12.5px;color:var(--muted);font-weight:700">' + C.unitFor(C.svc(it.serviceId), it.qty) + '</span>' +
        '<span class="cprice">' + C.money(it.price) + '</span>' +
        '<button type="button" class="rm" data-rm="' + it.serviceId + '" title="Убрать">' + C.icon('close') + '</button>' +
        '</div>';
    });
    box.innerHTML = html;

    $$('[data-cq]', box).forEach(function(inp){
      inp.addEventListener('input', function(){
        var raw = String(inp.value).trim();
        if (raw === '') return;
        var id = inp.dataset.cq;
        var s = C.svc(id);
        picked[id] = clampQty(s, raw);
        if (s.unit === 'm2') lastM2 = picked[id];
        syncCard(id);
        renderAll(true);
      });
    });
    $$('[data-rm]', box).forEach(function(b){
      b.addEventListener('click', function(){ delete picked[b.dataset.rm]; syncCard(b.dataset.rm); renderAll(); });
    });
  }

  /* ---- Итог ---- */
  function renderSum(){
    var ids = Object.keys(picked);
    var res = C.calc(ids.map(function(id){ return { serviceId:id, qty:picked[id] }; }));
    var lines = $('#sumLines');
    if (!res.items.length){
      lines.innerHTML = '<p class="hint" style="margin:0">Выберите услуги в галерее услуг — стоимость посчитается автоматически.</p>';
    } else {
      lines.innerHTML = res.items.map(function(it){
        return '<div class="sum-line"><span>' + it.name + '<br><small style="color:var(--muted)">' + it.qty + ' ' + C.unitFor(C.svc(it.serviceId), it.qty) + ' × ' + it.rate + ' · ' + it.time + '</small></span><span>' + C.money(it.price) + '</span></div>';
      }).join('');
    }
    $('#sumTotal').textContent = C.money(res.total);
  }

  var renderAll = function(skipChosen){
    renderSum();
    if (!skipChosen) renderChosen();
    renderCart();
  };

  /* ---- Плавающая корзина ---- */
  function renderCart(){
    var box = $('#cart');
    if (!box) return;
    var ids = Object.keys(picked);
    if (!ids.length){ box.classList.remove('on'); return; }
    var res = C.calc(ids.map(function(id){ return { serviceId:id, qty:picked[id] }; }));

    $('#cartCount').textContent = ids.length + ' ' + plural(ids.length,'услуга','услуги','услуг');
    $('#cartList').innerHTML = res.items.map(function(it){
      return '<div class="cart-row"><span>' + it.name + '<small>' + it.qty + ' ' + pluralUnit(it.unitWord, it.qty) + ' · ' + it.time + '</small></span><span>' + C.money(it.price) + '</span></div>';
    }).join('');
    $('#cartTotal').textContent = C.money(res.total);
    box.classList.add('on');
  }

  var cartGo = $('#cartGo');
  if (cartGo) cartGo.addEventListener('click', function(){
    var target = document.querySelector('#order');
    if (target) target.scrollIntoView({ behavior:'smooth', block:'start' });
    setTimeout(function(){ var n = $('#fName'); if (n) n.focus({ preventScroll:true }); }, 620);
  });
  var cartClose = $('#cartClose');
  if (cartClose) cartClose.addEventListener('click', function(){
    picked = {};
    Object.keys(cardEls).forEach(function(id){ syncCard(id); });
    renderAll();
    toast('Выбор очищен');
  });

  /* ---- Панель групп ---- */
  function buildToolbar(){
    var box = $('#svcToolbar');
    var html = '<button class="stab on" data-g="all">Все услуги</button>';
    C.GROUPS.forEach(function(g){
      html += '<button class="stab" data-g="' + g.id + '">' + g.title + '</button>';
    });
    box.innerHTML = html;
    $$('.stab', box).forEach(function(b){
      b.addEventListener('click', function(){
        $$('.stab', box).forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on');
        var g = b.dataset.g;
        var target = g === 'all' ? svcGrid : $('#grp-' + g);
        if (target){
          target.scrollIntoView({ behavior:'smooth', block:'start' });
          target.classList.add('flash');
          setTimeout(function(){ target.classList.remove('flash'); }, 1600);
        }
      });
    });
  }

  /* ================= ФОТО ================= */
  var photoData = null, photoName = '';
  var photoDrop = $('#photoDrop'), photoInput = $('#photoInput');

  function renderPhoto(){
    if (!photoData){
      photoDrop.classList.remove('has');
      photoDrop.innerHTML =
        '<input type="file" id="photoInput" accept="image/*">' +
        '<div class="photo-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>' +
        '<div class="photo-bold">Прикрепите фото</div>' +
        '<div class="photo-sub">Перетащите файл сюда или нажмите</div>' +
        '<div class="photo-note">Сжимаем автоматически — можно грузить с телефона</div>';
      photoInput = $('#photoInput');
      photoInput.addEventListener('change', onFile);
      return;
    }
    photoDrop.classList.add('has');
    photoDrop.innerHTML =
      '<img class="photo-prev" src="' + photoData + '" alt="фото объекта">' +
      '<div class="photo-bar"><span class="nm">' + photoName + '</span>' +
      '<span style="display:flex;gap:8px">' +
      '<button type="button" class="btn-mini" id="photoRe">Заменить</button>' +
      '<button type="button" class="btn-mini" id="photoDel" style="color:#b91c1c;border-color:#fecaca">Убрать</button>' +
      '</span></div>' +
      '<input type="file" id="photoInput" accept="image/*">';
    photoInput = $('#photoInput');
    photoInput.addEventListener('change', onFile);
    $('#photoDel').addEventListener('click', function(e){ e.stopPropagation(); photoData = null; photoName=''; renderPhoto(); });
    $('#photoRe').addEventListener('click', function(e){ e.stopPropagation(); photoInput.click(); });
  }

  function onFile(e){
    var f = e.target.files && e.target.files[0]; if (!f) return;
    if (f.size > 12 * 1024 * 1024){ toast('Файл больше 12 МБ — возьмите поменьше'); e.target.value=''; return; }
    C.compressImage(f, 1200, 0.75).then(function(data){
      photoData = data; photoName = f.name; renderPhoto(); toast('Фото прикреплено');
    }).catch(function(){ toast('Не удалось прочитать фото'); });
  }

  if (photoDrop){
    photoDrop.addEventListener('click', function(e){
      if (e.target.closest('button')) return;
      if (!photoData) photoInput.click();
    });
    photoDrop.addEventListener('dragover', function(e){ e.preventDefault(); photoDrop.classList.add('over'); });
    photoDrop.addEventListener('dragleave', function(){ photoDrop.classList.remove('over'); });
    photoDrop.addEventListener('drop', function(e){
      e.preventDefault(); photoDrop.classList.remove('over');
      var f = e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return;
      if (!/^image\//.test(f.type)) { toast('Это не картинка'); return; }
      C.compressImage(f, 1200, 0.75).then(function(data){
        photoData = data; photoName = f.name; renderPhoto(); toast('Фото прикреплено');
      }).catch(function(){ toast('Не удалось прочитать фото'); });
    });
    renderPhoto();
  }

  /* ---- Контакт-предпочтения ---- */
  $$('#contactOpts .copt').forEach(function(lab){
    lab.addEventListener('click', function(){
      $$('#contactOpts .copt').forEach(function(x){ x.classList.remove('on'); });
      lab.classList.add('on');
      lab.querySelector('input').checked = true;
    });
  });

  C.bindPhone($('#fPhone')); C.bindPhone($('#cabPhone'));

  /* ================= ОТПРАВКА ЗАЯВКИ ================= */
  $('#leadForm').addEventListener('submit', function(e){
    e.preventDefault();
    var name = $('#fName').value.trim();
    var phone = C.phoneFull($('#fPhone'));
    var phoneDigits = $('#fPhone').value.replace(/\D/g,'').length;
    var comment = $('#fComment').value.trim();
    var contactPref = ($('#contactOpts input:checked')||{}).value || 'Telegram';

    /* 1. сначала услуга — и к ней отправляем */
    if (!Object.keys(picked).length) {
      toast('Выберите услугу');
      $('#services').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    /* 2. потом — как к вам обращаться */
    if (!name) {
      toast('Как к вам можно обращаться?');
      $('#fName').focus();
      return;
    }
    /* 3. потом — номер телефона */
    if (phoneDigits < 9) {
      toast('Введите свой номер телефона');
      $('#fPhone').focus();
      return;
    }
    if (!$('#fConsent').checked) { toast('Нужно согласие на обработку данных'); return; }
    /* фото желательно, но мы тут ничего не всплываем */

    var items = Object.keys(picked).map(function(id){ return { serviceId:id, qty: picked[id] }; });
    var res = C.calc(items);

    /* скидка, выигранная в прошлый раз, применяется автоматически */
    var promo = C.nextPromo(phone);

    /* ---- ПРАВКА существующей заявки ---- */
    if (editingId && C.getApp(editingId)) {
      var samePhone = (phone === editingOldPhone);
      var keep = C.getApp(editingId);
      if (samePhone){
        /* тот же номер — обновляем заявку на месте, ничего не удаляем */
        var base = res.total;
        var total = base;
        if (keep.promo) total = Math.round(base * (1 - keep.promo.percent/100));
        C.updateApp(editingId, {
          name: name, phone: phone, comment: comment, contactPref: contactPref,
          items: res.items, total: total, baseTotal: base,
          photo: photoData
          /* gamePlayed не трогаем — игра уже сыграна, второй раз не даём */
        });
        try { localStorage.setItem('chistulya_me', phone); } catch (err) {}
        var btn0 = $('#submitBtn');
        btn0.disabled = true; btn0.textContent = 'Сохраняем…'; btn0.style.opacity = '.75';
        setTimeout(function(){ location.href = 'bonus.html?id=' + editingId; }, 280);
        return;
      }
      /* номер изменился — старую заявку НЕ удаляем, а помечаем как заменённую.
         Скидка (если была применена) переезжает на новую заявку. */
      C.updateApp(editingId, { archived: true, replacedAt: new Date().toISOString() });
      var carry = keep.promo ? keep.promo : null;
      var newApp = C.addApp({
        name: name, phone: phone, comment: comment, contactPref: contactPref,
        items: res.items, total: res.total, baseTotal: res.total,
        photo: photoData, source: 'сайт',
        /* игра уже сыграна — второй раз не даём, даже если номер сменился */
        gamePlayed: (keep.gamePlayed || carry) ? true : false,
        gameName: keep.gameName || ''
      });
      if (carry){
        var moved = C.addPromo({
          title: carry.title, percent: carry.percent, scope: 'now',
          phone: phone, relatedApp: newApp.id, note: 'Перенесена из ' + keep.id
        });
        C.applyPromoToApp(newApp, moved);
      }
      try { localStorage.setItem('chistulya_me', phone); } catch (err) {}
      var btn1 = $('#submitBtn');
      btn1.disabled = true; btn1.textContent = 'Сохраняем…'; btn1.style.opacity = '.75';
      setTimeout(function(){ location.href = 'bonus.html?id=' + newApp.id; }, 280);
      return;
    }

    var app = C.addApp({
      name: name, phone: phone, comment: comment, contactPref: contactPref,
      items: res.items, total: res.total, baseTotal: res.total,
      photo: photoData, source: 'сайт', gamePlayed: false
    });
    if (promo){
      /* сначала помечаем меньшие скидки заменёнными, потом применяем максимальную (она сохраняет базу) */
      C.supersedeSmallerPromos(phone, promo);
      C.applyPromoToApp(app, promo);
    }

    /* отправляем оператору (если настроено в config.js) */
    deliverLead(app).then(function(sent){
      if (sent) toast('Заявка отправлена оператору');
    });

    /* запоминаем номер — чтобы кабинет сразу открывался под ним */
    try { localStorage.setItem('chistulya_me', phone); } catch (err) {}

    /* Без модалки: сразу уходим на страницу бонус-игры.
       Там клиент видит подтверждение, сводку заявки и призовой фонд. */
    var btn = $('#submitBtn');
    btn.disabled = true;
    btn.textContent = 'Отправляем…';
    btn.style.opacity = '.75';

    setTimeout(function(){ location.href = 'bonus.html?id=' + app.id; }, 280);
  });

  /* ================= КАБИНЕТ КЛИЕНТА ================= */
  function showCabinet(phone){
    var p = String(phone||'');
    var digits = p.replace(/\D/g,'').length;
    if (digits !== 10 && digits !== 12) { toast('Введите свой номер телефона'); return; }
    var apps = C.appsByPhone(p).filter(function(a){ return !a.archived; });
    var promos = C.promosByPhone(p);
    var out = $('#cabOut');
    if (!apps.length && !promos.length){
      out.innerHTML = '<p class="hint" style="margin:0">Заявок по этому номеру не найдено. Проверьте номер или оформите новую заявку.</p>';
      return;
    }
    var html = '';
    if (apps.length){
      html += '<h4 style="margin:0 0 12px">Заявки (' + apps.length + ')</h4><div class="app-list">';
      apps.forEach(function(a){
        var st = C.STATUSES[a.status] || C.STATUSES.new;
        html += '<div class="app-item">' +
          '<div class="app-top"><span class="app-id">Заявка</span><span class="st ' + st.cls + '">' + st.label + '</span></div>' +
          '<div class="app-meta"><b>' + (a.name || 'Клиент') + '</b> · ' + C.maskPhone(a.phone) + '</div>' +
          '<div class="app-meta">от ' + C.fmtDate(a.createdAt) + ' · <b>' + C.money(a.total) + '</b>' +
            (a.promo ? ' <span style="color:var(--s600)">(было ' + C.money(a.baseTotal) + ')</span>' : '') + '</div>' +
          '<div class="app-meta">' + a.items.map(function(i){ return i.name + ' (' + i.qty + ' ' + pluralUnit(i.unitWord || '', i.qty) + ')'; }).join(', ') + '</div>' +
          (a.comment ? '<div class="app-meta" style="margin-top:5px;color:var(--ink2)">«' + a.comment + '»</div>' : '') +
          (a.note ? '<div class="app-meta" style="margin-top:5px;color:var(--s700)">Ответ оператора: ' + a.note + '</div>' : '') +
          '</div>';
      });
      html += '</div>';
    }
    if (promos.length){
      html += '<h4 style="margin:22px 0 12px">Ваши бонусы (' + promos.length + ')</h4>';
      promos.forEach(function(pr){
        var applied = pr.used;
        html += '<div class="app-item" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">' +
          '<div><b style="color:var(--s700)">' + pr.title + '</b>' +
          '<div class="app-meta">' + (pr.scope === 'next' ? 'Сработает на следующем заказе автоматически' : 'Применена к вашему заказу') + ' · ' + C.fmtDate(pr.createdAt) + '</div></div>' +
          '<span class="st ' + (applied ? 'st-done' : 'st-work') + '">' + (applied ? 'использована' : 'активна') + '</span>' +
          '</div>';
      });
    }
    out.innerHTML = html;
  }

  var cabBtn = $('#cabBtn');
  if (cabBtn) cabBtn.addEventListener('click', function(){ showCabinet(C.phoneFull($('#cabPhone'))); });

  /* автозагрузка под сохранённым номером */
  try {
    var me = localStorage.getItem('chistulya_me');
    if (me && $('#cabPhone')) {
      var d = me.replace(/\D/g,'').replace(/^375/,'');
      $('#cabPhone').value = '(' + d.slice(0,2) + ') ' + d.slice(2,5) + '-' + d.slice(5,7) + '-' + d.slice(7,9);
      showCabinet(me);
    }
  } catch(err){}

  /* ================= РЕЖИМ РЕДАКТИРОВАНИЯ ?edit=ID ================= */
  var editingId = null, editingOldPhone = '';
  try {
    var sp = new URLSearchParams(location.search);
    var editId = sp.get('edit');
    if (editId) {
      var old = C.getApp(editId);
      if (old) {
        editingId = editId;
        editingOldPhone = old.phone || '';
        /* восстанавливаем выбор услуг */
        old.items.forEach(function(i){ if (svc(i.serviceId)) picked[i.serviceId] = i.qty; });
        /* запоминаем метраж, чтобы другие м²-поля подхватили */
        var m2item = old.items.filter(function(i){ return svc(i.serviceId) && svc(i.serviceId).unit === 'm2'; })[0];
        if (m2item) lastM2 = m2item.qty;
        /* контакты */
        if ($('#fName')) $('#fName').value = old.name || '';
        if ($('#fPhone')) {
          var pd = String(old.phone||'').replace(/\D/g,'').replace(/^375/,'');
          $('#fPhone').value = '(' + pd.slice(0,2) + ') ' + pd.slice(2,5) + '-' + pd.slice(5,7) + '-' + pd.slice(7,9);
        }
        if ($('#fComment')) $('#fComment').value = old.comment || '';
        /* способ связи */
        var pref = old.contactPref || 'Telegram';
        var ri = document.querySelector('input[name="contact"][value="' + pref + '"]');
        if (ri) {
          $$('#contactOpts .copt').forEach(function(l){ l.classList.remove('on'); });
          ri.closest('.copt').classList.add('on');
          ri.checked = true;
        }
        /* фото */
        photoData = old.photo || null;
        photoName = old.photo ? 'photo.jpg' : '';
        if (photoData) renderPhoto();
        toast('Заявка открыта для редактирования');
      }
    }
  } catch(err){}

  /* =======================================================
     БРЕНДИНГ: подставляем данные из config.js
     ======================================================= */
  (function(){
    var CFG = global.CONFIG || {};
    function set(id, val){ var el = document.getElementById(id); if (el && val) el.textContent = val; }
    function setAll(sel, val){
      if (!val) return;
      Array.prototype.slice.call(document.querySelectorAll(sel)).forEach(function(el){ el.textContent = val; });
    }
    function href(id, val){ var el = document.getElementById(id); if (el && val) el.setAttribute('href', val); }

    /* --- телефон: все tel:-ссылки на странице --- */
    if (CFG.PHONE){
      var tel = String(CFG.PHONE).replace(/[^\d+]/g, '');
      href('fPhoneLink', 'tel:' + tel);
      set('fPhoneLink', CFG.PHONE_HUMAN || CFG.PHONE);
      set('cPhone', CFG.PHONE_HUMAN || CFG.PHONE);
      var fb = document.getElementById('fPhoneBtn');
      if (fb){ fb.setAttribute('href', 'tel:' + tel); fb.textContent = CFG.PHONE_HUMAN || CFG.PHONE; }
      Array.prototype.slice.call(document.querySelectorAll('a[href^="tel:"], a[href^="tel%3A"]')).forEach(function(a){
        a.setAttribute('href', 'tel:' + tel);
      });
    }
    /* --- telegram --- */
    if (CFG.TELEGRAM){
      var tg = String(CFG.TELEGRAM).replace(/^@/, '');
      href('fTelegram', 'https://t.me/' + tg);
      set('fTelegram', '@' + tg);
      Array.prototype.slice.call(document.querySelectorAll('a[href*="t.me/"]')).forEach(function(a){
        a.setAttribute('href', 'https://t.me/' + tg);
        var nm = a.textContent.trim();
        if (nm.charAt(0) !== '@') a.textContent = '@' + tg;
      });
    }
    /* --- реквизиты --- */
    set('fAddress', CFG.ADDRESS);
    set('cAddress', CFG.ADDRESS);
    set('cLegal', CFG.LEGAL);
    set('fLegal', (CFG.LEGAL || '') + (CFG.INN ? ' · УНП ' + CFG.INN : ''));
    setAll('.fHours', CFG.HOURS);
    set('fCity', CFG.CITY ? CFG.CITY : '');
    if (CFG.AREA){
      var ha = document.getElementById('heroArea');
      if (ha) ha.textContent = CFG.AREA;
    }

    /* --- название компании в логотипах и заголовке --- */
    if (CFG.COMPANY){
      set('fCopyright', '© ' + new Date().getFullYear() + ' ' + CFG.COMPANY);
      var logos = document.querySelectorAll('.logo');
      Array.prototype.slice.call(logos).forEach(function(l){
        var t = l.textContent.trim();
        if (t === 'ЧИСТЮЛЯ') l.childNodes[l.childNodes.length - 1].nodeValue = ' ' + CFG.COMPANY;
      });
      var ttl = document.title;
      if (ttl.indexOf('ЧИСТЮЛЯ') >= 0) document.title = ttl.split('ЧИСТЮЛЯ').join(CFG.COMPANY);
      Array.prototype.slice.call(document.querySelectorAll('[data-company]')).forEach(function(el){
        el.textContent = CFG.COMPANY;
      });
    }
    /* --- SEO: заголовок и описание страницы --- */
    if (CFG.TITLE) document.title = CFG.TITLE;
    if (CFG.DESCRIPTION){
      var md = document.querySelector('meta[name="description"]');
      if (md) md.setAttribute('content', CFG.DESCRIPTION);
      var ogd = document.querySelector('meta[property="og:description"]');
      if (ogd) ogd.setAttribute('content', CFG.DESCRIPTION);
    }
    if (CFG.KEYWORDS){
      var mk = document.querySelector('meta[name="keywords"]');
      if (mk) mk.setAttribute('content', CFG.KEYWORDS);
      else {
        mk = document.createElement('meta');
        mk.setAttribute('name', 'keywords');
        mk.setAttribute('content', CFG.KEYWORDS);
        document.head.appendChild(mk);
      }
    }
    if (CFG.SITE_URL){
        var baseUrl = CFG.SITE_URL.replace(/\/$/, '');
        var can = document.querySelector('link[rel="canonical"]');
        if (can) can.setAttribute('href', baseUrl + '/');
        var og = document.querySelector('meta[property="og:url"]');
        if (og) og.setAttribute('content', baseUrl + '/');
        var ogi = document.querySelector('meta[property="og:image"]');
        if (ogi) ogi.setAttribute('content', baseUrl + '/og-cover.png');
        var twi = document.querySelector('meta[name="twitter:image"]');
        if (twi) twi.setAttribute('content', baseUrl + '/og-cover.png');
    }

    /* --- показывать/прятать вход оператора --- */
    if (CFG.SHOW_OPERATOR_LINK === false){
      var d = document.getElementById('opDot'), l2 = document.getElementById('opLink');
      if (d) d.style.display = 'none';
      if (l2) l2.style.display = 'none';
    }
  })();

  /* =======================================================
     ОТПРАВКА ЗАЯВКИ ОПЕРАТОРУ (необязательно)
     Работает бесплатно и без карт:
       • Telegram-бот  — заявка падает в чат/канал (CONFIG.TG_BOT_TOKEN)
       • Любой endpoint — Formspree / Web3Forms / свой сервер (CONFIG.FORM_ENDPOINT)
     Если ничего не настроено — заявка остаётся в кабинете на этом устройстве.
     ======================================================= */
  function leadPayload(app){
    return {
      name: app.name,
      phone: app.phone,
      comment: app.comment || '',
      contact: app.contactPref || 'Telegram',
      services: app.items.map(function(i){ return i.name + ' × ' + i.qty; }).join(', '),
      total: app.total,
      baseTotal: app.baseTotal,
      promo: app.promo ? (app.promo.title + ' (−' + app.promo.percent + '%)') : '',
      createdAt: app.createdAt,
      source: 'сайт'
    };
  }
  function sendToTelegram(app){
    var CFG = global.CONFIG || {};
    if (!CFG.TG_BOT_TOKEN || !CFG.TG_CHAT_ID) return Promise.resolve(false);
    var p = leadPayload(app);
    var text =
      'Новая заявка с сайта ' + (CFG.SITE_URL || '') + '\n\n' +
      'Клиент: ' + p.name + '\n' +
      'Телефон: ' + p.phone + '\n' +
      'Связь: ' + p.contact + '\n' +
      'Услуги: ' + p.services + '\n' +
      'Сумма: ' + money(p.total) + (p.promo ? ' (скидка ' + p.promo + ')' : '') + '\n' +
      (p.comment ? 'Комментарий: ' + p.comment : '');

    var base = 'https://api.telegram.org/bot' + CFG.TG_BOT_TOKEN + '/';

    /* с фото объекта — отправляем картинку, оператор видит объект сразу */
    if (app.photo && String(app.photo).indexOf('data:') === 0){
      try {
        var fd = new FormData();
        fd.append('chat_id', CFG.TG_CHAT_ID);
        fd.append('caption', text);
        var b64 = String(app.photo).split(',')[1] || '';
        var bin = atob(b64);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        fd.append('photo', new Blob([arr], { type: 'image/jpeg' }), 'object.jpg');
        return fetch(base + 'sendPhoto', { method: 'POST', body: fd })
          .then(function(r){ return r.ok; })
          .catch(function(){ return sendToTelegramText(base, CFG, text); });
      } catch (err){
        return sendToTelegramText(base, CFG, text);
      }
    }
    return sendToTelegramText(base, CFG, text);
  }
  function sendToTelegramText(base, CFG, text){
    return fetch(base + 'sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CFG.TG_CHAT_ID, text: text })
    }).then(function(r){ return r.ok; }).catch(function(){ return false; });
  }
  function sendToEndpoint(app){
    var CFG = global.CONFIG || {};
    if (!CFG.FORM_ENDPOINT) return Promise.resolve(false);
    var fd = new FormData();
    var p = leadPayload(app);
    Object.keys(p).forEach(function(k){ fd.append(k, p[k]); });
    if (app.photo) fd.append('photo', app.photo);
    return fetch(CFG.FORM_ENDPOINT, { method:'POST', body: fd })
      .then(function(r){ return r.ok; })
      .catch(function(){ return false; });
  }
  function deliverLead(app){
    return Promise.all([sendToEndpoint(app), sendToTelegram(app)])
      .then(function(res){ return res[0] || res[1]; });
  }

  /* ---- Плавная прокрутка ---- */
  $$('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var href = a.getAttribute('href');
      if (href && href !== '#') {
        var t = document.querySelector(href);
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior:'smooth', block:'start' }); }
      }
    });
  });

  /* ---- Старт ---- */
  buildToolbar();
  buildGallery();
  renderAll();
  }

  /* =======================================================
     ЧАСТЬ 3 — ВХОД ОПЕРАТОРА (работает на любой странице)
     ======================================================= */
  function openOperatorLogin(){
    if (document.getElementById('opLogin')) return;
    var CFG = global.CONFIG || {};
    var wrap = document.createElement('div');
    wrap.id = 'opLogin';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(8,47,73,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center';
    wrap.innerHTML =
      '<div style="background:#fff;border-radius:18px;padding:26px 28px;width:min(340px,90vw);box-shadow:0 30px 70px -20px rgba(0,0,0,.5);text-align:center">' +
        '<div style="font-weight:800;color:var(--s800);font-size:17px;margin-bottom:4px">Вход оператора</div>' +
        '<div style="color:var(--muted);font-size:13px;margin-bottom:16px">Введите PIN-код</div>' +
        '<input id="opPin" type="password" inputmode="numeric" maxlength="6" placeholder="••••" ' +
          'style="width:100%;text-align:center;letter-spacing:.4em;font-size:20px;padding:12px;border:2px solid var(--s200);border-radius:13px;font-family:inherit;outline:none">' +
        '<div id="opErr" style="color:#dc2626;font-size:13px;min-height:20px;margin-top:8px"></div>' +
        '<div style="color:var(--muted);font-size:12px;margin:2px 0 10px">Демо-доступ: PIN <b style="color:var(--s600)">1432</b></div>' +
        '<div style="display:flex;gap:8px;margin-top:6px">' +
          '<button id="opCancel" style="flex:1;border:2px solid var(--line);background:#fff;border-radius:12px;padding:11px;font-family:inherit;font-weight:700;cursor:pointer">Отмена</button>' +
          '<button id="opOk" style="flex:1;border:none;background:var(--s500);color:#fff;border-radius:12px;padding:11px;font-family:inherit;font-weight:700;cursor:pointer">Войти</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    var pin = wrap.querySelector('#opPin');
    var err = wrap.querySelector('#opErr');
    function close(){ if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }
    function tryIn(){
      if (pin.value.trim() === String(CFG.ADMIN_PIN || '1432')){ location.href = 'admin.html'; return; }
      err.textContent = 'Неверный PIN';
      pin.value = '';
      pin.focus();
    }
    wrap.querySelector('#opOk').addEventListener('click', tryIn);
    wrap.querySelector('#opCancel').addEventListener('click', close);
    wrap.addEventListener('click', function(e){ if (e.target === wrap) close(); });
    pin.addEventListener('keydown', function(e){ if (e.key === 'Enter') tryIn(); });
    pin.focus();
  }
  var opDot = document.getElementById('opDot');
  if (opDot) opDot.setAttribute('aria-label', 'Вход для персонала (PIN 1432)');
  if (opDot) opDot.addEventListener('click', openOperatorLogin);
  var opLink = document.getElementById('opLink');
  if (opLink) opLink.setAttribute('aria-label', 'Вход для персонала (PIN 1432)');
  if (opLink) opLink.addEventListener('click', function (e) { e.preventDefault(); openOperatorLogin(); });
})(window);
