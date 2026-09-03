import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const i18n=read('lifelingo-i18n.js');
const enPart=i18n.split(' en:{')[1]?.split('\n },\n fa:{')[0]||'';
const faPart=i18n.split('\n fa:{')[1]?.split('\n }\n};')[0]||'';
const keys=s=>new Set([...s.matchAll(/['"]([a-z][a-z0-9_.-]+)['"]\s*:/gi)].map(m=>m[1]));
const en=keys(enPart),fa=keys(faPart);
const missingFa=[...en].filter(k=>!fa.has(k)).sort();
const missingEn=[...fa].filter(k=>!en.has(k)).sort();
const sourceFiles=['v66.html','v66-app.js','v67-nav-bridge.js','v67-speak-fix.js','v69-avatar-system.js','avatar-legacy-recovery.js','lifelingo-auth-fix.js','lifelingo-frontend-stabilize.js','lifelingo-course-route-guard.js','lifelingo-matching-state.js'];
const legacy=[];const suspicious=[];
for(const file of sourceFiles){const s=read(file);for(const m of s.matchAll(/(?:location\.(?:href|replace)|href\s*=)[^\n;]{0,180}(v\d+\.html|app-real\.html)/gi))legacy.push({file,match:m[0].slice(0,180)});for(const m of s.matchAll(/(?:textContent|innerHTML|placeholder)\s*=\s*([`'"])([A-Z][^`'"\n]{3,100})\1/g))suspicious.push({file,text:m[2]})}
const deduped=[...new Map(suspicious.map(x=>[`${x.file}:${x.text}`,x])).values()];
const result={enKeys:en.size,faKeys:fa.size,missingFa,missingEn,legacyNavigationCandidates:legacy,hardcodedUiCandidates:deduped.length,hardcodedUiSamples:deduped.slice(0,80)};
console.log(JSON.stringify(result,null,2));
if(missingFa.length||missingEn.length){console.error('Locale key trees are not symmetric.');process.exit(1)}
if(!read('v66.html').includes('lifelingo-frontend-stabilize.js')){console.error('Stabilization layer is not loaded by v66.html');process.exit(1)}
if(!read('lifelingo-frontend-stabilize.js').includes('openConversationUnit')){console.error('Canonical course conversation bridge is missing');process.exit(1)}
