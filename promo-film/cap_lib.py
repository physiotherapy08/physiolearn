import asyncio, json
from playwright.async_api import async_playwright
U='http://127.0.0.1:8790/'
ME={"favorites":["r1","b2","x1"],"recent":[{"id":"r4","at":1793700000000},{"id":"r1","at":1793690000000},{"id":"b2","at":1793680000000},{"id":"r3","at":1793670000000}],
    "attempts":[{"id":"r6","pct":67,"correct":2,"total":3,"at":1793600000000},{"id":"r4","pct":80,"correct":4,"total":5,"at":1793650000000}]}
UI={"lang":"ar","mode":"student","ctx":{"yearId":"y1","subjId":"s1"}}
HIDE="a[href*='claude'],[class*='badge']{display:none!important}"
async def new_page(b, signed=True, me=ME, ui=UI):
    ctx=await b.new_context(viewport={'width':390,'height':797},device_scale_factor=3,service_workers='block')
    await ctx.add_init_script(f"""try{{localStorage.setItem('physiolearn.v1.me',{json.dumps(json.dumps(me))});localStorage.setItem('physiolearn.v1.ui',{json.dumps(json.dumps(ui))});{"localStorage.setItem('mock.signed','1');" if signed else "localStorage.removeItem('mock.signed');"}}}catch(e){{}}""")
    pg=await ctx.new_page()
    await pg.goto(U); await pg.wait_for_timeout(2500)
    await pg.add_style_tag(content=HIDE)
    await pg.evaluate("document.querySelectorAll('a,div').forEach(e=>{if(e.textContent.trim()==='Made with Claude Design'){let p=e.closest('div');p&&p.remove()}})")
    return pg
