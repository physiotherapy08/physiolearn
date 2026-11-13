// PhysioLearn — Google Form for team submissions
// 1) New project at script.google.com → paste this → choose "createForm" → ▶ Run → Allow.
// 2) Open the form link shown in the log → add ONE "File upload" question in the last section (see guide).
// Each new response: the uploaded files are moved into
//   PhysioLearn - مساهمات الفريق / الجهة / السنة / الفصل / المادة / النوع

var ROOT = 'PhysioLearn - مساهمات الفريق';
var YEARS = ['السنة الأولى', 'السنة الثانية', 'السنة الثالثة', 'السنة الرابعة', 'السنة الخامسة'];
var SEMS = ['الفصل الأول', 'الفصل الثاني', 'الفصل الثالث'];
var KINDS = ['ملخص', 'محاضرة', 'أسئلة اختبار'];
var TYPE_FOLDER = { 'ملخص': 'الملخصات', 'محاضرة': 'المحاضرات', 'أسئلة اختبار': 'أسئلة الاختبارات' };

function createForm() {
  var form = FormApp.create('PhysioLearn — إرسال الملخصات');
  form.setDescription('شارك ملخصك أو محاضرتك أو أسئلة الاختبار مع فريق PhysioLearn. الملفات تصل مباشرة إلى المشرف.')
    .setProgressBar(true).setConfirmationMessage('تم الإرسال، شكراً لمساهمتك 🌿').setAllowResponseEdits(false);

  form.addTextItem().setTitle('اسمك').setRequired(true);
  var inst = form.addMultipleChoiceItem().setTitle('الجهة').setRequired(true);

  var pOC = form.addPageBreakItem().setTitle('كلية عمان');
  form.addListItem().setTitle('السنة (كلية عمان)').setChoiceValues(YEARS.slice(0, 4)).setRequired(true);
  form.addListItem().setTitle('الفصل (كلية عمان)').setChoiceValues(SEMS.slice(0, 2)).setRequired(true);

  var pUOZ = form.addPageBreakItem().setTitle('جامعة نزوى');
  form.addListItem().setTitle('السنة (جامعة نزوى)').setChoiceValues(YEARS).setRequired(true);
  form.addListItem().setTitle('الفصل (جامعة نزوى)').setChoiceValues(SEMS).setRequired(true);

  var pDet = form.addPageBreakItem().setTitle('تفاصيل المحتوى');
  form.addTextItem().setTitle('المادة').setHelpText('مثال: Anatomy 1').setRequired(true);
  form.addTextItem().setTitle('الموضوع').setHelpText('اختياري: عنوان الوحدة أو الدرس');
  form.addMultipleChoiceItem().setTitle('نوع المحتوى').setChoiceValues(KINDS).setRequired(true);
  form.addTextItem().setTitle('العنوان').setRequired(true);
  form.addParagraphTextItem().setTitle('نص الملخص').setHelpText('اختياري: الصق النص هنا إذا لم يكن عندك ملف');
  form.addParagraphTextItem().setTitle('ملاحظات للمشرف');

  inst.setChoices([inst.createChoice('كلية عمان', pOC), inst.createChoice('جامعة نزوى', pUOZ)]);
  pUOZ.setGoToPage(pDet);         // the section before this break (Oman College) jumps to the details, skipping Nizwa

  var root = folder_(DriveApp.getRootFolder(), ROOT);
  var ss = SpreadsheetApp.create('ردود نموذج PhysioLearn');
  DriveApp.getFileById(ss.getId()).moveTo(root);
  DriveApp.getFileById(form.getId()).moveTo(root);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onFormSubmitMove').forForm(form).onFormSubmit().create();
  PropertiesService.getScriptProperties().setProperty('FORM', form.getId());

  Logger.log('رابط الطلاب: ' + form.getPublishedUrl());
  Logger.log('رابط التعديل: ' + form.getEditUrl());
}

// Moves the uploaded files of each response into the organised folders.
function onFormSubmitMove(e) {
  var a = {};
  e.response.getItemResponses().forEach(function (r) { a[r.getItem().getTitle()] = r.getResponse(); });
  var inst = a['الجهة'] || '';
  var year = a['السنة'] || a['السنة (كلية عمان)'] || a['السنة (جامعة نزوى)'] || '';
  var sem = a['الفصل'] || a['الفصل (كلية عمان)'] || a['الفصل (جامعة نزوى)'] || '';
  var subj = String(a['المادة'] || '');
  if (subj.indexOf('مادة غير موجودة') === 0) subj = 'مواد أخرى'; else subj = subj.split(' — ')[0];
  var f = folder_(DriveApp.getRootFolder(), ROOT);
  [inst, year, sem, subj, a['الموضوع']].forEach(function (n) { if (n) f = folder_(f, clean_(n)); });
  var kind = a['نوع المحتوى'];
  if (kind) f = folder_(f, TYPE_FOLDER[kind] || clean_(kind));
  var base = clean_(a['العنوان']) + ' - ' + clean_(a['اسمك']);
  e.response.getItemResponses().forEach(function (r) {
    if (r.getItem().getType() !== FormApp.ItemType.FILE_UPLOAD) return;
    [].concat(r.getResponse() || []).forEach(function (id, i) {
      try {
        var file = DriveApp.getFileById(id), ext = (file.getName().match(/\.[A-Za-z0-9]{1,5}$/) || [''])[0];
        file.moveTo(f); file.setName(base + (i ? ' (' + (i + 1) + ')' : '') + ext);
      } catch (err) { console.error(err); }
    });
  });
  if (a['نص الملخص']) f.createFile(base + '.txt', a['نص الملخص'], MimeType.PLAIN_TEXT);
}

// ---- cascading lists from the PhysioLearn app: الجهة → السنة → الفصل → المادة (only that semester's subjects) ----
var SB_URL = 'https://ogwqvnqkrcwhyqvbpeaf.supabase.co', SB_KEY = 'sb_publishable_TgRwBAhCAGzurE65vI5Fxg_3bFiI0TL';
var OTHER = 'مادة غير موجودة في القائمة (اكتب اسمها في الملاحظات)';
var INST = [['oc', 'كلية عمان'], ['uoz', 'جامعة نزوى']];
function form_() {
  var id = PropertiesService.getScriptProperties().getProperty('FORM');
  if (!id) ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'onFormSubmitMove') id = t.getTriggerSourceId(); });
  return FormApp.openById(id);
}
function tree_() {
  var rows = JSON.parse(UrlFetchApp.fetch(SB_URL + '/rest/v1/items?col=eq.nodes&select=id,data', { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } }).getContentText());
  var kids = {}; rows.forEach(function (r) { var p = r.data.parentId || 'root'; (kids[p] = kids[p] || []).push({ id: r.id, d: r.data }); });
  Object.keys(kids).forEach(function (k) { kids[k].sort(function (a, b) { return (a.d.at || 0) - (b.d.at || 0); }); });
  return INST.map(function (ins) {
    var years = (kids.root || []).filter(function (y) { return y.d.type === 'year' && (y.d.inst || 'oc') === ins[0]; });
    return { name: ins[1], years: years.map(function (y) {
      var sems = (kids[y.id] || []).filter(function (x) { return x.d.type === 'semester'; });
      return { name: y.d.name, sems: sems.map(function (sm) {
        return { name: sm.d.name, subjects: (kids[sm.id] || []).filter(function (x) { return x.d.type === 'subject'; }).map(function (x) { return x.d.name; }) };
      }) };
    }) };
  });
}
// Rebuilds everything above «تفاصيل المحتوى» (the details section and your File upload question are kept).
function buildLists() {
  var form = form_(), tree = tree_();
  var det = form.getItems(FormApp.ItemType.PAGE_BREAK).filter(function (p) { return p.getTitle() === 'تفاصيل المحتوى'; })[0].asPageBreakItem();
  var oldItems = form.getItems().slice(0, det.getIndex());
  // Google refuses to delete a section that a choice still jumps to, so clear all jumps first
  oldItems.forEach(function (it) {
    var t = it.getType();
    if (t === FormApp.ItemType.MULTIPLE_CHOICE) it.asMultipleChoiceItem().setChoiceValues(['-']);
    else if (t === FormApp.ItemType.LIST) it.asListItem().setChoiceValues(['-']);
    else if (t === FormApp.ItemType.PAGE_BREAK) it.asPageBreakItem().setGoToPage(FormApp.PageNavigationType.CONTINUE);
  });
  oldItems.reverse().forEach(function (it) { form.deleteItem(it); });
  form.getItems().filter(function (it) { return it.getTitle() === 'المادة'; }).forEach(function (it) { form.deleteItem(it); });
  var made = [];
  function put(it) { made.push(it); return it; }
  put(form.addTextItem().setTitle('اسمك').setRequired(true));
  var instQ = put(form.addMultipleChoiceItem().setTitle('الجهة').setRequired(true));
  var instChoices = [], subjBreaks = [];
  tree.forEach(function (ins) {
    var pYear = put(form.addPageBreakItem().setTitle(ins.name));
    var yearQ = put(form.addMultipleChoiceItem().setTitle('السنة').setRequired(true));
    instChoices.push(instQ.createChoice(ins.name, pYear));
    var yearChoices = [];
    ins.years.forEach(function (y) {
      var pSem = put(form.addPageBreakItem().setTitle(ins.name + ' · ' + y.name));
      var semQ = put(form.addMultipleChoiceItem().setTitle('الفصل').setRequired(true));
      yearChoices.push(yearQ.createChoice(y.name, pSem));
      var semChoices = [];
      y.sems.forEach(function (sm) {
        var pSub = put(form.addPageBreakItem().setTitle(ins.name + ' · ' + y.name + ' · ' + sm.name));
        subjBreaks.push(pSub);
        put(form.addListItem().setTitle('المادة').setRequired(true).setChoiceValues(sm.subjects.concat([OTHER])));
        semChoices.push(semQ.createChoice(sm.name, pSub));
      });
      if (semChoices.length) semQ.setChoices(semChoices); else semQ.setChoiceValues(['—']);
    });
    if (yearChoices.length) yearQ.setChoices(yearChoices); else yearQ.setChoiceValues(['—']);
  });
  instQ.setChoices(instChoices);
  made.forEach(function (it, i) { form.moveItem(it.getIndex(), i); });
  // after any subject page, jump to «تفاصيل المحتوى». Google sets "after this page" on the page break that follows it.
  form.getItems(FormApp.ItemType.PAGE_BREAK).forEach(function (p) {
    var prev = form.getItems()[p.getIndex() - 1];
    if (p.getId() !== det.getId() && prev && prev.getTitle() === 'المادة') p.asPageBreakItem().setGoToPage(det);
  });
  PropertiesService.getScriptProperties().setProperty('SIG', sig_(tree));
  if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'refreshLists'; }))
    ScriptApp.newTrigger('refreshLists').timeBased().everyHours(6).create();
  Logger.log('تم: ' + subjBreaks.length + ' فصول، كل فصل بقائمة مواده');
}
function sig_(tree) { return JSON.stringify(tree.map(function (i) { return i.years.map(function (y) { return [y.name, y.sems.map(function (s) { return s.name; })]; }); })); }
// every 6 hours: new subjects only → update the lists in place; new years/semesters → rebuild
function refreshLists() {
  var form = form_(), tree = tree_();
  if (sig_(tree) !== PropertiesService.getScriptProperties().getProperty('SIG')) return buildLists();
  var lists = form.getItems(FormApp.ItemType.LIST).filter(function (it) { return it.getTitle() === 'المادة'; }), k = 0;
  tree.forEach(function (ins) { ins.years.forEach(function (y) { y.sems.forEach(function (sm) { if (lists[k]) lists[k].asListItem().setChoiceValues(sm.subjects.concat([OTHER])); k++; }); }); });
}

function folder_(parent, name) { var it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
function clean_(s) { return String(s || '').replace(/[\\\/:*?"<>|#%]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'بدون'; }
