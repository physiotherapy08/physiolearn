import asyncio,json
from playwright.async_api import async_playwright
JS='''(t)=>{render(t);
 const vis=[...document.querySelectorAll('#root > .d')].filter(e=>e.style.visibility==='visible'&&parseFloat(e.style.opacity)>0.25);
 const isText=e=>e.querySelector('.line,.step,.lbl')||e.classList.contains('tag')||/^ch_/.test(e.id);
 const R=e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]};
 // tighter rect for text: union of word spans
 const TR=e=>{const ws=[...e.querySelectorAll('.w>i')];if(!ws.length)return R(e.firstElementChild||e);let a=[1e9,1e9,-1e9,-1e9];ws.forEach(w=>{const r=w.getBoundingClientRect();a=[Math.min(a[0],r.left),Math.min(a[1],r.top),Math.max(a[2],r.right),Math.max(a[3],r.bottom)]});return a};
 const ix=(a,b)=>Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));
 const out=[];const T=vis.filter(isText);
 for(const e of T){const a=TR(e);if(a[0]<10||a[2]>1070)out.push([e.id,'OFFSCREEN',Math.round(a[0]),Math.round(a[2])]);
  for(const f of vis){if(f===e||f.id==='sig')continue;let b=isText(f)?TR(f):R(f.querySelector('svg,img,.body,div')||f);
   if(f.classList.contains('phone'))b=R(f.querySelector('.body'));
   if(/^shock|^hz/.test(f.id))continue;
   const o=ix(a,b);if(o>400)out.push([e.id,f.id,Math.round(o)]);}}
 return out;}'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--allow-file-access-from-files'])
        pg=await b.new_page(viewport={'width':1080,'height':1920})
        await pg.goto('file:///home/claude/film/web/film.html'); await pg.wait_for_function('window.READY===true'); await pg.wait_for_timeout(800)
        res={}
        t=0.0
        while t<228:
            o=await pg.evaluate(JS,t)
            for x in o:
                k=' | '.join(map(str,x[:2]))
                res.setdefault(k,[]).append(round(t,2))
            t+=0.25
        for k,v in sorted(res.items(),key=lambda kv:kv[1][0]): print(f'{v[0]:7.2f}-{v[-1]:7.2f} ({len(v)}) {k}')
        await b.close()
asyncio.run(main())
