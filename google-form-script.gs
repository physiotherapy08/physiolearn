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
  var year = a['السنة (كلية عمان)'] || a['السنة (جامعة نزوى)'] || '';
  var sem = a['الفصل (كلية عمان)'] || a['الفصل (جامعة نزوى)'] || '';
  var f = folder_(DriveApp.getRootFolder(), ROOT);
  [inst, year, sem, a['المادة'], a['الموضوع']].forEach(function (n) { if (n) f = folder_(f, clean_(n)); });
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

function folder_(parent, name) { var it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
function clean_(s) { return String(s || '').replace(/[\\\/:*?"<>|#%]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'بدون'; }
