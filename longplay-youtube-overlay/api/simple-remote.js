const sessions=globalThis.__musicSimpleSessions||(globalThis.__musicSimpleSessions=new Map());
const json=(res,status,obj)=>{res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.end(JSON.stringify(obj))};
const clean=s=>String(s||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,120);
export default async function handler(req,res){
 try{
  if(req.method==='POST'){
   let body=req.body||{};if(typeof body==='string'){try{body=JSON.parse(body)}catch{body={}}}
   if(body.action!=='send')return json(res,400,{ok:false,error:'bad_action'});
   const session=clean(body.session),t=body.track||{},id=String(t.id||'').replace(/^youtube:/,'').trim();
   if(!session||!id)return json(res,400,{ok:false,error:'missing_data'});
   const track={id,title:String(t.title||'').slice(0,300),uploader:String(t.uploader||'').slice(0,200),duration:Number(t.duration||0)||0,thumbnail:String(t.thumbnail||'').slice(0,1000)};
   const seq=Date.now();sessions.set(session,{seq,track,expires:Date.now()+6*60*60*1000});
   return json(res,200,{ok:true,seq});
  }
  if(req.method==='GET'){
   const u=new URL(req.url,'http://localhost'),session=clean(u.searchParams.get('session')),item=sessions.get(session);
   if(item&&item.expires<Date.now()){sessions.delete(session);return json(res,200,{ok:true,seq:0,track:null})}
   return json(res,200,{ok:true,seq:item?.seq||0,track:item?.track||null});
  }
  return json(res,405,{ok:false,error:'method_not_allowed'});
 }catch(e){return json(res,500,{ok:false,error:'server_error'})}
}