// PhysioLearn — team submissions → Google Drive
// Paste into script.google.com (new project), then Deploy → New deployment → Web app
// (Execute as: Me · Who has access: Anyone). Send the /exec URL to Claude.

var TEAM_CODE = 'physio2026';                         // team code — change it if you want
var ROOT = 'PhysioLearn - مساهمات الفريق';             // main folder in your Drive

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (String(d.code || '').trim() !== TEAM_CODE) return out_({ ok: false, error: 'bad_code' });
    if (d.action === 'chunk') return chunk_(d);
    var TYPE_FOLDER = { 'ملخص': 'الملخصات', 'محاضرة': 'المحاضرات', 'أسئلة اختبار': 'أسئلة الاختبارات' };
    // the lock is held only while folders are found/created (a few seconds), never during the upload itself
    var root, f;
    withLock_(function () {
      root = folder_(DriveApp.getRootFolder(), ROOT); f = root;
      [d.inst_name, d.year_name, d.sem_name, d.subject_name].forEach(function (n) { if (n) f = folder_(f, clean_(n)); });
      if (d.topic) f = folder_(f, clean_(d.topic));
      if (d.kind_name) f = folder_(f, TYPE_FOLDER[d.kind_name] || clean_(d.kind_name));
    });
    var stamp = Utilities.formatDate(new Date(), 'Asia/Muscat', 'yyyy-MM-dd HH.mm');
    var base = clean_(d.title) + ' - ' + clean_(d.contributor) + ' - ' + stamp, links = [];
    if (d.action === 'init') return init_(d, f, root, base);
    if (d.fileB64) {
      var ext = (String(d.file_name || '').match(/\.[A-Za-z0-9]{1,5}$/) || [''])[0];
      var blob = Utilities.newBlob(Utilities.base64Decode(d.fileB64), d.mime || 'application/octet-stream', base + ext);
      var file = retry_(function () { return f.createFile(blob); });
      try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e1) {}
      links.push(file.getUrl());
    }
    if (d.content) {
      var txt = 'العنوان: ' + d.title + '\nالمرسل: ' + d.contributor + '\nالمكان: ' + [d.inst_name, d.year_name, d.sem_name, d.subject_name, d.topic].filter(String).join(' / ') +
        '\nالنوع: ' + (d.kind_name || '') + (d.notes ? '\nملاحظات: ' + d.notes : '') + '\n\n' + d.content;
      links.push(retry_(function () { return f.createFile(base + '.txt', txt, MimeType.PLAIN_TEXT); }).getUrl());
    }
    // the file is already saved; a failure in the log sheet must not turn into an error for the sender
    try { withLock_(function () { log_(root, [new Date(), d.contributor, d.inst_name, d.year_name, d.sem_name, d.subject_name, d.topic || '', d.kind_name || '', d.title, d.notes || '', links.join('\n')]); }); } catch (e2) { console.error('log failed: ' + e2); }
    return out_({ ok: true });
  } catch (err) {
    console.error(err);
    return out_({ ok: false, error: String(err) });
  }
}
// short lock with retries, so several people uploading at once wait their turn instead of failing
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  for (var i = 0; i < 6; i++) {
    if (lock.tryLock(5000)) { try { return fn(); } finally { lock.releaseLock(); } }
    Utilities.sleep(1000 + Math.random() * 1500);
  }
  throw new Error('busy: try again');
}
// retry temporary Google errors (Service error / timeouts) up to 3 times
function retry_(fn) {
  for (var i = 0; ; i++) {
    try { return fn(); } catch (err) { if (i >= 2) throw err; Utilities.sleep(1500 * (i + 1)); }
  }
}
// ---- large files: the browser sends 8 MB pieces, the script forwards them to a Drive resumable upload ----
function init_(d, f, root, base) {
  var ext = (String(d.file_name || '').match(/\.[A-Za-z0-9]{1,5}$/) || [''])[0], mime = d.mime || 'application/octet-stream';
  var res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink', {
    method: 'post', contentType: 'application/json; charset=UTF-8', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(d.size) },
    payload: JSON.stringify({ name: base + ext, parents: [f.getId()], mimeType: mime })
  });
  var loc = res.getHeaders()['Location'] || res.getHeaders()['location'];
  if (!loc) return out_({ ok: false, error: 'init ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200) });
  var links = [];
  if (d.content) {
    var txt = 'العنوان: ' + d.title + '\nالمرسل: ' + d.contributor + '\nالنوع: ' + (d.kind_name || '') + (d.notes ? '\nملاحظات: ' + d.notes : '') + '\n\n' + d.content;
    links.push(f.createFile(base + '.txt', txt, MimeType.PLAIN_TEXT).getUrl());
  }
  var key = Utilities.getUuid();
  CacheService.getScriptCache().put('up_' + key, JSON.stringify({ url: loc, root: root.getId(), links: links,
    row: [d.contributor, d.inst_name, d.year_name, d.sem_name, d.subject_name, d.topic || '', d.kind_name || '', d.title, d.notes || ''] }), 21600);
  return out_({ ok: true, key: key });
}
function chunk_(d) {
  var raw = CacheService.getScriptCache().get('up_' + d.key);
  if (!raw) return out_({ ok: false, error: 'upload expired, send again' });
  var s = JSON.parse(raw), bytes = Utilities.base64Decode(d.b64), start = Number(d.start), end = start + bytes.length - 1;
  var res = retry_(function () {
    var r = UrlFetchApp.fetch(s.url, { method: 'put', payload: bytes, contentType: 'application/octet-stream', muteHttpExceptions: true,
      headers: { 'Content-Range': 'bytes ' + start + '-' + end + '/' + d.total } });
    if (r.getResponseCode() >= 500) throw new Error('drive ' + r.getResponseCode());
    return r;
  });
  var code = res.getResponseCode();
  if (code === 308) return out_({ ok: true, done: false });
  if (code !== 200 && code !== 201) return out_({ ok: false, error: 'chunk ' + code + ' ' + res.getContentText().slice(0, 200) });
  var id = JSON.parse(res.getContentText()).id, file = DriveApp.getFileById(id);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e1) {}
  var links = [file.getUrl()].concat(s.links), root = DriveApp.getFolderById(s.root);
  try { withLock_(function () { log_(root, [new Date()].concat(s.row).concat([links.join('\n')])); }); } catch (e2) { console.error('log failed: ' + e2); }
  CacheService.getScriptCache().remove('up_' + d.key);
  return out_({ ok: true, done: true });
}
function doGet() { return out_({ ok: true, service: 'PhysioLearn submissions' }); }
function folder_(parent, name) { var it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
function clean_(s) { return String(s || '').replace(/[\\\/:*?"<>|#%]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'بدون'; }
function log_(root, row) {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('SHEET'), ss = null;
  try { if (id) ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  if (!ss) {
    ss = SpreadsheetApp.create('سجل مساهمات PhysioLearn');
    DriveApp.getFileById(ss.getId()).moveTo(root);
    props.setProperty('SHEET', ss.getId());
    ss.getSheets()[0].appendRow(['التاريخ', 'المرسل', 'الجهة', 'السنة', 'الفصل', 'المادة', 'الموضوع', 'النوع', 'العنوان', 'ملاحظات', 'روابط الملفات']);
    ss.getSheets()[0].setRightToLeft(true);
  }
  ss.getSheets()[0].appendRow(row);
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
// Run once from the editor (▶ setup) to grant Drive/Sheets permission before deploying.
function setup() { folder_(DriveApp.getRootFolder(), ROOT); UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/about?fields=user', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }); }
