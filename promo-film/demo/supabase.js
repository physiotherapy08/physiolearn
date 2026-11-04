(function(){
var LS=localStorage;
function sess(){return LS.getItem('mock.signed')?{user:{id:'demo',email:'student@demo.app',user_metadata:{name:'طالب تجريبي'}}}:null}
window.supabase={createClient:function(){return {
 from:function(t){
  if(t==='progress'){var q={select:function(){return q},eq:function(){return q},maybeSingle:async function(){return {data:null,error:null}},upsert:async function(){return {error:null}},order:async function(){return {data:[],error:null}}};return q}
  var q={select:function(){return q},range:async function(){return {data:window.__ROWS,error:null}},upsert:async function(){return {error:null}}};return q},
 channel:function(){var ch={on:function(){return ch},subscribe:function(cb){setTimeout(()=>cb('SUBSCRIBED'),10);return ch}};return ch},
 auth:{getSession:async function(){return {data:{session:sess()}}},onAuthStateChange:function(){},signOut:async function(){},signUp:async function(){return {data:{},error:null}},signInWithPassword:async function(){return {data:{},error:null}}},
 storage:{from:function(){return {}}}}}};
})();
