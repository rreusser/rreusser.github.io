import{d}from"./index-ByB2dbry.js";d({root:document.getElementById("cell-6"),expanded:[],variables:[]},{id:6,body:()=>({basePath:"https://s3.amazonaws.com/images.rickyreusser.com/multiscale-turing-patterns/",images:[{href:"turing01.jpg"},{href:"turing02.jpg"},{href:"turing03.jpg"},{href:"turing04.jpg"},{href:"turing05.jpg"},{href:"turing06.jpg"},{href:"turing07.jpg"},{href:"turing08.jpg"},{href:"turing09.jpg"},{href:"turing10.jpg"},{href:"turing11.jpg"},{href:"turing12.jpg"},{href:"turing13.jpg"},{href:"turing14.jpg"}]}),inputs:[],outputs:["basePath","images"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-8"),expanded:[],variables:[]},{id:8,body:(i,a,o,p,f)=>{function l(e){const t=e.replace(".jpg","");return`${i}${t}-thumbnail.jpg`}function u(e){return`${i}${e}`}function s(e){const t=l(e.href),g=u(e.href);return a`<li class="turing-gallery__item">
    <a href="${g}" class="turing-gallery__link" target="_blank" rel="noopener">
      <img
        class="turing-gallery__image"
        src="${t}"
        alt="Multi-scale Turing pattern"
        loading="lazy"
      />
    </a>
  </li>`}const n=o(a`<ul class="turing-gallery">${p.map(s)}</ul>`);function r(){const e=window.innerWidth,t=Math.min(1160,e-40),h=((n.parentElement?.offsetWidth||640)-t)/2;n.style.width=t+"px",n.style.marginLeft=h+"px"}return r(),window.addEventListener("resize",r),f.then(()=>window.removeEventListener("resize",r)),{getThumbnailUrl:l,getFullUrl:u,renderGalleryItem:s,galleryEl:n,updateGalleryLayout:r}},inputs:["basePath","html","display","images","invalidation"],outputs:["getThumbnailUrl","getFullUrl","renderGalleryItem","galleryEl","updateGalleryLayout"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
