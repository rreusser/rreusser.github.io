import{d}from"./index-ByB2dbry.js";d({root:document.getElementById("cell-1771"),expanded:[],variables:[]},{id:1771,body:(t,e)=>t`The [Baily-Borwein-Plouffe](https://en.wikipedia.org/wiki/Bailey%E2%80%93Borwein%E2%80%93Plouffe_formula) (BBP) formula is a remarkable formula for computing the hexadecimal digits of ${e`\pi`}, starting at the ${e`n^{th}`} digit, *without first computing preceeding digits*!`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1820"),expanded:[],variables:[]},{id:1820,body:t=>t.block`\pi =\sum _{k=0}^{\infty }\left[{\frac {1}{16^{k}}}\left({\frac {4}{8k+1}}-{\frac {2}{8k+4}}-{\frac {1}{8k+5}}-{\frac {1}{8k+6}}\right)\right].`,inputs:["tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1770"),expanded:[],variables:[]},{id:1770,body:(t,e)=>t`That such a formula could exist is a bit shocking—though the initial shock is tempered by the realization that it does, of course, take longer as you start at later digits (${e`O(n \log n)`} as a function of the starting digit, to be precise). Additionally, the hexadecimal digits cannot be converted to decimal without first computing all of the leading digits. What it does enable though, is to compute digits deep into ${e`\pi`} with hardly any memory consumption and nothing more than a basic double precision data type.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1193"),expanded:[],variables:[]},{id:1193,body:function*(e,i,a){if(!this){yield e`Click to compute π starting at the millionth hexadecimal digit.`;return}yield e`Computing…`;const n=performance.now(),o=10,u=a(1e6,o),c=performance.now();yield e`<div>
    Hexadecimal digits of π starting at the millionth (computed in ${((c-n)/1e3).toFixed(2)} seconds):<br><code style="color:rgb(32, 165, 186)">${u.toString(16).padStart(o,"0")}</code>
  </div>`},inputs:["html","recompute","computePi"],outputs:void 0,output:"viewof$dummy",assets:void 0,autodisplay:!0,autoview:!0,automutable:!1});d({root:document.getElementById("cell-1242"),expanded:[],variables:[]},{id:1242,body:(t,e)=>({recompute:t(e.button("Compute"))}),inputs:["view","Inputs"],outputs:["recompute"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1774"),expanded:[],variables:[]},{id:1774,body:(t,e)=>t`The table below shows hexadecimal digits of ${e`\pi`}. Each line represents an independent run of the algorithm starting at a slightly different digit. Green digits are correctly computed digits, while red represents incorrect digits. Due to our termination criteria, we usually get a couple fewer digits than requested.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-805"),expanded:[],variables:[]},{id:805,body:(t,e)=>({method:t(e.radio(["Floating point","BigInt"],{label:"Data type",value:"Floating point"}))}),inputs:["view","Inputs"],outputs:["method"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-333"),expanded:[],variables:[]},{id:333,body:(t,e,i)=>({startingDigit:t(e.range([0,i.referenceDigits.length-128],{value:0,label:"Starting digit",step:1}))}),inputs:["view","Inputs","reference"],outputs:["startingDigit"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-437"),expanded:[],variables:[]},{id:437,body:(t,e,i)=>({digits:t(e.range([2,i==="Floating point"?14:128],{label:"Digits to compute",value:i==="Floating point"?14:128,step:1}))}),inputs:["view","Inputs","method"],outputs:["digits"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1821"),expanded:[],variables:[]},{id:1821,body:t=>({figureWidth:Math.min(950,window.innerWidth+1e-8*t)}),inputs:["width"],outputs:["figureWidth"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-478"),expanded:[],variables:[]},{id:478,body:function*(e,i,a,n,o,u,c,b,s){const r=Math.floor((e-90)/850*128),f=i.referenceDigits.slice(a,a+r);function I(m,l,h){const y=document.createElement("span"),w=document.createElement("span");w.textContent=a===0&&h>0?f[0]+"."+f.slice(1,h):f.slice(0,h),y.appendChild(w),y.style.color="#ccc";for(let g=0;g<f.length-h;g++){const p=document.createElement("span");p.textContent=l[g],y.appendChild(p);const B=m[g]===l[g]?"rgb(32, 165, 186)":"#c12";if(p.style.color=B,p.style.fontWeight=900,a===0&&h===0&&g===0){const k=document.createElement("span");k.textContent=".",k.style.color=B,y.appendChild(k)}}const v=document.createElement("span");return v.textContent=f.slice(h+n,f.length),y.appendChild(v),y.style.color="#bbb",y}const x=[],E=a===0?f[0]+"."+f.slice(1):f;for(let m=a;m<a+f.length;m+=4){const l=document.createElement("code");l.style.fontSize="inherit",l.style.color="#ccc",l.textContent=E,x.push(l)}const $=x.map(m=>o`<code style="font-size:inherit;">${m}</code><br>`),_=Math.min(0,-(e-40-u)/2),P=o`
    <pre style="padding:0;font-size:${11}px;background:var(--theme-background);width:${e}px;margin-left:${_}px">
${$}</pre>
  `,S=c==="Floating point"?b:s;for(let m=0,l=a;l<a+f.length;m++,l+=4){const h=performance.now(),y=S(l,n),w=performance.now(),v=y.toString(16).padStart(n,"0"),g=I(i.referenceDigits.slice(l,l+n),v,l-a),p=document.createElement("code");p.style.fontSize="inherit",p.style.color="rgb(32, 165, 186)",p.style.fontWeight="700",p.textContent=` (${(w-h).toFixed(1)}ms)`,g.appendChild(p),x[m].replaceWith(g),yield P}},inputs:["figureWidth","reference","startingDigit","digits","html","width","method","computePi","computePiBigInt"],outputs:void 0,output:"table",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});d({root:document.getElementById("cell-1822"),expanded:[],variables:[]},{id:1822,body:function(){return{referenceDigits:`
3243f6a8885a308d313198a2e03707344a4093822299f31d0082efa98ec4e6c8
9452821e638d01377be5466cf34e90c6cc0ac29b7c97c50dd3f84d5b5b547091
79216d5d98979fb1bd1310ba698dfb5ac2ffd72dbd01adfb7b8e1afed6a267e9
6ba7c9045f12c7f9924a19947b3916cf70801f2e2858efc16636920d871574e6
9a458fea3f4933d7e0d95748f728eb658718bcd5882154aee7b54a41dc25a59b
59c30d5392af26013c5d1b023286085f0ca417918b8db38ef8e79dcb0603a180
e6c9e0e8bb01e8a3ed71577c1bd314b2778af2fda55605c60e65525f3aa55ab9
45748986263e8144055ca396a2aab10b6b4cc5c341141e8cea15486af7c72e99
3b3ee1411636fbc2a2ba9c55d741831f6ce5c3e169b87931eafd6ba336c24cf5
c7a325381289586773b8f48986b4bb9afc4bfe81b6628219361d809ccfb21a99
1487cac605dec8032ef845d5de98575b1dc262302eb651b8823893e81d396acc
50f6d6ff383f442392e0b4482a484200469c8f04a9e1f9b5e21c66842f6e96c9
a670c9c61abd388f06a51a0d2d8542f68960fa728ab5133a36eef0b6c137a3be
4ba3bf0507efb2a98a1f1651d39af017666ca593e82430e888cee8619456f9fb
47d84a5c33b8b5ebee06f75d885c12073401a449f56c16aa64ed3aa62363f770
61bfedf72429b023d37d0d724d00a1248db0fead349f1c09b075372c980991b7
b25d479d8f6e8def7e3fe501ab6794c3b976ce0bd04c006bac1a94fb6409f60c
45e5c9ec2196a246368fb6faf3e6c53b51339b2eb3b52ec6f6dfc511f9b30952
ccc814544af5ebd09bee3d004de334afd660f2807192e4bb3c0cba85745c8740
fd20b5f39b9d3fbdb5579c0bd1a60320ad6a100c6402c7279679f25fefb1fa3c
c8ea5e9f8db3222f83c7516dffd616b152f501ec8ad0552ab323db5fafd23876
053317b483e00df829e5c57bbca6f8ca01a87562edf1769dbd542a8f6287effc
3ac6732c68c4f5573695b27b0bbca58c8e1ffa35db8f011a010fa3d98fd2183b
84afcb56c2dd1d35b9a53e479b6f84565d28e49bc4bfb9790e1ddf2daa4cb7e3
362fb1341cee4c6e8ef20cada36774c01d07e9efe2bf11fb495dbda4dae90919
8eaad8e716b93d5a0d08ed1d0afc725e08e3c5b2f8e7594b78ff6e2fbf2122b6
48888b812900df01c4fad5ea0688fc31cd1cff191b3a8c1ad2f2f2218be0e177
7ea752dfe8b021fa1e5a0cc0fb56f74e818acf3d6ce89e299b4a84fe0fd13e0b
77cc43b81d2ada8d9165fa2668095770593cc7314211a1477e6ad206577b5fa8
6c75442f5fb9d35cfebcdaf0c7b3e89a0d6411bd3ae1e7e4900250e2d2071b35
e226800bb57b8e0af2464369bf009b91e5563911d59dfa6aa78c14389d95a537
f207d5ba202e5b9c5832603766295cfa911c819684e734a41b3472dca7b14a94
a1b5100529a532915d60f573fbc9bc6e42b60a47681e6740008ba6fb5571be91
ff296ec6b2a0dd915b6636521e7b9f9b6ff34052ec585566453b02d5da99f8fa
108ba47996e85076a4b7a70e9b5b32944db75092ec4192623ad6ea6b049a7df7
d9cee60b88fedb266ecaa8c71699a17ff5664526cc2b19ee1193602a575094c2
9a0591340e4183a3e3f54989a5b429d656b8fe4d699f73fd6a1d29c07efe830f
54d2d38e6f0255dc14cdd20868470eb266382e9c6021ecc5e09686b3f3ebaefc
93c9718146b6a70a1687f358452a0e286b79c5305aa5007373e07841c7fdeae5
c8e7d44ec5716f2b8b03ada37f0500c0df01c1f040200b3ffae0cf51a3cb574b
225837a58dc0921bdd19113f97ca92ff69432477322f547013ae5e58137c2dad
cc8b576349af3dda7a94461460fd0030eecc8c73ea4751e41e238cd993bea0e2
f3280bba1183eb3314e548b384f6db9086f420d03f60a04bf2cb8129024977c7
95679b072bcaf89afde9a771fd9930810b38bae12dccf3f2e5512721f2e6b712
4501adde69f84cd877a5847187408da17bc9f9abce94b7d8cec7aec3adb851df
a63094366c464c3d2ef1c18473215d908dd433b3724c2ba1612a14d432a65c45
150940002133ae4dd71dff89e10314e5581ac77d65f11199b043556f1d7a3c76
b3c11183b5924a509f28fe6ed97f1fbfa9ebabf2c1e153c6e86e34570eae96fb
1860e5e0a5a3e2ab3771fe71c4e3d06fa2965dcb999e71d0f803e89d65266c82
52e4cc9789c10b36ac6150eba94e2ea78a5fc3c531e0a2df4f2f74ea7361d2b3
d1939260f19c279605223a708f71312b6ebadfe6eeac31f66e3bc4595a67bc88
3b17f37d1018cff28c332ddefbe6c5aa56558218568ab9802eecea50fdb2f953
b2aef7dad5b6e2f841521b62829076170ecdd4775619f151013cca830eb61bd9
60334fe1eaa0363cfb5735c904c70a239d59e9e0bcbaade14eecc86bc60622ca
79cab5cabb2f3846e648b1eaf19bdf0caa02369b9655abb5040685a323c2ab4b
3319ee9d5c021b8f79b540b19875fa09995f7997e623d7da8f837889a97e32d7
711ed935f166812810e358829c7e61fd696dedfa17858ba9957f584a51b22726
39b83c3ff1ac24696cdb30aeb532e30548fd948e46dbc312858ebf2ef34c6ffe
afe28ed61ee7c3c735d4a14d9e864b7e342105d14203e13e045eee2b6a3aaabe
adb6c4f15facb4fd0c742f442ef6abbb5654f3b1d41cd2105d81e799e86854dc
7e44b476a3d816250cf62a1f25b8d2646fc8883a0c1c7b6a37f1524c369cb749
247848a0b5692b285095bbf00ad19489d1462b17423820e0058428d2a0c55f5e
a1dadf43e233f70613372f0928d937e41d65fecf16c223bdb7cde3759cbee746
04085f2a7ce77326ea607808419f8509ee8efd85561d99735a969a7aac50c06c
25a04abfc800bcadc9e447a2ec3453484fdd567050e1e9ec9db73dbd3105588c
d675fda79e3674340c5c43465713e38d83d28f89ef16dff20153e21e78fb03d4
ae6e39f2bdb83adf7e93d5a68948140f7f64c261c94692934411520f77602d4f
7bcf46b2ed4a20068d40824713320f46a43b7d4b7500061af1e39f62e9724454
614214f74bf8b88404d95fc1d96b591af70f4ddd366a02f45bfbc09ec03bd978
57fac6dd031cb850496eb27b355fd3941da2547e6abca0a9a28507825530429f
40a2c86dae9b66dfb68dc1462d7486900680ec0a427a18dee4f3ffea2e887ad8
cb58ce0067af4d6b6aace1e7cd3375fecce78a399406b2a4220fe9e35d9f385b
9ee39d7ab3b124e8b1dc9faf74b6d185626a36631eae397b23a6efa74dd5b433
26841e7f7ca7820fbfb0af54ed8feb397454056acba48952755533a3a20838d8
7fe6ba9b7d096954b55a867bca1159a58cca9296399e1db33a62a4a563f3125f
95ef47e1c9029317cfdf8e80204272f7080bb155c05282ce395c11548e4c66d2
248c1133fc70f86dc07f9c9ee41041f0f404779a45d886e17325f51ebd59bc0d
1f2bcc18f41113564257b7834602a9c60dff8e8a31f636c1b0e12b4c202e1329
eaf664fd1cad181156b2395e0333e92e13b240b62eebeb92285b2a20ee6ba0d9
9de720c8c2da2f728d012784595b794fd647d0862e7ccf5f05449a36f877d48f
ac39dfd27f33e8d1e0a476341992eff743a6f6eabf4f8fd37a812dc60a1ebddf
8991be14cdb6e6b0dc67b55106d672c372765d43bdcd0e804f1290dc7cc00ffa
3b5390f92690fed0b667b9ffbcedb7d9ca091cf0bd9155ea3bb132f88515bad2
47b9479bf763bd6eb37392eb3cc1159798026e297f42e312d6842ada7c66a2b3
b12754ccc782ef11c6a124237b79251e706a1bbe64bfb63501a6b101811caedf
a3d25bdd8e2e1c3c9444216590a121386d90cec6ed5abea2a64af674eda86a85
fbebfe98864e4c3fe9dbc8057f0f7c08660787bf86003604dd1fd8346f6381fb
07745ae04d736fccc83426b33f01eab71b08041873c005e5f77a057bebde8ae2
455464299bf582e614e58f48ff2ddfda2f474ef388789bdc25366f9c3c8b38e7
4b475f25546fcd9b97aeb26618b1ddf84846a0e79915f95e2466e598e20b4577
08cd55591c902de4cb90bace1bb8205d011a862487574a99eb77f19b6e0a9dc0
9662d09a1c4324633e85a1f0209f0be8c4a99a0251d6efe101ab93d1d0ba5a4d
fa186f20f2868f169dcb7da83573906fea1e2ce9b4fcd7f5250115e01a70683f
aa002b5c40de6d0279af88c27773f8641c3604c0661a806b5f0177a28c0f586e
0006058aa30dc7d6211e69ed72338ea6353c2dd94c2c21634bbcbee5690bcb6d
eebfc7da1ce591d766f05e4094b7c018839720a3d7c927c2486e3725f724d9db
91ac15bb4d39eb8fced54557808fca5b5d83d7cd34dad0fc41e50ef5eb161e6f
8a28514d96c51133c6fd5c7e756e14ec4362abfceddc6c837d79a32349263821
2670efa8e406000e03a39ce37d3faf5cfabc277375ac52d1b5cb0679e4fa3374
2d382274099bc9bbed5118e9dbf0f7315d62d1c7ec700c47bb78c1b6b21a1904
5b26eb1be6a366eb45748ab2fbc946e79c6a376d26549c2c8530ff8ee468dde7
dd5730a1d4cd04dc62939bbdba9ba4650ac9526e8be5ee304a1fad5f06a2d519
a63ef8ce29a86ee22c089c2b843242ef6a51e03aa9cf2d0a483c061ba9be96a4
d8fe51550ba645bd62826a2f9a73a3ae14ba99586ef5562e9c72fefd3f752f7d
a3f046f6977fa0a5980e4a91587b086019b09e6ad3b3ee593e990fd5a9e34d79
72cf0b7d9022b8b5196d5ac3a017da67dd1cf3ed67c7d2d281f9f25cfadf2b89
b5ad6b4725a88f54ce029ac71e019a5e647b0acfded93fa9be8d3c48d283b57c
cf8d5662979132e28785f0191ed756055f7960e44e3d35e8c15056dd488f46db
a03a161250564f0bdc3eb9e153c9057a297271aeca93a072a1b3f6d9b1e6321f
5f59c66fb26dcf3197533d928b155fdf5035634828aba3cbb28517711c20ad9f
8abcc5167ccad925f4de817513830dc8e379d58629320f991ea7a90c2fb3e7bc
e5121ce64774fbe32a8b6e37ec3293d4648de53696413e680a2ae0810dd6db22
469852dfd09072166b39a460a6445c0dd586cdecf1c20c8ae5bbef7dd1b588d4
0ccd2017f6bb4e3bbdda26a7e3a59ff453e350a44bcb4cdd572eacea8fa6484b
b8d6612aebf3c6f47d29be463542f5d9eaec2771bf64e6370740e0d8de75b135
7f8721671af537d5d4040cb084eb4e2cc34d2466a0115af84e1b0042895983a1
d06b89fb4ce6ea0486f3f3b823520ab82011a1d4b277227f8611560b1e7933fd
cbb3a792b344525bda08839e151ce794b2f32c9b7a01fbac9e01cc87ebcc7d1f
6cf0111c3a1e8aac71a908749d44fbd9ad0dadecbd50ada380339c32ac691366
78df9317ce0b12b4ff79e59b743f5bb3af2d519ff27d9459cbf97222c15e6fc2
a0f91fc719b941525fae59361ceb69cebc2a8645912baa8d1b6c1075ee3056a0
c10d25065cb03a442e0ec6e0e1698db3b4c98a0be3278e9649f1f9532e0d392d
fd3a0342b8971f21e1b0a74414ba3348cc5be7120c37632d8df359f8d9b992f2
ee60b6f470fe3f11de54cda541edad891ce6279cfcd3e7e6f1618b166fd2c1d0
5848fd2c5f6fb2299f523f357a632762393a8353156cccd02acf081625a75ebb
56e16369788d273ccde96629281b949d04c50901b71c65614e6c6c7bd327a140
a45e1d006c3f27b9ac9aa53fd62a80f00bb25bfe235bdd2f671126905b204022
2b6cbcf7ccd769c2b53113ec01640e3d338abbd602547adf0ba38209cf746ce7
677afa1c52075606085cbfe4e8ae88dd87aaaf9b04cf9aa7e1948c25c02fb8a8
c01c36ae4d6ebe1f990d4f869a65cdea03f09252dc208e69fb74e6132ce77e25`.split(`
`).join("")}},inputs:[],outputs:void 0,output:"reference",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});d({root:document.getElementById("cell-1779"),expanded:[],variables:[]},{id:1779,body:(t,e)=>t`So let's walk through using the identity to compute ${e`\pi`} starting at an arbitrary location. I'll largely repeat the eponymous David Bailey's explanation from *[The BBP Algorithm for Pi](https://www.davidhbailey.com/dhbpapers/bbp-alg.pdf)*, filling in some details I learned along the way. The implemenation is also heavily influenced by the version from [literateprograms.org](https://literateprograms.org/pi_with_the_bbp_formula__python_.html).`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1781"),expanded:[],variables:[]},{id:1781,body:t=>t.block`\pi =\sum_{k=0}^{\infty }\left[{\frac {1}{16^{k}}}\left({\frac {4}{8k+1}}-{\frac {2}{8k+4}}-{\frac {1}{8k+5}}-{\frac {1}{8k+6}}\right)\right].`,inputs:["tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1782"),expanded:[],variables:[]},{id:1782,body:(t,e)=>t`We first multiply through by ${e`16^d`}, then take the fractional part (modulo 1, if you prefer) which we denote by ${e`\{\cdot\}.`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1783"),expanded:[],variables:[]},{id:1783,body:t=>t.block`\{16^d\pi\} = \left\{\sum _{k=0}^{\infty }\left(
{\frac {16^{d-k} 4}{8k+1}}-
{\frac {16^{d-k} 2}{8k+4}}-
{\frac {16^{d-k}}{8k+5}}-
{\frac {16^{d-k}}{8k+6}}
\right)\right\}`,inputs:["tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1784"),expanded:[],variables:[]},{id:1784,body:(t,e)=>t`Consider ${e`d = 4`} (starting at the fourth digit):`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1785"),expanded:[],variables:[]},{id:1785,body:t=>t.block`\begin{aligned}
\pi &\approx \texttt{3.243f6a8885a368d31\ldots}_{16} \\
16^4 \pi &\approx \texttt{3243f.6a8885a368d31\ldots}_{16} \\
\left\{16^d \pi\right\} = \left\{16^4 \pi\right\} &\approx \phantom{0000\,}\texttt{0.6a8885a368d31\ldots}_{16}
\end{aligned}`,inputs:["tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1786"),expanded:[],variables:[]},{id:1786,body:(t,e)=>t`In hexadecimal, ${e`16^d`} shifts the value ${e`d`} places to the left (analogous to multiplication by ten in base ten), while the fractional part operation chops off any leading digits to the left of the [radix point](https://en.wikipedia.org/wiki/Radix_point). Thus, it pretty directly gives us the hexadecimal representation of ${e`\pi`} starting at the ${e`d^{th}`} digit.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1787"),expanded:[],variables:[]},{id:1787,body:(t,e)=>t`If we then multiply by ${e`16^n`} and take the integer part, we obtain ${e`n`} digits of ${e`\pi`}, starting at digit ${e`d`}. Consider ${e`n = 6`}:`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1788"),expanded:[],variables:[]},{id:1788,body:t=>t.block`\begin{aligned}
\left\{16^4 \pi\right\} &\approx \texttt{0.6a8885a368d31\ldots}_{16} \\
16^6 \left\{16^4 \pi\right\} &\approx \phantom{0\;\;} \texttt{6a8885.a368d31\ldots}_{16} \\
\lfloor 16^n \left\{16^d \pi\right\} \rfloor = \lfloor 16^6 \left\{16^4 \pi\right\} \rfloor &\approx \phantom{0\;\;} \texttt{6a8885}_{16}
\end{aligned}`,inputs:["tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1790"),expanded:[],variables:[]},{id:1790,body:(t,e)=>t`Our key observation is that, in order to keep numbers small, the fractional part operation can be distributed into each term of the summation. This works since, for example, ${e`\left\{3.4 + 5.1\right\} = \left\{\left\{3.4\right\} + \left\{5.1\right\}\right\} = \left\{0.4 + 0.1\right\} = 0.5`}, and yields`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1791"),expanded:[],variables:[]},{id:1791,body:t=>t.block`\{16^d\pi\} = \left\{\sum _{k=0}^{\infty }\left(
\left\{\frac {16^{d-k} 4}{8k+1}\right\}-
\left\{\frac {16^{d-k} 2}{8k+4}\right\}-
\left\{\frac {16^{d-k}}{8k+5}\right\}-
\left\{\frac {16^{d-k}}{8k+6}\right\}
\right)\right\}.`,inputs:["tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1792"),expanded:[],variables:[]},{id:1792,body:(t,e)=>t`To simplify—and realizing that we can move factors like ${e`2`} and ${e`4`} around as well—we break this up and write`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1793"),expanded:[],variables:[]},{id:1793,body:t=>t.block`\left\{16^d \pi\right\} = \left\{
4\left\{ 16^d S_1 \right\} -
2\left\{ 16^d S_4 \right\} -
\left\{ 16^d S_5 \right\} -
\left\{ 16^d S_6 \right\}
\right\},`,inputs:["tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1795"),expanded:[],variables:[]},{id:1795,body:t=>t.block`S_j = \sum_{k=0}^\infty \frac{1}{16^k(8k+j)}.`,inputs:["tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1796"),expanded:[],variables:[]},{id:1796,body:(t,e)=>t`To separate the positive (growing) and negative (quickly shrinking) powers of ${e`16`}, we can split each summation into two parts, from ${e`0`} to ${e`d`} and from ${e`d + 1`} to ${e`\infty`}.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1797"),expanded:[],variables:[]},{id:1797,body:t=>t.block`\begin{aligned}
\left\{16^d S_j \right\} &=
\left\{\left\{ \sum_{k=0}^d \frac{16^{d-k}}{8k + j}\right\} +
\sum_{k=d+1}^\infty \frac{16^{d-k}}{8k+j}\right\}
\end{aligned}`,inputs:["tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1799"),expanded:[],variables:[]},{id:1799,body:t=>t.block`\begin{aligned}
\left\{16^d S_j\right\} &=
\left\{\left\{ \sum_{k=0}^d \frac{16^{d-k} \operatorname{mod} 8k+j}{8k + j}\right\} +
\sum_{k=d+1}^\infty \frac{16^{d-k}}{8k+j}\right\}
\end{aligned}`,inputs:["tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1460"),expanded:[],variables:[]},{id:1460,body:(t,e)=>t`The second term gets small quickly as ${e`k`} increases. As for the first term, expressions of the form ${e`b^e \operatorname{mod} m`} are called [*modular exponentiation*](https://en.wikipedia.org/wiki/Modular_exponentiation).`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1803"),expanded:[],variables:[]},{id:1803,body:(t,e)=>t`${e.block`
3^{17} = 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3.
`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1804"),expanded:[],variables:[]},{id:1804,body:(t,e)=>t`We can multiply all the ${e`3`}'s, but it's rather wasteful. Instead, observe that`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1805"),expanded:[],variables:[]},{id:1805,body:t=>t.block`\begin{aligned}
3^{17} &= 3^{16} \cdot 3 \\
&= (3^8)^2 \cdot 3 \\
&= ((3^4)^2)^2 \cdot 3 \\
&= (((3^2)^2)^2)^2 \cdot 3 \\
\end{aligned}`,inputs:["tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1480"),expanded:[],variables:[]},{id:1480,body:(t,e)=>t`By repeatedly squaring, we can immediately reduce the number of multiplications from sixteen to five. As an algorithm, we repeatedly square the base as we step through the bits of the exponent. Here, the binary representation of ${e`17`} is ${e`10001_2`}. If the ${e`n^{th}`} bit is a 1, we multiply by the ${e`n`}-times squared base.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1498"),expanded:[],variables:[]},{id:1498,body:()=>{function t(e,i){let a=1;for(;i>0;)i&1&&(a*=e),e*=e,i>>=1;return a}return{binaryPow:t}},inputs:[],outputs:["binaryPow"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1685"),expanded:[],variables:[]},{id:1685,body:t=>t(3,17),inputs:["binaryPow"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1806"),expanded:[],variables:[]},{id:1806,body:(t,e)=>t`*[Modular exponentiation](https://en.wikipedia.org/wiki/Modular_exponentiation)* computes the exponentiation ${e`\operatorname{mod} m`},`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1807"),expanded:[],variables:[]},{id:1807,body:t=>t.block`b^e \operatorname{mod} m.`,inputs:["tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1808"),expanded:[],variables:[]},{id:1808,body:(t,e)=>t`While ${e`b^e`} may grow very large, ${e`b^e \operatorname{mod} m`} will always be less than ${e`m`}. An efficient algorithm, based on binary exponentiation, makes use of [the fact that](https://en.wikipedia.org/wiki/Modular_exponentiation#Memory-efficient_method)`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1809"),expanded:[],variables:[]},{id:1809,body:t=>t.block`
(a \cdot b) \operatorname{mod} m = [(a \operatorname{mod} m) \cdot (b \operatorname{mod} m)] \operatorname{mod} m.`,inputs:["tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-1017"),expanded:[],variables:[]},{id:1017,body:(t,e)=>t`Put simply, we just load the \`binaryPow\` function up with ${e`\operatorname{mod} m`} and keep our result between ${e`0`} and ${e`m`}.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-832"),expanded:[],variables:[]},{id:832,body:()=>{function t(e,i,a){e=e%a;let n=1;for(;i>0;)i&1&&(n=n*e%a),e=e*e%a,i>>=1;return n}return{modPow:t}},inputs:[],outputs:["modPow"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1700"),expanded:[],variables:[]},{id:1700,body:function(t,e){return t`Consider ${e`3^{17} \operatorname{mod} 50`}:`},inputs:["md","tex"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});d({root:document.getElementById("cell-1695"),expanded:[],variables:[]},{id:1695,body:t=>t(3,17,50),inputs:["modPow"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1706"),expanded:[],variables:[]},{id:1706,body:function(t){return t`Compare with`},inputs:["md"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});d({root:document.getElementById("cell-1697"),expanded:[],variables:[]},{id:1697,body:()=>3**17%50,inputs:[],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1487"),expanded:[],variables:[]},{id:1487,body:function(t,e){return t`
As one final prelude, we implement an alternative to the JavaScript \`%\` operator since its behavior with negative numbers is somewhat undesirable. \`-1.6 % 1\` is equal to ${e`-0.6`}, but we prefer the range ${e`[0, 1)`} instead.
`},inputs:["md","tex"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});d({root:document.getElementById("cell-829"),expanded:[],variables:[]},{id:829,body:()=>{function t(e,i){return e%=i,e<0?e+i:e}return{mod:t}},inputs:[],outputs:["mod"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1501"),expanded:[],variables:[]},{id:1501,body:(t,e)=>t`The function below directly implements the above summation ${e`S_j`} and the function \`computePi(d, n)\` which starts at digit ${e`d`} and computes ${e`n`} digits of ${e`\pi`}. It returns the result as an integer JavaScript \`Number\` so that we'll need to run \`.toString(16)\` to convert the output to hexadecimal.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-792"),expanded:[],variables:[]},{id:792,body:(t,e)=>{function i(n,o){let u=0;for(let b=0;b<=o;b++){let s=8*b+n;u=t(u+e(16,o-b,s)/s,1)}let c=0;for(let b=o+1;;b++){let s=c+16**(o-b)/(8*b+n);if(c===s)break;c=s}return u+c}function a(n,o){return n-=1,Math.floor(16**o*t(4*i(1,n)-2*i(4,n)-i(5,n)-i(6,n),1))}return{S:i,computePi:a}},inputs:["mod","modPow"],outputs:["S","computePi"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1768"),expanded:[],variables:[]},{id:1768,body:t=>t(0,10).toString(16),inputs:["computePi"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1512"),expanded:[],variables:[]},{id:1512,body:function(t){return t`## BigInt implementation`},inputs:["md"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});d({root:document.getElementById("cell-1769"),expanded:[],variables:[]},{id:1769,body:()=>{function t(a,n,o){if(!n)return 1n;a=a%o;let u=1n;for(;;){if(n&1n&&(u=u*a%o),n>>=1n,!n)return u;a=a*a%o}}function e(a,n,o,u){const c=o<<2n;let b=0n;for(let r=0n;r<=n;r++){let f=r*8n+a;b=b+(t(16n,n-r,f)<<c)/f&u}let s=0n;for(let r=n+1n;;r++){let f=s+16n**(o+n-r)/(r*8n+a);if(s===f)break;s=f}return b+s}function i(a,n){const o=BigInt(n),u=BigInt(a)-1n,c=16n**o-1n;return 4n*e(1n,u,o,c)-2n*e(4n,u,o,c)-e(5n,u,o,c)-e(6n,u,o,c)&c}return{modPowBigInt:t,SBigInt:e,computePiBigInt:i}},inputs:[],outputs:["modPowBigInt","SBigInt","computePiBigInt"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1739"),expanded:[],variables:[]},{id:1739,body:function(t){return t`The article from literateprograms.org, [Pi with the BBP formula](https://literateprograms.org/pi_with_the_bbp_formula__python_.html), notes that there's an additional, more efficient variation that generates digits sequentially, but since it requires a rational data type, I've not implemented it.`},inputs:["md"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});d({root:document.getElementById("cell-1521"),expanded:[],variables:[]},{id:1521,body:function(t){return t`## References

<div class="references">${t`
0. Bailey, D. H., *[The BBP Algorithm for Pi](https://www.davidhbailey.com/dhbpapers/bbp-alg.pdf).*
0. Bailey, D. H., [PSLQ: An Algorithm to Discover Integer Relations](https://www.davidhbailey.com/dhbpapers/pslq-comp-alg.pdf).
0. *[Pi with the BBP formula](https://literateprograms.org/pi_with_the_bbp_formula__python_.html)*, literateprograms.org.
0. *[Modular exponentiation](https://en.wikipedia.org/wiki/Modular_exponentiation)*, wikipedia.org.
`}`},inputs:["md"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});
