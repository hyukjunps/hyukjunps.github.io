(() => {
  'use strict';

  const IDS=['buttons','dday','homebg','panels'];
  const GAME_IDS=new Set(['gamecard','gamehud','resultfx','snake','mine','maze']);
  const PRODUCTS=[
    {id:'buttons',icon:'🔘',name:'버튼 디자인 팩',price:400,desc:'O.Poong 버튼 모양을 둥근·각진·글로우로 변경',variants:[['pill','둥근'],['square','각진'],['glow','글로우']]},
    {id:'dday',icon:'📅',name:'D-DAY 스킨',price:450,desc:'D-DAY 위젯을 티켓·네온·미니멀 스타일로',variants:[['ticket','티켓'],['neon','네온'],['minimal','미니멀']]},
    {id:'homebg',icon:'🌌',name:'홈 배경 팩',price:600,desc:'홈 화면 배경을 오로라·도트·스타필드로 변경',variants:[['aurora','오로라'],['dots','도트'],['stars','스타필드']]},
    {id:'panels',icon:'🪟',name:'패널 디자인 팩',price:700,desc:'홈 위젯과 패널을 소프트·아웃라인·다크글라스로',variants:[['soft','소프트'],['outline','아웃라인'],['darkglass','다크글라스']]}
  ];

  function addProducts(){
    try{
      if(typeof OPOONG_SHOP_PRODUCTS==='undefined'||!Array.isArray(OPOONG_SHOP_PRODUCTS))return false;
      for(let i=OPOONG_SHOP_PRODUCTS.length-1;i>=0;i--){
        if(GAME_IDS.has(OPOONG_SHOP_PRODUCTS[i]?.id))OPOONG_SHOP_PRODUCTS.splice(i,1);
      }
      PRODUCTS.forEach(item=>{if(!OPOONG_SHOP_PRODUCTS.some(x=>x.id===item.id))OPOONG_SHOP_PRODUCTS.push(item);});
      return true;
    }catch(_){return false;}
  }

  function style(){
    if(document.getElementById('opoongExpandedShopStyles'))return;
    const s=document.createElement('style');s.id='opoongExpandedShopStyles';s.textContent=`
html[data-shop-buttons="pill"] :is(.btn,.smallbtn,.bigBtn){border-radius:999px!important}
html[data-shop-buttons="square"] :is(.btn,.smallbtn,.bigBtn){border-radius:9px!important}
html[data-shop-buttons="glow"] :is(.btn,.smallbtn,.bigBtn){box-shadow:0 0 0 1px color-mix(in srgb,var(--pri) 34%,transparent),0 0 22px color-mix(in srgb,var(--pri) 22%,transparent)!important}
html[data-shop-dday="ticket"] .widget[data-home-widget="dday"]{border-style:dashed!important;border-width:2px!important}
html[data-shop-dday="neon"] .widget[data-home-widget="dday"]{box-shadow:0 0 26px color-mix(in srgb,var(--pri) 28%,transparent)!important;border-color:color-mix(in srgb,var(--pri) 52%,var(--line))!important}
html[data-shop-dday="minimal"] .widget[data-home-widget="dday"]{box-shadow:none!important;border-radius:14px!important;background:var(--card)!important}
html[data-shop-homebg="aurora"] body{background:radial-gradient(900px 500px at 10% 5%,rgba(34,211,238,.23),transparent 58%),radial-gradient(800px 520px at 92% 10%,rgba(168,85,247,.22),transparent 60%),linear-gradient(180deg,var(--bg2),var(--bg))!important}
html[data-shop-homebg="dots"] body:before{background-image:radial-gradient(color-mix(in srgb,var(--pri) 22%,transparent) 1.5px,transparent 1.5px)!important;background-size:22px 22px!important}
html[data-shop-homebg="stars"] body:before{background-image:radial-gradient(circle at 15% 20%,rgba(255,255,255,.8) 0 1px,transparent 2px),radial-gradient(circle at 72% 34%,rgba(255,255,255,.7) 0 1px,transparent 2px),radial-gradient(circle at 38% 78%,rgba(147,197,253,.75) 0 1px,transparent 2px)!important;background-size:72px 72px,96px 96px,128px 128px!important;background-color:#07111f22!important}
html[data-shop-panels="soft"] :is(.panel,.widget){border-radius:34px!important;box-shadow:0 18px 48px rgba(15,23,42,.08)!important}
html[data-shop-panels="outline"] :is(.panel,.widget){box-shadow:none!important;border:2px solid color-mix(in srgb,var(--pri) 28%,var(--line))!important}
html[data-shop-panels="darkglass"] :is(.panel,.widget){background:color-mix(in srgb,#0f172a 76%,transparent)!important;color:#e5e7eb!important;border-color:#334155!important;backdrop-filter:blur(18px)!important}`;
    document.head.appendChild(s);
  }

  function apply(){
    let shop=null;try{shop=window.loadOpoongShop?.();}catch(_){}
    IDS.forEach(id=>{
      const key='shop'+id.charAt(0).toUpperCase()+id.slice(1),value=shop?.equipped?.[id];
      if(value)document.documentElement.dataset[key]=value;else delete document.documentElement.dataset[key];
    });
    ['shopGamecard','shopGamehud','shopResultfx'].forEach(key=>{try{delete document.documentElement.dataset[key];}catch(_){}});
  }

  function wrapApply(){
    if(typeof window.applyOpoongShop!=='function')return false;
    if(window.applyOpoongShop.__expandedShop)return true;
    const base=window.applyOpoongShop;
    const fn=function(){const r=base.apply(this,arguments);apply();return r;};
    fn.__expandedShop=true;fn.__original=base;window.applyOpoongShop=fn;return true;
  }

  function install(){
    style();
    const products=addProducts(),wrapped=wrapApply();
    if(products){try{window.renderOpoongShopCatalog?.();}catch(_){}}
    apply();
    return products&&wrapped;
  }

  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer);},100);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
