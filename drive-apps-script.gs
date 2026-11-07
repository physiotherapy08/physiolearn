// PhysioLearn — team submissions → Google Drive
// Paste into script.google.com (new project), then Deploy → New deployment → Web app
// (Execute as: Me · Who has access: Anyone). Send the /exec URL to Claude.

var TEAM_CODE = 'physio2026';                         // team code — change it if you want
var ROOT = 'PhysioLearn - مساهمات الفريق';             // main folder in your Drive

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (String(d.code || '').trim() !== TEAM_CODE) return out_({ ok: false, error: 'bad_code' });
    var root = folder_(DriveApp.getRootFolder(), ROOT), f = root;
    [d.inst_name, d.year_name, d.sem_name, d.subject_name].forEach(function (n) { if (n) f = folder_(f, clean_(n)); });
    if (d.topic) f = folder_(f, clean_(d.topic));
    var stamp = Utilities.formatDate(new Date(), 'Asia/Muscat', 'yyyy-MM-dd HH.mm');
    var base = clean_(d.title) + ' - ' + clean_(d.contributor) + ' - ' + stamp, links = [];
    if (d.fileB64) {
      var ext = (String(d.file_name || '').match(/\.[A-Za-z0-9]{1,5}$/) || [''])[0];
      var blob = Utilities.newBlob(Utilities.base64Decode(d.fileB64), d.mime || 'application/octet-stream', base + ext);
      links.push(f.createFile(blob).getUrl());
    }
    if (d.content) {
      var txt = 'العنوان: ' + d.title + '\nالمرسل: ' + d.contributor + '\nالمكان: ' + [d.inst_name, d.year_name, d.sem_name, d.subject_name, d.topic].filter(String).join(' / ') +
        '\nالنوع: ' + (d.kind_name || '') + (d.notes ? '\nملاحظات: ' + d.notes : '') + '\n\n' + d.content;
      links.push(f.createFile(base + '.txt', txt, MimeType.PLAIN_TEXT).getUrl());
    }
    log_(root, [new Date(), d.contributor, d.inst_name, d.year_name, d.sem_name, d.subject_name, d.topic || '', d.kind_name || '', d.title, d.notes || '', links.join('\n')]);
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
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
function setup() { folder_(DriveApp.getRootFolder(), ROOT); }
