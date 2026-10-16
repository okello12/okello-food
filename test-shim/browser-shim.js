'use strict';

// Minimal DOM/window shim so the browser-harness tests
// (snapshot-invariants-v1, category-rules-v1, product-data-v1) can run
// under node in CI. The tests only need an element to write results into,
// a window to attach APIs to, and a fetch that resolves local files.
//
// Usage: node test-shim/run-browser-test.js <test-name>
// The *.test.html harnesses are unchanged and still work in a browser.

const fs=require('fs');
const path=require('path');

const text={};
function makeElement(id){
  return {
    id,
    get innerHTML(){return text[id]||'';},
    set innerHTML(v){text[id]=String(v);},
    get textContent(){return (text[id]||'').replace(/<[^>]+>/g,'');},
    set textContent(v){text[id]=String(v);},
    dataset:{},
    querySelector(){return null;},
    querySelectorAll(){return [];},
    addEventListener(){},
    appendChild(){},
    setAttribute(){},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}}
  };
}
const elements={};
const documentShim={
  documentElement:{dataset:{},classList:{add(){},remove(){},contains(){return false;}}},
  body:makeElement('body'),
  head:makeElement('head'),
  getElementById(id){return elements[id]||(elements[id]=makeElement(id));},
  querySelector(){return null;},
  querySelectorAll(){return [];},
  createElement(tag){return makeElement(`<${tag}>`);},
  addEventListener(){},
  dispatchEvent(){return true;}
};

const windowShim={document:documentShim,localStorage:null};
// Local-file fetch: the tests fetch app.js and similar by relative path.
windowShim.fetch=async(url)=>{
  const file=String(url).split('?')[0];
  const p=path.resolve(process.cwd(),file);
  if(!fs.existsSync(p))return {ok:false,status:404,text:async()=>'',json:async()=>({})};
  const body=fs.readFileSync(p,'utf8');
  return {ok:true,status:200,text:async()=>body,json:async()=>JSON.parse(body)};
};
const store={};
windowShim.localStorage={
  getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,
  setItem:(k,v)=>{store[k]=String(v);},
  removeItem:k=>{delete store[k];},
  clear(){for(const k of Object.keys(store))delete store[k];}
};
windowShim.CustomEvent=class{constructor(type,init){this.type=type;this.detail=init&&init.detail;}};
windowShim.location={href:'http://localhost/',reload(){}};

module.exports={
  install(){
    global.window=windowShim;
    global.document=documentShim;
    // In a browser, bare `fetch` and `window.fetch` are the same binding, so a
    // test that stubs window.fetch expects the module's bare fetch() to see it.
    // Make the global a live alias rather than a copy.
    Object.defineProperty(global,'fetch',{
      configurable:true,
      get(){return windowShim.fetch;},
      set(v){windowShim.fetch=v;}
    });
    global.localStorage=windowShim.localStorage;
    global.CustomEvent=windowShim.CustomEvent;
    global.location=windowShim.location;
    return {window:windowShim,document:documentShim,text,elements};
  }
};
