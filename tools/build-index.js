#!/usr/bin/env node
/* Builds index.json (navigation + search metadata) and search.json (plain text of every page) for the SA Mod Manager wiki reader.
   Run from anywhere:  node tools/build-index.js          (writes both files)
                       node tools/build-index.js --check  (also exits 1 on errors, for CI)
                       node tools/build-index.js --strict (broken links and unknown [[links]] count as errors too)
   No dependencies. Folders and files are ordered by their number prefix (01-, 02-, ...). */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..'),ARGS=process.argv.slice(2),STRICT=ARGS.includes('--strict');
const SKIP=new Set(['tools','images','assets','node_modules']),errors=[],warns=[];
const cfg=(()=>{try{return JSON.parse(fs.readFileSync(path.join(ROOT,'wiki.config.json'),'utf8'))}catch(e){return{}}})();
const num=n=>{const m=n.match(/^(\d+)[-_. ]/);return m?+m[1]:1e6};
const nice=n=>{const t=n.replace(/\.md$/i,'').replace(/^\d+[-_. ]\s*/,'').replace(/[-_]+/g,' ');return t.charAt(0).toUpperCase()+t.slice(1)};
const slug=s=>String(s).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,'').trim().replace(/\s+/g,'-');
const base=p=>slug(path.basename(p).replace(/\.md$/i,'').replace(/^\d+[-_. ]\s*/,'').replace(/[-_]+/g,' '));
const bySort=(a,b)=>a.o-b.o||a.n.localeCompare(b.n,undefined,{numeric:true});
function front(raw){const m=raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);if(!m)return{fm:{},body:raw};
 const fm={};m[1].split(/\r?\n/).forEach(l=>{const k=l.match(/^([A-Za-z_-]+)\s*:\s*(.*)$/);if(k)fm[k[1].toLowerCase()]=k[2].trim().replace(/^["']|["']$/g,'')});
 return{fm,body:raw.slice(m[0].length)}}
const list=v=>String(v||'').replace(/^\[|\]$/g,'').split(',').map(x=>x.trim().replace(/^["']|["']$/g,'')).filter(Boolean);
function plain(body){return body.replace(/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/gm,' ').replace(/```[^\n]*\n([\s\S]*?)```/g,' $1 ').replace(/~~~[^\n]*\n([\s\S]*?)~~~/g,' $1 ')
 .replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,(m,a,b)=>b||a).replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
 .replace(/^\s{0,3}#{1,6}\s+/gm,'').replace(/^\s*>\s?(\[![A-Z]+\])?/gm,'').replace(/^\s*[-*+]\s+(\[[ xX]\]\s+)?/gm,'').replace(/^\s*\d+[.)]\s+/gm,'')
 .replace(/<[^>]+>/g,' ').replace(/[`*_~|]/g,' ').replace(/\s+/g,' ').trim()}
const all=[],texts={},links=[];
function walk(dir,rel){const ents=fs.readdirSync(dir,{withFileTypes:true});
 const sec={id:rel,title:nice(path.basename(dir)),summary:'',pages:[],sections:[]};let o=num(path.basename(dir));
 try{const j=JSON.parse(fs.readFileSync(path.join(dir,'_section.json'),'utf8'));if(j.title)sec.title=j.title;if(j.summary)sec.summary=j.summary;if(typeof j.order==='number')o=j.order}
 catch(e){if(e.code!=='ENOENT')errors.push(rel+'/_section.json: '+e.message)}
 const pg=[],subs=[];
 for(const e of ents){const full=path.join(dir,e.name),r=rel+'/'+e.name;
  if(e.isDirectory()){if(e.name[0]==='.'||e.name[0]==='_'||SKIP.has(e.name))continue;const s=walk(full,r);if(s.pages.length||s.sections.length)subs.push({o:s._o,n:e.name,s})}
  else if(/\.md$/i.test(e.name)&&e.name[0]!=='_'&&!/^readme\.md$/i.test(e.name)){
   const raw=fs.readFileSync(full,'utf8'),{fm,body}=front(raw);if(/^(true|yes)$/i.test(fm.draft||''))continue;
   const h1=body.match(/^\s*#\s+(.+)$/m),heads=[...body.matchAll(/^#{2,3}\s+(.+?)\s*#*\s*$/gm)].map(x=>x[1].replace(/[`*_~]/g,'').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1'));
   if(!fm.title)warns.push(r+': no "title:" in front matter, using '+(h1?'the first # heading':'the file name'));
   const p={id:r.replace(/\.md$/i,''),path:r,title:fm.title||(h1&&h1[1].trim())||nice(e.name),summary:fm.summary||'',tags:list(fm.tags),heads};
   if(fm.updated)p.updated=fm.updated;
   pg.push({o:fm.order!==undefined&&!isNaN(+fm.order)?+fm.order:num(e.name),n:e.name,p});texts[r]=plain(body);
   for(const m of body.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g))links.push({from:r,url:m[1]});
   for(const m of body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g))links.push({from:r,wiki:m[1].trim()})}}
 sec.pages=pg.sort(bySort).map(x=>x.p);sec.pages.forEach(p=>all.push(p));
 sec.sections=subs.sort(bySort).map(x=>x.s);
 sec._o=o;return sec}
const top=[];
for(const e of fs.readdirSync(ROOT,{withFileTypes:true})){
 if(!e.isDirectory()||e.name[0]==='.'||e.name[0]==='_'||SKIP.has(e.name))continue;
 const s=walk(path.join(ROOT,e.name),e.name);if(s.pages.length||s.sections.length)top.push({o:s._o,n:e.name,s})}
const sections=top.sort(bySort).map(x=>x.s);
const strip=s=>{delete s._o;s.sections.forEach(strip);if(!s.sections.length)delete s.sections;return s};sections.forEach(strip);
/* checks */
const paths=new Set(all.map(p=>p.path)),titles={};
all.forEach(p=>{const k=p.title.toLowerCase();(titles[k]=titles[k]||[]).push(p.path)});
Object.keys(titles).forEach(k=>{if(titles[k].length>1)warns.push('duplicate title "'+k+'": '+titles[k].join(', ')+' ([[links]] pick the first)')});
const issues=[];
links.forEach(l=>{
 if(l.wiki){const k=l.wiki.toLowerCase(),s=slug(l.wiki);if(!all.some(p=>p.title.toLowerCase()===k||base(p.path)===s||slug(p.title)===s))issues.push(l.from+': [['+l.wiki+']] matches no page')}
 else if(!/^([a-z][a-z0-9+.-]*:|#)/i.test(l.url)){let u=l.url.split('#')[0];try{u=decodeURIComponent(u)}catch(e){}
  const parts=(u[0]==='/'?[]:l.from.split('/').slice(0,-1));u.replace(/^\/+/,'').split('/').forEach(s=>{if(s==='..')parts.pop();else if(s&&s!=='.')parts.push(s)});
  const t=parts.join('/');if(/\.md$/i.test(t)){if(!paths.has(t))issues.push(l.from+': link to missing page '+l.url)}
  else if(t&&!fs.existsSync(path.join(ROOT,t)))issues.push(l.from+': link to missing file '+l.url)}});
(STRICT?errors:warns).push(...issues);
if(!all.length)errors.push('no pages found: put .md files inside numbered section folders such as 01-getting-started/');
const home=cfg.home&&paths.has(cfg.home)?cfg.home:(all[0]&&all[0].path)||'';
if(cfg.home&&!paths.has(cfg.home))warns.push('wiki.config.json: home "'+cfg.home+'" is not a page');
const rev=crypto.createHash('sha1').update(JSON.stringify([cfg.title,cfg.description,home,sections,texts])).digest('hex').slice(0,12);
const updated=all.map(p=>p.updated).filter(Boolean).sort().pop();
const index={v:1,rev,title:cfg.title||'Wiki',description:cfg.description||'',home};if(updated)index.updated=updated;index.sections=sections;
fs.writeFileSync(path.join(ROOT,'index.json'),JSON.stringify(index,null,1)+'\n');
fs.writeFileSync(path.join(ROOT,'search.json'),JSON.stringify(texts));
warns.forEach(w=>console.log('warning: '+w));errors.forEach(w=>console.log('ERROR: '+w));
const cnt=s=>s.pages.length+(s.sections||[]).reduce((n,x)=>n+cnt(x),0);
console.log('index.json + search.json written: '+all.length+' pages in '+sections.length+' sections ('+sections.map(s=>s.title+' '+cnt(s)).join(', ')+') rev '+rev);
if((ARGS.includes('--check')||STRICT)&&errors.length)process.exit(1);
