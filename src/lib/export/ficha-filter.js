export const FICHA_FILTER_SCRIPT = `(function(){
  function init(root){
    var search=root.querySelector('[data-ficha-search]');
    var filters=Array.prototype.slice.call(root.querySelectorAll('[data-ficha-filter]'));
    var cards=Array.prototype.slice.call(root.querySelectorAll('[data-ficha-card]'));
    var count=root.querySelector('[data-ficha-count]');
    var empty=root.querySelector('[data-ficha-empty]');
    function apply(){
      var query=(search&&search.value||'').trim().toLowerCase();
      var active=filters.map(function(select){return [select.getAttribute('data-ficha-filter'), (select.value||'').toLowerCase()];}).filter(function(item){return item[1];});
      var shown=0;
      cards.forEach(function(card){
        var matches=(!query||(card.getAttribute('data-ficha-search')||'').indexOf(query)!==-1)&&active.every(function(item){return (card.getAttribute('data-ficha-field-'+item[0])||'')===item[1];});
        card.hidden=!matches;
        if(matches)shown+=1;
      });
      if(count)count.textContent=String(shown);
      if(empty)empty.hidden=shown!==0;
    }
    if(search)search.addEventListener('input',apply);
    filters.forEach(function(select){select.addEventListener('change',apply);});
    apply();
  }
  function start(){
    Array.prototype.forEach.call(document.querySelectorAll('[data-ficha-collection]'),init);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
})();`;
