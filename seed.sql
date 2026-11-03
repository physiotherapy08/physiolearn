-- البداية: 4 سنوات، مادتان، قناة، 5 تخصصات للحالات
insert into items (col, id, data) values
('nodes','y1','{"type":"year","name":"السنة الأولى","parentId":null,"at":1}'),
('nodes','y2','{"type":"year","name":"السنة الثانية","parentId":null,"at":2}'),
('nodes','y3','{"type":"year","name":"السنة الثالثة","parentId":null,"at":3}'),
('nodes','y4','{"type":"year","name":"السنة الرابعة","parentId":null,"at":4}'),
('nodes','s1','{"type":"subject","name":"Anatomy","parentId":"y1","at":10}'),
('nodes','s2','{"type":"subject","name":"Physiology","parentId":"y1","at":11}'),
('channels','c1','{"name":"Zero To Finals","url":"https://www.youtube.com/@ZeroToFinals","at":1}'),
('caseCats','k1','{"name":"الأعصاب","at":1}'),
('caseCats','k2','{"name":"العظام والمفاصل","at":2}'),
('caseCats','k3','{"name":"القلب والجهاز التنفسي","at":3}'),
('caseCats','k4','{"name":"الأطفال","at":4}'),
('caseCats','k5','{"name":"الإصابات الرياضية","at":5}')
on conflict (col, id) do nothing;
