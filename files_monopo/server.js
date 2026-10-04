const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{WebSocketServer}=require('ws');
const DIR=process.env.DATA_DIR||__dirname,F=path.join(DIR,'users.json');
let DB={users:{},sess:{}};try{DB=JSON.parse(fs.readFileSync(F))}catch(e){}
const saveDB=()=>{try{fs.writeFileSync(F,JSON.stringify(DB))}catch(e){}};
const hash=(p,s)=>crypto.scryptSync(p,s,32).toString('hex'),rnd=n=>crypto.randomBytes(n).toString('hex');
const pub=u=>({n:u.n,w:u.w,g:u.g}),tries={};
const body=req=>new Promise(r=>{let b='';req.on('data',c=>{b+=c;if(b.length>1e4)req.destroy()});req.on('end',()=>{try{r(JSON.parse(b))}catch(e){r({})}})});
const server=http.createServer(async(req,res)=>{
 const j=(o,c=200)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
 if(req.method=='POST'&&req.url.startsWith('/api/')){
  const b=await body(req),ip=req.socket.remoteAddress;
  if(req.url=='/api/auth'){
   tries[ip]=(tries[ip]||0)+1;setTimeout(()=>tries[ip]--,60000);if(tries[ip]>20)return j({e:'Слишком много попыток, подожди минуту'},429);
   const n=String(b.name||'').trim(),k=n.toLowerCase(),p=String(b.pass||'');
   if(!/^[\p{L}\p{N}_ -]{2,16}$/u.test(n))return j({e:'Имя: 2–16 символов (буквы, цифры, _ -)'},400);
   if(p.length<4||p.length>100)return j({e:'Пароль: минимум 4 символа'},400);
   let u=DB.users[k];
   if(b.mode=='reg'){if(u)return j({e:'Такое имя уже занято'},409);const s=rnd(8);u=DB.users[k]={n,s,h:hash(p,s),w:0,g:0}}
   else if(!u||u.h!==hash(p,u.s))return j({e:'Неверное имя или пароль'},401);
   const t=rnd(24);DB.sess[t]=k;saveDB();return j({token:t,user:pub(u)});
  }
  const u=DB.users[DB.sess[b.token]];if(!u)return j({e:'auth'},401);
  if(req.url=='/api/me')return j({user:pub(u)});
  if(req.url=='/api/result'){u.g++;if(b.won)u.w++;saveDB();return j({user:pub(u)})}
  return j({},404);
 }
 fs.readFile(path.join(__dirname,'public','index.html'),(e,d)=>{res.writeHead(e?500:200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(d)});
});
const rooms=new Map(),wss=new WebSocketServer({server,path:'/ws'});
const snd=(w,o)=>w.readyState==1&&w.send(JSON.stringify(o));
const info=rm=>{const o={t:'room',code:rm.code,host:rm.host.user,members:[...rm.m].map(w=>w.user)};rm.m.forEach(w=>snd(w,o))};
function leave(ws){const rm=ws.room;if(!rm)return;ws.room=null;rm.m.delete(ws);
 if(rm.host==ws){rm.m.forEach(w=>{w.room=null;snd(w,{t:'closed'})});rooms.delete(rm.code)}
 else{snd(rm.host,{t:'left',name:ws.user});if(!rm.started)info(rm)}}
wss.on('connection',ws=>{
 ws.alive=true;ws.on('pong',()=>ws.alive=true);
 ws.on('message',d=>{let m;try{m=JSON.parse(d)}catch(e){return}
  if(m.t=='hi'){const u=DB.users[DB.sess[m.token]];if(!u)return snd(ws,{t:'err',m:'Сессия недействительна, войди заново'});ws.user=u.n;return}
  if(!ws.user)return;
  const err=x=>snd(ws,{t:'err',m:x});
  if(m.t=='create'){leave(ws);let c;do c=rnd(3).toUpperCase();while(rooms.has(c));const rm={code:c,host:ws,m:new Set([ws]),started:false};rooms.set(c,rm);ws.room=rm;info(rm)}
  else if(m.t=='join'){const rm=rooms.get(String(m.code||'').toUpperCase().trim());
   if(!rm)return err('Комната не найдена');if(rm.started)return err('Игра уже идёт');if(rm.m.size>=6)return err('Комната заполнена');
   if([...rm.m].some(w=>w.user==ws.user))return err('Этот аккаунт уже в комнате');
   leave(ws);rm.m.add(ws);ws.room=rm;info(rm)}
  else if(m.t=='state'&&ws.room&&ws.room.host==ws){ws.room.started=true;ws.room.m.forEach(w=>w!=ws&&snd(w,{t:'state',s:m.s}))}
  else if(m.t=='act'&&ws.room&&ws.room.host!=ws)snd(ws.room.host,{t:'act',from:ws.user,a:String(m.a).slice(0,8)});
  else if(m.t=='leave')leave(ws);
 });
 ws.on('close',()=>leave(ws));
});
setInterval(()=>wss.clients.forEach(w=>{if(!w.alive)return w.terminate();w.alive=false;w.ping()}),30000);
server.listen(process.env.PORT||3000,()=>console.log('Monopoly on :'+(process.env.PORT||3000)));
