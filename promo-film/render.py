import asyncio,sys,os,time
from playwright.async_api import async_playwright
FPS=30; LEN=228.0; NF=int(LEN*FPS)
wid,nw=int(sys.argv[1]),int(sys.argv[2]); OUT='/home/claude/film/frames'; os.makedirs(OUT,exist_ok=True)
a=sys.argv[3] if len(sys.argv)>3 else None
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--allow-file-access-from-files','--disable-accelerated-2d-canvas','--disable-gpu'])
        pg=await b.new_page(viewport={'width':1080,'height':1920})
        await pg.goto('file:///home/claude/film/web/film.html'); await pg.wait_for_function('window.READY===true'); await pg.wait_for_timeout(1000)
        frames=range(wid,NF,nw) if not a else range(int(a.split(':')[0]),int(a.split(':')[1]))
        t0=time.time();n=0
        for f in frames:
            fn=f'{OUT}/f{f:05d}.jpg'
            if os.path.exists(fn) and os.path.getsize(fn)>1000: continue
            await pg.evaluate(f'render({f/FPS})'); await pg.screenshot(path=fn,type='jpeg',quality=92); n+=1
            if n%300==0: print(wid,f,round((time.time()-t0)/n,3),flush=True)
        await b.close()
asyncio.run(main())
