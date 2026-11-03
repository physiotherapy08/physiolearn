// PhysioLearn backend bridge: gives the app the same small db / user / assets
// interface it used on Claude, backed by Supabase (table `items`, bucket `files`).
(function () {
  var cfg = window.PL_CONFIG || {};
  if (!cfg.url || cfg.url.indexOf('http') !== 0 || !window.supabase) {
    console.warn('[PhysioLearn] Supabase is not configured yet');
    return;
  }
  var sb = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  window.__pl = sb;

  // ---------- shared content (live) ----------
  var cache = {}, subs = {}, loaded = false, loadErr = null;
  function bucket(col) { return cache[col] || (cache[col] = {}); }
  function snap(col) {
    var m = bucket(col);
    var docs = Object.keys(m).map(function (id) {
      return { id: id, exists: true, data: function () { return m[id]; }, metadata: {} };
    });
    return { docs: docs, size: docs.length, empty: !docs.length, docChanges: function () { return []; }, metadata: {} };
  }
  function emit(col) {
    (subs[col] || []).forEach(function (s) { try { s.next(snap(col)); } catch (e) { console.error(e); } });
  }
  function emitAll() { Object.keys(subs).forEach(emit); }

  async function loadAll() {
    try {
      var rows = [], from = 0, page = 1000;
      for (;;) {
        var r = await sb.from('items').select('col,id,data').range(from, from + page - 1);
        if (r.error) throw r.error;
        rows = rows.concat(r.data);
        if (r.data.length < page) break;
        from += page;
      }
      cache = {};
      rows.forEach(function (row) { bucket(row.col)[row.id] = row.data; });
      loaded = true; loadErr = null;
      emitAll();
    } catch (e) {
      console.error('[PhysioLearn] load failed', e);
      loadErr = e;
      if (!loaded) Object.keys(subs).forEach(function (col) {
        (subs[col] || []).forEach(function (s) { s.error && s.error(e); });
      });
    }
  }

  sb.channel('pl-items')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, function (p) {
      if (p.eventType === 'DELETE') {
        var o = p.old || {};
        if (o.col && o.id) { delete bucket(o.col)[o.id]; emit(o.col); }
      } else if (p.new && p.new.col) {
        bucket(p.new.col)[p.new.id] = p.new.data; emit(p.new.col);
      }
    })
    .subscribe(function (status) { if (status === 'SUBSCRIBED') loadAll(); });
  loadAll();
  // catch up after the phone sleeps or the app returns from background
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') loadAll();
  });

  var db = {
    collection: function (col) {
      return {
        onSnapshot: function (next, error) {
          var s = { next: next, error: error };
          (subs[col] || (subs[col] = [])).push(s);
          if (loaded) setTimeout(function () { next(snap(col)); }, 0);
          else if (loadErr && error) setTimeout(function () { error(loadErr); }, 0);
          return function () { subs[col] = (subs[col] || []).filter(function (x) { return x !== s; }); };
        }
      };
    },
    doc: function (path) {
      var parts = path.split('/'), col = parts[0], id = parts[1];
      return {
        id: id, path: path,
        set: async function (data) {
          bucket(col)[id] = data; emit(col);
          var r = await sb.from('items').upsert({ col: col, id: id, data: data, updated_at: new Date().toISOString() });
          if (r.error) { loadAll(); throw r.error; }
        },
        delete: async function () {
          delete bucket(col)[id]; emit(col);
          var r = await sb.from('items').delete().eq('col', col).eq('id', id);
          if (r.error) { loadAll(); throw r.error; }
        }
      };
    }
  };

  // ---------- admin identity ----------
  async function isAdmin() {
    var r = await sb.auth.getSession();
    var u = r && r.data && r.data.session && r.data.session.user;
    return !!(u && u.email && u.email.toLowerCase() === String(cfg.admin).toLowerCase());
  }
  var user = {
    canEdit: isAdmin,
    isOwner: isAdmin,
    can: async function () { return isAdmin(); }
  };

  // ---------- file uploads ----------
  var assets = {
    upload: async function (blob) {
      var name = (blob.name || 'file').replace(/[^A-Za-z0-9._-]+/g, '_').slice(-60);
      var path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + name;
      var r = await sb.storage.from('files').upload(path, blob, { contentType: blob.type || undefined, upsert: false });
      if (r.error) throw r.error;
      var url = sb.storage.from('files').getPublicUrl(path).data.publicUrl;
      return { id: path, url: url, sizeBytes: blob.size, contentType: blob.type };
    }
  };

  window.claude = {
    use: async function (name) {
      if (name === 'db') return db;
      if (name === 'user') return user;
      if (name === 'assets') return (await isAdmin()) ? assets : null;
      return null;
    }
  };

  // ---------- accounts: students and admin share one sign-in ----------
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var CSS = '<style>.pl-ov{position:fixed;inset:0;z-index:99999;background:rgba(18,48,59,.45);display:flex;align-items:center;justify-content:center;padding:16px;font-family:"IBM Plex Sans Arabic",system-ui,sans-serif;color:#12303B}' +
    '.pl-card{background:#fff;width:100%;max-width:380px;border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);max-height:calc(100% - 32px);overflow:auto}' +
    '.pl-card h2{margin:0;font-size:20px}.pl-card p{margin:0;color:#4A616B;font-size:14px;line-height:1.6}' +
    '.pl-tabs{display:flex;gap:4px;padding:4px;border-radius:12px;background:#EAF0F0}.pl-tabs button{flex:1;height:38px;border:none;border-radius:9px;background:transparent;font:inherit;font-weight:700;color:#4A616B;cursor:pointer}.pl-tabs button.on{background:#fff;color:#12303B;box-shadow:0 1px 3px rgba(0,0,0,.08)}' +
    '.pl-card input{height:46px;border:1px solid #DCE4E5;border-radius:12px;padding:0 14px;font:inherit;font-size:16px;width:100%;box-sizing:border-box}.pl-card input.ltr{direction:ltr;text-align:left}.pl-card input:focus{outline:2px solid #0F7F7A;border-color:transparent}' +
    '.pl-go{height:46px;border:none;border-radius:12px;font:inherit;font-size:16px;font-weight:700;cursor:pointer;background:#0F7F7A;color:#fff}.pl-go:disabled{opacity:.6}' +
    '.pl-x{height:42px;border:none;border-radius:12px;font:inherit;font-weight:700;cursor:pointer;background:#EAF0F0;color:#12303B}' +
    '.pl-link{background:none;border:none;color:#0F7F7A;font:inherit;font-size:13.5px;cursor:pointer;padding:0;align-self:flex-start}' +
    '.pl-msg{font-size:14px;min-height:18px;line-height:1.5}.pl-msg.err{color:#B42318}.pl-msg.ok{color:#0B5F5B}</style>';

  function overlay(id, html) {
    var old = document.getElementById(id); if (old) old.remove();
    var w = document.createElement('div');
    w.id = id; w.className = 'pl-ov'; w.setAttribute('dir', 'rtl');
    w.innerHTML = CSS + html;
    w.addEventListener('click', function (e) { if (e.target === w) w.remove(); });
    document.body.appendChild(w);
    return w;
  }

  function loginCard(startTab) {
    var tab = startTab || 'in';
    var w = overlay('pl-login',
      '<form class="pl-card" novalidate><h2>حسابك في PhysioLearn</h2>' +
      '<div class="pl-tabs"><button type="button" data-t="in">تسجيل الدخول</button><button type="button" data-t="up">حساب جديد</button></div>' +
      '<p id="pl-sub"></p>' +
      '<input id="pl-name" type="text" autocomplete="name" placeholder="الاسم الكامل">' +
      '<input id="pl-email" class="ltr" type="email" autocomplete="email" placeholder="Email" inputmode="email">' +
      '<input id="pl-pass" class="ltr" type="password" placeholder="Password">' +
      '<button type="button" class="pl-link" id="pl-forgot">نسيت كلمة المرور؟</button>' +
      '<div class="pl-msg" id="pl-msg"></div>' +
      '<button class="pl-go" id="pl-go" type="submit"></button><button class="pl-x" type="button" id="pl-close">إلغاء</button></form>');
    var $ = function (id) { return w.querySelector('#' + id); };
    function paint() {
      w.querySelectorAll('.pl-tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === tab); });
      var up = tab === 'up';
      $('pl-name').hidden = !up; $('pl-forgot').hidden = up;
      $('pl-pass').setAttribute('autocomplete', up ? 'new-password' : 'current-password');
      $('pl-sub').textContent = up ? 'سجّل مرة واحدة، ويُحفظ تقدّمك ونتائج اختباراتك في حسابك.' : 'ادخل بإيميلك وكلمة المرور.';
      $('pl-go').textContent = up ? 'إنشاء الحساب' : 'دخول';
      msg('');
    }
    function msg(t, ok) { var m = $('pl-msg'); m.textContent = t; m.className = 'pl-msg ' + (ok ? 'ok' : 'err'); }
    w.querySelectorAll('.pl-tabs button').forEach(function (b) { b.onclick = function () { tab = b.dataset.t; paint(); }; });
    $('pl-close').onclick = function () { w.remove(); if (location.hash) history.replaceState(null, '', location.pathname); };
    $('pl-forgot').onclick = async function () {
      var email = $('pl-email').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) return msg('اكتب إيميلك أولاً، ثم اضغط «نسيت كلمة المرور؟»');
      var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (r.error) return msg('تعذّر الإرسال الآن، حاول بعد قليل.');
      msg('أرسلنا رابط تغيير كلمة المرور إلى إيميلك.', true);
    };
    w.querySelector('form').onsubmit = async function (e) {
      e.preventDefault();
      var name = $('pl-name').value.trim(), email = $('pl-email').value.trim(), pass = $('pl-pass').value;
      if (tab === 'up' && name.length < 2) return msg('اكتب اسمك.');
      if (!/^\S+@\S+\.\S+$/.test(email)) return msg('اكتب إيميلاً صحيحاً.');
      if (pass.length < 6) return msg('كلمة المرور 6 أحرف على الأقل.');
      var go = $('pl-go'); go.disabled = true;
      var r;
      if (tab === 'up') {
        r = await sb.auth.signUp({ email: email, password: pass, options: { data: { name: name }, emailRedirectTo: location.origin + location.pathname } });
        go.disabled = false;
        if (r.error) {
          return msg(/registered|exists/i.test(r.error.message) ? 'هذا الإيميل مسجّل من قبل. اختر «تسجيل الدخول».' : 'تعذّر إنشاء الحساب: ' + r.error.message);
        }
        if (!r.data.session) return msg('أرسلنا رسالة تأكيد إلى إيميلك. افتحها ثم سجّل الدخول.', true);
      } else {
        r = await sb.auth.signInWithPassword({ email: email, password: pass });
        go.disabled = false;
        if (r.error) {
          return msg(/confirm/i.test(r.error.message) ? 'أكّد إيميلك أولاً من الرسالة التي وصلتك.' : 'الإيميل أو كلمة المرور غير صحيحة.');
        }
      }
      if (location.hash) history.replaceState(null, '', location.pathname);
      location.reload();
    };
    paint();
  }

  function newPasswordCard() {
    var w = overlay('pl-login',
      '<form class="pl-card"><h2>كلمة مرور جديدة</h2><p>اكتب كلمة المرور الجديدة لحسابك.</p>' +
      '<input id="pl-np" class="ltr" type="password" autocomplete="new-password" placeholder="New password">' +
      '<div class="pl-msg" id="pl-msg"></div><button class="pl-go" type="submit">حفظ</button></form>');
    w.querySelector('form').onsubmit = async function (e) {
      e.preventDefault();
      var p = w.querySelector('#pl-np').value, m = w.querySelector('#pl-msg');
      if (p.length < 6) { m.className = 'pl-msg err'; m.textContent = 'كلمة المرور 6 أحرف على الأقل.'; return; }
      var r = await sb.auth.updateUser({ password: p });
      if (r.error) { m.className = 'pl-msg err'; m.textContent = 'تعذّر الحفظ، حاول مرة أخرى.'; return; }
      history.replaceState(null, '', location.pathname); location.reload();
    };
  }

  // ---------- progress sync ----------
  var me = null, lastSent = '', saveTimer = null, pending = null;
  async function publishAuth() {
    var r = await sb.auth.getSession();
    var u = r && r.data && r.data.session && r.data.session.user;
    if (!u) { me = null; window.__plAcct = null; window.dispatchEvent(new CustomEvent('pl-auth', { detail: null })); return; }
    var name = (u.user_metadata && u.user_metadata.name) || '';
    var progress = null;
    var q = await sb.from('progress').select('data,name').eq('user_id', u.id).maybeSingle();
    if (!q.error && q.data) { progress = q.data.data || null; lastSent = JSON.stringify(progress); if (!name) name = q.data.name || ''; }
    me = { id: u.id, email: u.email, name: name };
    window.__plAcct = { email: u.email, name: name, progress: progress };
    window.dispatchEvent(new CustomEvent('pl-auth', { detail: window.__plAcct }));
    if (pending) flush();
  }
  async function flush() {
    if (!me || !pending) return;
    var body = JSON.stringify(pending);
    if (body === lastSent) { pending = null; return; }
    var data = pending; pending = null;
    var r = await sb.from('progress').upsert({ user_id: me.id, email: me.email, name: me.name, data: data, updated_at: new Date().toISOString() });
    if (!r.error) lastSent = body; else console.warn('[PhysioLearn] progress save failed', r.error);
  }
  window.__plSaveProgress = function (p) {
    pending = p;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 1500);
  };
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { clearTimeout(saveTimer); flush(); } });
  sb.auth.onAuthStateChange(function (ev) {
    if (ev === 'PASSWORD_RECOVERY') {
      var t = function () { document.querySelector('[data-ns]') ? newPasswordCard() : setTimeout(t, 150); }; t();
    }
  });
  publishAuth();

  // ---------- admin: students' progress ----------
  async function progressPage() {
    var w = overlay('pl-prog', '<div class="pl-card" style="max-width:560px;height:calc(100% - 32px)"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><h2>تقدّم الطلاب</h2><button class="pl-x" id="pl-pc" style="height:36px;padding:0 14px">إغلاق</button></div><div id="pl-pb"><p>جارٍ التحميل…</p></div></div>');
    w.querySelector('#pl-pc').onclick = function () { w.remove(); };
    var r = await sb.from('progress').select('user_id,name,email,data,updated_at').order('updated_at', { ascending: false });
    var box = w.querySelector('#pl-pb');
    if (r.error) { box.innerHTML = '<p class="pl-msg err">تعذّر تحميل البيانات. تأكد أنك مسجّل بحساب المسؤول.</p>'; return; }
    var res = cache.resources || {};
    var rows = r.data || [], weekAgo = Date.now() - 7 * 864e5;
    var active = rows.filter(function (x) { return new Date(x.updated_at).getTime() > weekAgo; }).length;
    var allAtt = [].concat.apply([], rows.map(function (x) { return (x.data && x.data.attempts) || []; }));
    var avgAll = allAtt.length ? Math.round(allAtt.reduce(function (a, b) { return a + (b.pct || 0); }, 0) / allAtt.length) : 0;
    function fmt(d) { try { return new Date(d).toLocaleDateString('ar-OM', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
    var stat = function (v, l) { return '<div style="flex:1;min-width:0;padding:12px;border-radius:14px;background:#F2F6F6;text-align:center"><div style="font-size:22px;font-weight:800;font-variant-numeric:tabular-nums">' + v + '</div><div style="font-size:12px;color:#4A616B">' + l + '</div></div>'; };
    var html = '<div style="display:flex;gap:8px;margin-bottom:12px">' + stat(rows.length, 'طالب مسجّل') + stat(active, 'نشط هذا الأسبوع') + stat(avgAll + '%', 'متوسط الاختبارات') + '</div>' +
      '<input id="pl-ps" type="search" placeholder="ابحث بالاسم أو الإيميل" style="margin-bottom:10px">';
    if (!rows.length) html += '<p>لم يسجّل أي طالب بعد. عندما يسجّل الطلاب ويحلّون الاختبارات يظهر تقدّمهم هنا.</p>';
    html += '<div id="pl-pl" style="display:flex;flex-direction:column;gap:8px">' + rows.map(function (x) {
      var d = x.data || {}, at = d.attempts || [];
      var avg = at.length ? Math.round(at.reduce(function (a, b) { return a + (b.pct || 0); }, 0) / at.length) : null;
      var opened = new Set((d.recent || []).map(function (y) { return y.id; })).size;
      var list = at.slice().reverse().map(function (a) {
        var t = res[a.id] ? res[a.id].title : 'اختبار محذوف';
        var c = a.pct >= 80 ? '#0B7A52' : a.pct >= 50 ? '#9A6420' : '#B42318';
        return '<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid #EEF2F2;font-size:13.5px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t) + ' <span style="color:#7A8C93">· ' + fmt(a.at) + '</span></span><b style="color:' + c + ';font-variant-numeric:tabular-nums">' + a.pct + '% <span style="font-weight:500;color:#7A8C93">(' + a.correct + '/' + a.total + ')</span></b></div>';
      }).join('');
      return '<details data-k="' + esc((x.name + ' ' + x.email).toLowerCase()) + '" style="border:1px solid #DCE4E5;border-radius:14px;padding:12px 14px">' +
        '<summary style="list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px"><div style="flex:1;min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.name || 'بدون اسم') + '</div><div dir="ltr" style="font-size:12px;color:#4A616B;text-align:right;overflow:hidden;text-overflow:ellipsis">' + esc(x.email) + '</div></div>' +
        '<div style="text-align:center;flex:none"><div style="font-weight:800;font-variant-numeric:tabular-nums">' + (avg == null ? '—' : avg + '%') + '</div><div style="font-size:11px;color:#4A616B">' + at.length + ' اختبار</div></div></summary>' +
        '<div style="margin-top:10px;font-size:12.5px;color:#4A616B">فتح ' + opened + ' مورد · آخر نشاط ' + fmt(x.updated_at) + '</div>' +
        (list || '<div style="padding-top:8px;font-size:13.5px;color:#7A8C93">لم يحلّ أي اختبار بعد.</div>') + '</details>';
    }).join('') + '</div>';
    box.innerHTML = html;
    var s = box.querySelector('#pl-ps');
    if (s) s.oninput = function () { var q = s.value.trim().toLowerCase(); box.querySelectorAll('#pl-pl details').forEach(function (d) { d.hidden = q && d.dataset.k.indexOf(q) < 0; }); };
  }

  async function route() {
    if (location.hash === '#admin' || location.hash === '#login') {
      if (me) { history.replaceState(null, '', location.pathname); return; }
      // wait until the app has replaced the loader page, or the card would be swept away
      var tryShow = function () { document.querySelector('[data-ns]') ? loginCard('in') : setTimeout(tryShow, 150); };
      tryShow();
    } else if (location.hash === '#logout') {
      await window.__plLogout();
    }
  }
  window.__plShowLogin = function () { loginCard('in'); };
  window.__plShowProgress = progressPage;
  window.__plLogout = async function () {
    clearTimeout(saveTimer); await flush();
    await sb.auth.signOut();
    try { localStorage.removeItem('physiolearn.v1.me'); } catch (e) {}
    history.replaceState(null, '', location.pathname);
    location.reload();
  };
  window.addEventListener('hashchange', route);
  route();
})();
