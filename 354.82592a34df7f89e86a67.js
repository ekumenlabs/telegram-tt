(()=>{"use strict";"undefined"!=typeof window&&window.innerHeight,Math.round(425),new Set(["newMessage","newScheduledMessage","deleteMessages","deleteScheduledMessages","deleteHistory"]);const e=new Set(["image/png","image/gif","image/jpeg"]),t=new Set(["video/mp4"]);new Set([...e,...t]),new Set(["AU","BD","CA","CO","EG","HN","IE","IN","JO","MX","MY","NI","NZ","PH","PK","SA","SV","US"]),self.onerror=e=>{console.error(e),n({type:"unhandledError",error:{message:e.error.message||"Uncaught exception in worker"}})},self.addEventListener("unhandledrejection",(e=>{console.error(e),n({type:"unhandledError",error:{message:e.reason.message||"Uncaught rejection in worker"}})}));const r=new Map;function n(e,t){t?postMessage(e,t):postMessage(e)}let a;self.importScripts("rlottie-wasm.js");const s=new Promise((e=>{Module.onRuntimeInitialized=()=>{a={init:Module.cwrap("lottie_init","",[]),destroy:Module.cwrap("lottie_destroy","",["number"]),resize:Module.cwrap("lottie_resize","",["number","number","number"]),buffer:Module.cwrap("lottie_buffer","number",["number"]),render:Module.cwrap("lottie_render","",["number","number"]),loadFromData:Module.cwrap("lottie_load_from_data","number",["number","number"])},e()}})),o=new Map;var i;i={init:async function(e,t,r,n,i,c){a||await s;const d=JSON.stringify(t),l=allocate(intArrayFromString(d),"i8",0),m=a.init(),u=a.loadFromData(m,l);a.resize(m,r,r),o.set(e,{imgSize:r,reduceFactor:i,handle:m}),c(Math.ceil(u/i))},changeData:async function(e,t,r){a||await s;const n=JSON.stringify(t),{reduceFactor:i,handle:c}=o.get(e),d=allocate(intArrayFromString(n),"i8",0),l=a.loadFromData(c,d);r(Math.ceil(l/i))},renderFrames:async function(e,t,r,n){a||await s;const{imgSize:i,reduceFactor:c,handle:d}=o.get(e);for(let e=t;e<=r;e++){const t=e*c;a.render(d,t);const r=a.buffer(d),s=Module.HEAPU8.subarray(r,r+i*i*4);n(e,new Uint8ClampedArray(s).buffer)}},destroy:function(e){const t=o.get(e);a.destroy(t.handle),o.delete(e)}},onmessage=async e=>{const{data:t}=e;switch(t.type){case"callMethod":{const{messageId:e,name:a,args:s}=t;try{if(e){const t=(...t)=>{const r=t[t.length-1];n({type:"methodCallback",messageId:e,callbackArgs:t},r instanceof ArrayBuffer?[r]:void 0)};r.set(e,t),s.push(t)}const[t,o]=await i[a](...s)||[];e&&n({type:"methodResponse",messageId:e,response:t},o)}catch(t){e&&n({type:"methodResponse",messageId:e,error:{message:t.message}})}e&&r.delete(e);break}case"cancelProgress":{const e=r.get(t.messageId);e&&(e.isCanceled=!0);break}}}})();
//# sourceMappingURL=354.82592a34df7f89e86a67.js.map