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

  // ---------- admin sign-in: open the link with #admin ----------
  function loginCard() {
    if (document.getElementById('pl-login')) return;
    var w = document.createElement('div');
    w.id = 'pl-login';
    w.setAttribute('dir', 'rtl');
    w.innerHTML =
      '<style>#pl-login{position:fixed;inset:0;z-index:99999;background:rgba(18,48,59,.45);display:flex;align-items:center;justify-content:center;padding:16px;font-family:"IBM Plex Sans Arabic",system-ui,sans-serif}' +
      '#pl-login form{background:#fff;color:#12303B;width:100%;max-width:360px;border-radius:20px;padding:24px;display:flex;flex-direction:column;gap:12px;box-shadow:0 20px 60px rgba(0,0,0,.25)}' +
      '#pl-login h2{margin:0 0 4px;font-size:20px}#pl-login p{margin:0;color:#4A616B;font-size:14px}' +
      '#pl-login input{height:46px;border:1px solid #DCE4E5;border-radius:12px;padding:0 14px;font-size:16px;direction:ltr;text-align:left}' +
      '#pl-login button{height:46px;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer}' +
      '#pl-login .go{background:#0F7F7A;color:#fff}#pl-login .x{background:#EAF0F0;color:#12303B}#pl-login .err{color:#B42318;font-size:14px;min-height:18px}</style>' +
      '<form><h2>دخول الإدارة</h2><p>للمسؤول فقط. الطلاب لا يحتاجون تسجيل دخول.</p>' +
      '<input id="pl-email" type="email" autocomplete="username" placeholder="Email" required>' +
      '<input id="pl-pass" type="password" autocomplete="current-password" placeholder="Password" required>' +
      '<div class="err" id="pl-err"></div>' +
      '<button class="go" type="submit">دخول</button><button class="x" type="button">إلغاء</button></form>';
    document.body.appendChild(w);
    var close = function () { w.remove(); history.replaceState(null, '', location.pathname); };
    w.querySelector('.x').onclick = close;
    w.querySelector('form').onsubmit = async function (e) {
      e.preventDefault();
      var err = document.getElementById('pl-err');
      err.textContent = '';
      var r = await sb.auth.signInWithPassword({
        email: document.getElementById('pl-email').value.trim(),
        password: document.getElementById('pl-pass').value
      });
      if (r.error) { err.textContent = 'الإيميل أو كلمة المرور غير صحيحة'; return; }
      history.replaceState(null, '', location.pathname);
      location.reload();
    };
  }
  async function route() {
    if (location.hash === '#admin') {
      if (await isAdmin()) { history.replaceState(null, '', location.pathname); return; }
      // wait until the app has replaced the loader page, or the card would be swept away
      var tryShow = function () { document.querySelector('[data-ns]') ? loginCard() : setTimeout(tryShow, 150); };
      tryShow();
    } else if (location.hash === '#logout') {
      await sb.auth.signOut();
      history.replaceState(null, '', location.pathname);
      location.reload();
    }
  }
  window.__plShowLogin = loginCard;
  window.__plLogout = async function () { await sb.auth.signOut(); location.reload(); };
  window.addEventListener('hashchange', route);
  route();
})();
