// MeYeuBe · send-push Edge Function
// Gửi Web Push tới các thiết bị đã đăng ký trong public.push_subscriptions.
// Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
import webpush from "npm:web-push@3.6.7";

type PushSubRow={id:string;sync_id:string;device_id:string;endpoint:string;p256dh:string;auth:string;enabled:boolean;alert_types:any};
type AlertPayload={event_key?:string;rule_id?:string;severity?:string;title?:string;body?:string;icon?:string;url?:string;tag?:string};
const CORS={"access-control-allow-origin":"*","access-control-allow-headers":"authorization, x-client-info, apikey, content-type","access-control-allow-methods":"POST, OPTIONS"};
function json(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:{...CORS,"content-type":"application/json; charset=utf-8"}})}
function env(name:string, fallback=''){return Deno.env.get(name)||fallback}
function sbHeaders(){const key=env('SUPABASE_SERVICE_ROLE_KEY');return {apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'}}
function supabaseUrl(){return env('SUPABASE_URL').replace(/\/+$/,'')}
function accepted(sub:PushSubRow, ruleId:string){
  if(!ruleId)return true;
  const a=sub.alert_types;
  if(Array.isArray(a))return a.length===0 || a.includes(ruleId);
  if(a&&typeof a==='object')return a[ruleId]!==false;
  return true;
}
async function fetchSubscriptions(syncId:string,targetEndpoint?:string){
  let url=`${supabaseUrl()}/rest/v1/push_subscriptions?sync_id=eq.${encodeURIComponent(syncId)}&enabled=eq.true&select=*`;
  if(targetEndpoint)url+=`&endpoint=eq.${encodeURIComponent(targetEndpoint)}`;
  const res=await fetch(url,{headers:sbHeaders()});
  if(!res.ok)throw new Error(`Fetch subscriptions ${res.status}: ${await res.text()}`);
  return await res.json() as PushSubRow[];
}
async function reserveDelivery(subscriptionId:string,eventKey:string){
  if(!eventKey)return true;
  const url=`${supabaseUrl()}/rest/v1/push_delivery_log`;
  const res=await fetch(url,{method:'POST',headers:{...sbHeaders(),Prefer:'return=minimal'},body:JSON.stringify({subscription_id:subscriptionId,event_key:eventKey,status:'reserved'})});
  if(res.status===409)return false;
  if(!res.ok)throw new Error(`Reserve delivery ${res.status}: ${await res.text()}`);
  return true;
}
async function markDelivery(subscriptionId:string,eventKey:string,status:string,error=''){
  if(!eventKey)return;
  const url=`${supabaseUrl()}/rest/v1/push_delivery_log?subscription_id=eq.${encodeURIComponent(subscriptionId)}&event_key=eq.${encodeURIComponent(eventKey)}`;
  await fetch(url,{method:'PATCH',headers:{...sbHeaders(),Prefer:'return=minimal'},body:JSON.stringify({status,error_message:error||null,sent_at:new Date().toISOString()})}).catch(()=>{});
}
async function disableSubscription(endpoint:string){
  const url=`${supabaseUrl()}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`;
  await fetch(url,{method:'PATCH',headers:{...sbHeaders(),Prefer:'return=minimal'},body:JSON.stringify({enabled:false,updated_at:new Date().toISOString()})}).catch(()=>{});
}
async function sendOne(sub:PushSubRow, payload:any, eventKey:string){
  const reserved=await reserveDelivery(sub.id,eventKey);
  if(!reserved)return {skipped:true,reason:'duplicate'};
  const subscription={endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}};
  try{
    await webpush.sendNotification(subscription,JSON.stringify(payload));
    await markDelivery(sub.id,eventKey,'sent');
    return {sent:true};
  }catch(e:any){
    const code=Number(e?.statusCode||e?.status||0);
    const msg=String(e?.body||e?.message||e||'');
    await markDelivery(sub.id,eventKey,'failed',msg.slice(0,500));
    if(code===404||code===410)await disableSubscription(sub.endpoint);
    return {failed:true,statusCode:code,error:msg.slice(0,300)};
  }
}
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
  if(req.method!=='POST')return json({error:'POST only'},405);
  try{
    const publicKey=env('VAPID_PUBLIC_KEY'),privateKey=env('VAPID_PRIVATE_KEY'),subject=env('VAPID_SUBJECT','mailto:admin@example.com');
    if(!publicKey||!privateKey)throw new Error('Missing VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
    webpush.setVapidDetails(subject,publicKey,privateKey);
    const body=await req.json().catch(()=>({}));
    const syncId=String(body.sync_id||'').trim();
    if(!syncId)throw new Error('Missing sync_id');
    const subs=await fetchSubscriptions(syncId,body.target_endpoint?String(body.target_endpoint):undefined);
    const alerts:Array<AlertPayload>=Array.isArray(body.alerts)&&body.alerts.length?body.alerts:[body.payload?{...body.payload,event_key:body.payload.event_key||body.payload.tag||`test:${Date.now()}`,rule_id:body.rule_id||'test'}:{event_key:`test:${Date.now()}`,rule_id:'test',title:'Mẹ Yêu Bé',body:'Thông báo thử'}];
    let matched=0,sent=0,skipped=0,failed=0,expired=0;const failures:any[]=[];
    for(const alert of alerts){
      const ruleId=String(alert.rule_id||'');
      const eventKey=String(alert.event_key||alert.tag||`${ruleId}:${Date.now()}`);
      for(const sub of subs){
        if(!accepted(sub,ruleId)){skipped++;continue;}
        matched++;
        const payload={title:alert.title||'Mẹ Yêu Bé',body:alert.body||'Có cảnh báo mới cần chú ý.',icon:alert.icon||'./icon-192.png',badge:'./icon-192.png',tag:alert.tag||eventKey,renotify:true,url:alert.url||'./index.html?openAlertCenter=1',ruleId,eventKey};
        const r=await sendOne(sub,payload,eventKey);
        if(r.sent)sent++; else if(r.skipped)skipped++; else {failed++; failures.push({endpoint:sub.endpoint,statusCode:r.statusCode,error:r.error}); if(r.statusCode===404||r.statusCode===410)expired++;}
      }
    }
    return json({ok:true,matched_subscriptions:matched,total_subscriptions:subs.length,sent,skipped,failed,expired,failures});
  }catch(e:any){return json({ok:false,error:String(e?.message||e)},500)}
});
