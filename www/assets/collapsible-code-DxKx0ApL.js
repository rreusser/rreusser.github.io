function g({maxHeight:c=150,selector:i="main pre",skip:r=[],include:a=[],overrides:d={}}={}){const e=()=>{const o=document.querySelectorAll(i);return o.length===0?!1:(f(o,{maxHeight:c,skip:r,include:a,overrides:d}),!0)};if(!e()){const o=new MutationObserver(()=>{e()&&o.disconnect()});o.observe(document.body,{childList:!0,subtree:!0})}}function f(c,{maxHeight:i,skip:r,include:a,overrides:d}){for(const e of c){if(e.dataset.collapsed)continue;const s=e.closest('[id^="cell-"]')?.id;if(s&&r.includes(s))continue;const u=(s&&d[s])??i;if(!(s&&a.includes(s))&&e.scrollHeight<=u||e.textContent.trimStart().startsWith("// @expanded"))continue;e.dataset.collapsed="true",e.style.maxHeight=`${u}px`,e.style.overflow="hidden",e.style.position="relative";const t=document.createElement("div");t.style.cssText=`
      position: absolute; bottom: 0; left: 0; right: 0; height: 60px;
      background: linear-gradient(transparent, var(--theme-background-alt, #f5f5f5) 60%);
      display: flex; align-items: flex-end; justify-content: center; padding-bottom: 8px;
    `;const l=document.createElement("button");l.textContent="Expand",l.style.cssText=`
      padding: 4px 16px;
      background: var(--theme-background-alt, #f5f5f5);
      border: 1px solid #ccc; border-radius: 3px;
      cursor: pointer; font-size: 12px; color: #666;
      user-select: none;
    `;const p="linear-gradient(transparent, var(--theme-background-alt, #f5f5f5) 60%)";l.onclick=()=>{const n=e.style.maxHeight!=="none";e.style.maxHeight=n?"none":`${u}px`,e.style.overflow=n?"":"hidden",t.style.background=n?"none":p,t.style.position=n?"static":"absolute",t.style.height=n?"auto":"60px",t.style.paddingBottom=n?"0":"8px",l.textContent=n?"Collapse":"Expand"},t.appendChild(l),e.appendChild(t)}}export{g as collapseCodeBlocks};
