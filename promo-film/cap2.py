import asyncio,sys
sys.path.insert(0,'/home/claude/film')
from cap_lib import *
S='/home/claude/film/shots/'
async def shot(pg,name): await pg.wait_for_timeout(700); await pg.screenshot(path=S+name+'.png')
async def tap(pg,text,exact=False,nth=0):
    await pg.get_by_text(text,exact=exact).nth(nth).click()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        # tall home
        pg=await new_page(b)
        await pg.set_viewport_size({'width':390,'height':1913}); await pg.wait_for_timeout(800)
        await pg.screenshot(path=S+'home_tall.png'); await pg.set_viewport_size({'width':390,'height':797})
        await shot(pg,'home')
        # browse
        await tap(pg,'المواد',exact=True,nth=1); await shot(pg,'browse_years')
        await tap(pg,'السنة الأولى',nth=0); await shot(pg,'browse_subjects')
        await tap(pg,'Anatomy',exact=True); await shot(pg,'browse_topics')
        await tap(pg,'Upper Limb',exact=True); await shot(pg,'browse_resources')
        await tap(pg,'Brachial Plexus — Overview'); await shot(pg,'summary_detail')
        print('ok1')
        await b.close()
asyncio.run(main())
