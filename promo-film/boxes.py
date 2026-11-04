import asyncio,sys,json
sys.path.insert(0,'/home/claude/film')
from cap_lib import *
B={}
async def box(pg,key,text,exact=False,nth=0):
    bb=await pg.get_by_text(text,exact=exact).nth(nth).bounding_box()
    B[key]=[round(bb['x']+bb['width']/2),round(bb['y']+bb['height']/2)]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg=await new_page(b)
        for k,t,e,n in [('home_summ','الملخصات',True,0),('home_quiz','الاختبارات',True,0),('home_books','الكتب',True,0),('home_case','Case Study',True,0),('tab_home','الرئيسية',True,0),('tab_browse','المواد',True,1),('tab_lib','المكتبة',True,0),('tab_saved','المحفوظات',True,0),('home_search','ابحث عن مادة أو ملخص أو كتاب',False,0)]:
            await box(pg,k,t,e,n)
        await pg.get_by_text('الملخصات',exact=True).click(); await pg.wait_for_timeout(600)
        await box(pg,'summ_item','Brachial Plexus — Overview')
        pg=await new_page(b); await pg.get_by_text('المكتبة',exact=True).click(); await pg.wait_for_timeout(600)
        await box(pg,'lib_item','Therapeutic Exercise')
        pg=await new_page(b); await pg.get_by_text('الاختبارات',exact=True).click(); await pg.wait_for_timeout(600)
        await box(pg,'quiz_item','Upper Limb — Muscles & Nerves')
        await pg.get_by_text('Upper Limb — Muscles & Nerves').click(); await pg.wait_for_timeout(600)
        await box(pg,'quiz_start','ابدأ الاختبار'); await pg.get_by_text('ابدأ الاختبار').click(); await pg.wait_for_timeout(600)
        await box(pg,'q1_opt','Axillary nerve'); await box(pg,'q_next','التالي')
        for o in ['Axillary nerve','Teres major','C5–C6','Median nerve']:
            await pg.get_by_text(o).click(); await pg.get_by_text('التالي').click(); await pg.wait_for_timeout(300)
        await box(pg,'q5_opt','Deltoid',True); await pg.get_by_text('Deltoid',exact=True).click(); await box(pg,'q_finish','إنهاء')
        await pg.get_by_text('إنهاء').click(); await pg.wait_for_timeout(1000); await box(pg,'res_review','مراجعة الأخطاء')
        pg=await new_page(b); await pg.get_by_text('Case Study',exact=True).click(); await pg.wait_for_timeout(600)
        await box(pg,'case_cat','الأعصاب',True); await pg.get_by_text('الأعصاب',exact=True).click(); await pg.wait_for_timeout(600)
        await box(pg,'case_item','Right hemiparesis after stroke — 3 weeks')
        pg=await new_page(b); await box(pg,'home_channels','عرض الكل')
        pg=await new_page(b,signed=False); await pg.mouse.click(40,37); await pg.wait_for_timeout(700); await box(pg,'set_login','تسجيل الدخول / إنشاء حساب')
        B['person']=[40,37]
        json.dump(B,open('/home/claude/film/boxes.json','w'),indent=0); print(B)
        await b.close()
asyncio.run(main())
