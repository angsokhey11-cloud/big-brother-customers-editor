/** Big Brother Master Database — Clients Editor API
 * Paste this into the Apps Script project attached to the Master Database.
 * Required sheets: Clients, Client Products, Client Prices.
 */
const CLIENT_EDITOR={
  clients:'Clients', products:'Client Products', prices:'Client Prices',
  clientHeaders:['Client ID','Client Name','Phone','Contact Person','Address','Payment Term','Currency','Active','Note','Created At','Updated At'],
  productHeaders:['Product Code','Product Name','Unit','Active'],
  priceHeaders:['Client ID','Product Code','Price','Currency','Active','Updated At']
};

function doPost(e){
  try{
    const q=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    const routes={clientEditorBootstrap_:clientEditorBootstrap_,clientEditorSaveClient_:clientEditorSaveClient_,clientEditorPrices_:clientEditorPrices_,clientEditorSavePrices_:clientEditorSavePrices_};
    const fn=routes[q.action+'_']; if(!fn)throw new Error('Unknown action: '+q.action);
    return json_({ok:true,...fn(q)});
  }catch(err){return json_({ok:false,error:String(err&&err.message||err)});}
}
function doGet(){return json_({ok:true,name:'Big Brother Clients Editor API'});}
function json_(v){return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}

function clientEditorBootstrap_(){return {clients:readObjects_(CLIENT_EDITOR.clients,CLIENT_EDITOR.clientHeaders).map(clientOut_),products:readObjects_(CLIENT_EDITOR.products,CLIENT_EDITOR.productHeaders).filter(x=>bool_(x['Active'],true)).map(productOut_)};}
function clientEditorPrices_(q){if(!q.clientId)throw new Error('Client ID is required.');return {prices:readObjects_(CLIENT_EDITOR.prices,CLIENT_EDITOR.priceHeaders).filter(x=>String(x['Client ID'])===String(q.clientId)).map(priceOut_)};}

function clientEditorSaveClient_(q){
  const c=q.client||{}, id=clean_(c.clientId), name=clean_(c.clientName); if(!id||!name)throw new Error('Client ID and Client Name are required.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const sh=sheet_(CLIENT_EDITOR.clients,CLIENT_EDITOR.clientHeaders),data=sh.getDataRange().getValues(),h=data[0].map(String),idCol=h.indexOf('Client ID');
    let row=0;for(let i=1;i<data.length;i++)if(String(data[i][idCol]).trim()===id){row=i+1;break;}
    const original=clean_(q.originalClientId);if(!original&&row)throw new Error('Client ID already exists: '+id);if(original&&!row)throw new Error('Client was not found: '+original);
    const now=new Date(), old=row?objectFrom_(h,data[row-1]):{};
    const obj={'Client ID':id,'Client Name':name,'Phone':clean_(c.phone),'Contact Person':clean_(c.contactPerson),'Address':clean_(c.address),'Payment Term':clean_(c.paymentTerm),'Currency':clean_(c.currency)||'USD','Active':bool_(c.active,true),'Note':clean_(c.note),'Created At':old['Created At']||now,'Updated At':now};
    const values=h.map(x=>obj[x]!==undefined?obj[x]:(old[x]||''));if(row)sh.getRange(row,1,1,h.length).setValues([values]);else sh.appendRow(values);
    return {client:clientOut_(obj)};
  }finally{lock.releaseLock();}
}

function clientEditorSavePrices_(q){
  const clientId=clean_(q.clientId),prices=Array.isArray(q.prices)?q.prices:[];if(!clientId)throw new Error('Client ID is required.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const sh=sheet_(CLIENT_EDITOR.prices,CLIENT_EDITOR.priceHeaders),data=sh.getDataRange().getValues(),h=data[0].map(String),ci=h.indexOf('Client ID'),pi=h.indexOf('Product Code'),existing={};
    for(let i=1;i<data.length;i++)existing[String(data[i][ci])+'\u0000'+String(data[i][pi])]=i+1;
    prices.forEach(p=>{const code=clean_(p.productCode);if(!code)return;const obj={'Client ID':clientId,'Product Code':code,'Price':Number(p.price)||0,'Currency':clean_(p.currency)||'USD','Active':bool_(p.active,true),'Updated At':new Date()},values=h.map(x=>obj[x]!==undefined?obj[x]:'');const row=existing[clientId+'\u0000'+code];if(row)sh.getRange(row,1,1,h.length).setValues([values]);else sh.appendRow(values);});
    return {saved:prices.length};
  }finally{lock.releaseLock();}
}

function sheet_(name,headers){const ss=SpreadsheetApp.getActive(),sh=ss.getSheetByName(name);if(!sh)throw new Error('Missing sheet: '+name);if(sh.getLastRow()===0)sh.getRange(1,1,1,headers.length).setValues([headers]);return sh;}
function readObjects_(name,headers){const sh=sheet_(name,headers),v=sh.getDataRange().getValues();if(v.length<2)return[];const h=v[0].map(String);return v.slice(1).filter(r=>r.some(x=>x!==''&&x!==null)).map(r=>objectFrom_(h,r));}
function objectFrom_(h,r){const o={};h.forEach((x,i)=>o[x]=r[i]);return o;}
function clean_(v){return String(v==null?'':v).trim();}
function bool_(v,def){if(v===''||v==null)return def;return v===true||String(v).toUpperCase()==='TRUE'||String(v)==='1';}
function clientOut_(x){return {clientId:clean_(x['Client ID']),clientName:clean_(x['Client Name']),phone:clean_(x['Phone']),contactPerson:clean_(x['Contact Person']),address:clean_(x['Address']),paymentTerm:clean_(x['Payment Term']),currency:clean_(x['Currency'])||'USD',active:bool_(x['Active'],true),note:clean_(x['Note'])};}
function productOut_(x){return {productCode:clean_(x['Product Code']),productName:clean_(x['Product Name']),unit:clean_(x['Unit']),active:bool_(x['Active'],true)};}
function priceOut_(x){return {clientId:clean_(x['Client ID']),productCode:clean_(x['Product Code']),price:Number(x['Price'])||0,currency:clean_(x['Currency'])||'USD',active:bool_(x['Active'],true)};}
