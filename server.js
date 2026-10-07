const express=require('express');
const session=require('express-session');
const pgSession=require('connect-pg-simple')(session);
const {Pool}=require('pg');
const path=require('path');
const fs=require('fs');

const app=express();
const PORT=process.env.PORT||3000;
const ROOT=__dirname;
fs.mkdirSync(path.join(ROOT,'public','uploads'),{recursive:true});

const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='false'?false:{rejectUnauthorized:false}});
const q=(text,params=[])=>pool.query(text,params);

async function init(){
 await q(`CREATE TABLE IF NOT EXISTS admins(id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL)`);
 await q(`CREATE TABLE IF NOT EXISTS products(id SERIAL PRIMARY KEY,title TEXT NOT NULL,description TEXT DEFAULT '',price TEXT DEFAULT 'عند الطلب',category TEXT DEFAULT 'حسابات PUBG',image TEXT DEFAULT '',badge TEXT DEFAULT 'متاح',active BOOLEAN DEFAULT TRUE,created_at TIMESTAMPTZ DEFAULT NOW())`);
 await q(`CREATE TABLE IF NOT EXISTS visitors(id SERIAL PRIMARY KEY,ip TEXT,ua TEXT,path TEXT,created_at TIMESTAMPTZ DEFAULT NOW())`);
 await q(`CREATE TABLE IF NOT EXISTS orders(id SERIAL PRIMARY KEY,product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,name TEXT,phone TEXT,note TEXT,status TEXT DEFAULT 'جديد',created_at TIMESTAMPTZ DEFAULT NOW())`);
 const a=await q('SELECT 1 FROM admins LIMIT 1');
 if(!a.rowCount) await q('INSERT INTO admins(username,password) VALUES($1,$2)',[process.env.ADMIN_USERNAME||'admin',process.env.ADMIN_PASSWORD||'MK2026']);
 const p=await q('SELECT 1 FROM products LIMIT 1');
 if(!p.rowCount){
  await q('INSERT INTO products(title,description,price,badge) VALUES($1,$2,$3,$4)', ['حساب PUBG مميز','مستوى وعناصر متنوعة — تواصل لمعرفة التفاصيل','عند الطلب','متاح']);
  await q('INSERT INTO products(title,description,price,badge) VALUES($1,$2,$3,$4)', ['حساب ببجي أسطوري','عناصر نادرة وتشكيلة مميزة','عند الطلب','مميز']);
  await q('INSERT INTO products(title,description,price,badge) VALUES($1,$2,$3,$4)', ['شحن شدات PUBG','طلبات شحن UC حسب الخدمة المتاحة','عند الطلب','متاح']);
 }
}

app.use(express.json({limit:'2mb'}));
app.use(express.urlencoded({extended:true}));
app.use(session({secret:process.env.SESSION_SECRET||'change-this-secret',resave:false,saveUninitialized:false,store:new pgSession({pool,tableName:'user_sessions',createTableIfMissing:true}),cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:1000*60*60*8}}));
app.use(express.static(path.join(ROOT,'public')));
function auth(req,res,next){if(req.session.admin)return next();res.status(401).json({error:'غير مصرح'});}
app.use(async(req,res,next)=>{try{if(!req.path.startsWith('/api/admin')&&!req.path.startsWith('/api/auth')) await q('INSERT INTO visitors(ip,ua,path) VALUES($1,$2,$3)',[(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0],req.headers['user-agent']||'',req.path]);next();}catch(e){next();}});

app.get('/api/products',async(req,res)=>{const r=await q('SELECT * FROM products WHERE active=true ORDER BY id DESC');res.json(r.rows);});
app.post('/api/orders',async(req,res)=>{const {product_id,name,phone,note}=req.body||{};if(!name||!phone)return res.status(400).json({error:'الاسم والرقم مطلوبان'});await q('INSERT INTO orders(product_id,name,phone,note) VALUES($1,$2,$3,$4)',[product_id||null,name,phone,note||'']);res.json({ok:true});});
app.post('/api/auth/login',async(req,res)=>{const {username,password}=req.body||{};const r=await q('SELECT * FROM admins WHERE username=$1 AND password=$2',[username,password]);if(!r.rowCount)return res.status(401).json({error:'بيانات الدخول غير صحيحة'});req.session.admin={id:r.rows[0].id,username:r.rows[0].username};res.json({ok:true,username:r.rows[0].username});});
app.post('/api/auth/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/auth/me',(req,res)=>res.json({loggedIn:!!req.session.admin,username:req.session.admin?.username||null}));
app.get('/api/admin/stats',auth,async(req,res)=>{const [p,v,o,av]=await Promise.all([q('SELECT COUNT(*) c FROM products WHERE active=true'),q("SELECT COUNT(*) c FROM visitors WHERE created_at>=NOW()-INTERVAL '1 day'"),q("SELECT COUNT(*) c FROM orders WHERE status='جديد'"),q('SELECT COUNT(*) c FROM visitors')]);res.json({products:Number(p.rows[0].c),visitors:Number(v.rows[0].c),orders:Number(o.rows[0].c),allVisitors:Number(av.rows[0].c)});});
app.get('/api/admin/products',auth,async(req,res)=>res.json((await q('SELECT * FROM products ORDER BY id DESC')).rows));
app.post('/api/admin/products',auth,async(req,res)=>{const {title,description,price,category,image,badge,active}=req.body||{};if(!title)return res.status(400).json({error:'اسم الحساب مطلوب'});const r=await q('INSERT INTO products(title,description,price,category,image,badge,active) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[title,description||'',price||'عند الطلب',category||'حسابات PUBG',image||'',badge||'متاح',active===0?false:true]);res.json({id:r.rows[0].id});});
app.put('/api/admin/products/:id',auth,async(req,res)=>{const {title,description,price,category,image,badge,active}=req.body||{};await q('UPDATE products SET title=$1,description=$2,price=$3,category=$4,image=$5,badge=$6,active=$7 WHERE id=$8',[title,description||'',price||'عند الطلب',category||'حسابات PUBG',image||'',badge||'متاح',!!active,req.params.id]);res.json({ok:true});});
app.delete('/api/admin/products/:id',auth,async(req,res)=>{await q('DELETE FROM products WHERE id=$1',[req.params.id]);res.json({ok:true});});
app.get('/api/admin/orders',auth,async(req,res)=>res.json((await q('SELECT orders.*,products.title product_title FROM orders LEFT JOIN products ON products.id=orders.product_id ORDER BY orders.id DESC')).rows));
app.put('/api/admin/orders/:id',auth,async(req,res)=>{await q('UPDATE orders SET status=$1 WHERE id=$2',[req.body.status||'جديد',req.params.id]);res.json({ok:true});});
app.get('/api/admin/visitors',auth,async(req,res)=>res.json((await q('SELECT id,ip,path,created_at FROM visitors ORDER BY id DESC LIMIT 100')).rows));
app.get('/api/admin/settings',auth,(req,res)=>res.json({whatsapp:process.env.WHATSAPP||'967775518031',group:process.env.WHATSAPP_GROUP||'https://chat.whatsapp.com/BewBwnAqdOyBywhAlp1fuF?s=sh&p=a&mlu=0'}));

init().then(()=>app.listen(PORT,()=>console.log(`MK Asmar Store running on port ${PORT}`))).catch(err=>{console.error(err);process.exit(1)});
