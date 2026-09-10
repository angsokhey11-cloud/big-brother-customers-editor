/* BIG BROTHER — Customers Editor Dual Currency Pricing V1.1 */
(function(){
  'use strict';

  const byId=id=>document.getElementById(id);
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
  const fmtUSD=v=>'$'+n(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4});
  const fmtKHR=v=>'៛'+Math.round(n(v)).toLocaleString('en-US');

  function normalizeItem(item){
    item.defaultPriceUSD=n(item.defaultPriceUSD);
    item.customerPriceUSD=n(item.customerPriceUSD ?? item.defaultPriceUSD);
    item.defaultPriceKHR=n(item.defaultPriceKHR);
    item.customerPriceKHR=n(item.customerPriceKHR ?? item.defaultPriceKHR);
    item.isCustomPriceUSD=Math.abs(item.customerPriceUSD-item.defaultPriceUSD)>.0000001;
    item.isCustomPriceKHR=Math.abs(item.customerPriceKHR-item.defaultPriceKHR)>.0000001;
    item.isCustomPrice=item.isCustomPriceUSD||item.isCustomPriceKHR;
    return item;
  }

  function priceBadge(item){
    const labels=[];
    if(item.isCustomPriceUSD)labels.push('USD');
    if(item.isCustomPriceKHR)labels.push('KHR');
    return labels.length
      ?'<span class="price-diff">CUSTOM '+labels.join(' + ')+'</span>'
      :'<span class="badge green">DEFAULT</span>';
  }

  window.bbCustomerPriceChanged=function(index,currency,value){
    const item=state.prices[index];
    if(!item)return;
    normalizeItem(item);
    if(currency==='KHR')item.customerPriceKHR=n(value);
    else item.customerPriceUSD=n(value);
    item.resetToDefault=false;
    normalizeItem(item);
    state.priceDirty.add(item.productCode);
    const row=byId('priceRow'+index);
    if(row)row.classList.toggle('custom',item.isCustomPrice);
    const type=byId('priceType'+index);
    if(type)type.innerHTML=priceBadge(item);
  };

  renderPriceTable=function(){
    byId('priceCount').textContent=state.prices.length+' Products';
    state.prices.forEach(normalizeItem);
    byId('priceTableBody').innerHTML=state.prices.length
      ?state.prices.map((item,index)=>
        '<tr class="'+(item.isCustomPrice?'custom':'')+'" id="priceRow'+index+'">'+
        '<td><strong>'+esc(item.productCode)+'</strong></td>'+
        '<td>'+esc(item.productName)+'</td>'+
        '<td>'+esc(item.unit||'—')+'</td>'+
        '<td class="price-default">'+fmtUSD(item.defaultPriceUSD)+'</td>'+
        '<td><input type="number" min="0" step="0.01" value="'+item.customerPriceUSD+'" oninput="bbCustomerPriceChanged('+index+',\'USD\',this.value)"></td>'+
        '<td class="price-default money-khr">'+fmtKHR(item.defaultPriceKHR)+'</td>'+
        '<td><input type="number" min="0" step="100" value="'+item.customerPriceKHR+'" oninput="bbCustomerPriceChanged('+index+',\'KHR\',this.value)"></td>'+
        '<td id="priceType'+index+'">'+priceBadge(item)+'</td>'+
        '<td><button class="row-btn" onclick="resetPrice('+index+')">Reset Default</button></td>'+
        '</tr>'
      ).join('')
      :'<tr><td colspan="9" class="empty">No active products found.</td></tr>';
  };

  resetPrice=function(index){
    const item=state.prices[index];
    if(!item)return;
    normalizeItem(item);
    item.customerPriceUSD=item.defaultPriceUSD;
    item.customerPriceKHR=item.defaultPriceKHR;
    item.resetToDefault=true;
    item.isCustomPriceUSD=false;
    item.isCustomPriceKHR=false;
    item.isCustomPrice=false;
    state.priceDirty.add(item.productCode);
    renderPriceTable();
  };

  resetAllPrices=function(){
    state.prices.forEach(item=>{
      normalizeItem(item);
      item.customerPriceUSD=item.defaultPriceUSD;
      item.customerPriceKHR=item.defaultPriceKHR;
      item.resetToDefault=true;
      item.isCustomPriceUSD=false;
      item.isCustomPriceKHR=false;
      item.isCustomPrice=false;
      state.priceDirty.add(item.productCode);
    });
    renderPriceTable();
  };

  savePrices=async function(){
    if(!state.selected)return;
    if(!state.priceDirty.size)return toast('No customer price changes to save.');

    const prices=state.prices
      .filter(item=>state.priceDirty.has(item.productCode))
      .map(item=>{
        normalizeItem(item);
        return {
          productCode:item.productCode,
          priceUSD:item.customerPriceUSD,
          priceKHR:item.customerPriceKHR,
          resetToDefault:item.resetToDefault===true
        };
      });

    const button=byId('priceSaveBtn');
    if(button){button.disabled=true;button.textContent='Saving Prices…';}
    try{
      const result=await apiPost('saveCustomerPrices',{customerId:state.selected.customerId,prices});
      if(result.revision)state.revision=String(result.revision);
      if(result.catalog&&Array.isArray(result.catalog.products))state.prices=result.catalog.products.map(normalizeItem);
      state.priceDirty.clear();
      renderPriceTable();
      if(typeof savePriceCache==='function')savePriceCache(state.selected.customerId);
      if(typeof saveMainCache==='function')saveMainCache();
      toast((result.savedCount||prices.length)+' product prices saved in USD + KHR.');
    }catch(error){
      toast(error.message||String(error),true);
    }finally{
      if(button){button.disabled=false;button.textContent='Save Customer Prices';}
    }
  };

  function upgradeHeader(){
    const body=byId('priceTableBody');
    const row=body?.closest('table')?.querySelector('thead tr');
    if(!row)return;
    row.innerHTML='<th>Product Code</th><th>Product Name</th><th>Unit</th><th>Default Price USD</th><th>Customer Price USD</th><th>Default Price KHR</th><th>Customer Price KHR</th><th>Price Type</th><th>Action</th>';
    const info=body.closest('.section')?.querySelector('.info.amber');
    if(info)info.innerHTML='Default USD and KHR prices come from Products. Changing a customer price affects only this customer. Reset restores both current default prices.';
  }

  function upgradeAddInfo(){
    const add=byId('addForm')?.closest('.card-body')?.querySelector('.info.blue');
    if(add)add.innerHTML='When saved, all active products are added to this customer using each product’s default Price USD <strong>and</strong> default Price KHR. Individual prices can be changed later in All Customer Details.';
  }

  function addImportButton(){
    if(byId('bbImportCustomersBtn'))return;
    const save=byId('addSaveBtn');
    const actions=save?.closest('.actions');
    if(!actions)return;
    const button=document.createElement('button');
    button.type='button';
    button.id='bbImportCustomersBtn';
    button.className='btn primary';
    button.textContent='⬆ Import Excel';
    button.title='Import a customer list from Excel or CSV';
    button.addEventListener('click',()=>{
      const embedded=new URLSearchParams(location.search).get('embed')==='1';
      location.href='import-customers.html'+(embedded?'?embed=1':'');
    });
    actions.insertBefore(button,save);
  }

  upgradeHeader();
  upgradeAddInfo();
  addImportButton();
  try{if(Array.isArray(state.prices)&&state.prices.length)renderPriceTable();}catch(_){}
})();
