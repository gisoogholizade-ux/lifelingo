(()=>{
'use strict';
const pairs={
'Type the word':'کلمه را تایپ کن',
'Type the missing word':'کلمهٔ جاافتاده را تایپ کن',
'Write here…':'اینجا بنویس…',
'Speak or type your answer first.':'اول پاسخت را بگو یا تایپ کن.',
'Almost. Keep the same meaning and try once more.':'نزدیک بود. همان معنی را نگه دار و یک بار دیگر امتحان کن.',
'Could not hear clearly. Try again or type.':'واضح نشنیدم. دوباره امتحان کن یا پاسخت را تایپ کن.',
'Enter email and password.':'ایمیل و رمز عبور را وارد کن.',
'Enter your name.':'نامت را وارد کن.',
'Enter a valid mobile number including country code.':'شمارهٔ موبایل معتبر را همراه با کد کشور وارد کن.',
'Use at least 8 characters for your password.':'رمز عبور باید حداقل ۸ کاراکتر باشد.',
'Account created. Check your email if confirmation is required, then log in.':'حسابت ساخته شد. اگر تأیید ایمیل لازم است، ایمیلت را بررسی کن و بعد وارد شو.',
'PRO ACTIVE · STEP BY STEP':'حساب حرفه‌ای فعال · مرحله‌به‌مرحله',
'Choose Female or Male and reveal your avatar first.':'ابتدا زن یا مرد را انتخاب کن و آواتارت را آشکار کن.',
'AI PARTNER':'همراه هوشمند',
'Speak naturally. LifeLingo adapts.':'طبیعی صحبت کن؛ LifeLingo خودش را با تو هماهنگ می‌کند.',
'VOICE FIRST':'اول صدا',
'Free Talk':'گفت‌وگوی آزاد',
'Practice My Weaknesses':'تمرین نقاط ضعف من',
'Daily 5-Minute Talk':'گفت‌وگوی روزانهٔ ۵ دقیقه‌ای',
'Choose a topic and talk naturally.':'یک موضوع انتخاب کن و طبیعی صحبت کن.',
'A focused conversation based on today.':'یک گفت‌وگوی متمرکز بر اساس امروز.',
'Naturally targets your practice skills.':'مهارت‌های نیازمند تمرین را طبیعی هدف می‌گیرد.',
'AI-POWERED REAL-LIFE MISSIONS':'ماموریت‌های واقعی با هوش مصنوعی',
'The animated scene stays. The character can think.':'صحنهٔ متحرک حفظ می‌شود و شخصیت هوشمند پاسخ می‌دهد.',
'AI Partner and Human Partners are separate.':'همراه هوشمند و همراهان انسانی از هم جدا هستند.',
'Private human chats are never used as AI memory or training data.':'گفت‌وگوهای خصوصی انسانی هرگز برای حافظه یا آموزش هوش مصنوعی استفاده نمی‌شوند.',
'What should we talk about?':'دربارهٔ چه چیزی صحبت کنیم؟',
'The conversation stays in English. Your selected support level controls hints and explanations.':'گفت‌وگو انگلیسی می‌ماند. سطح پشتیبانی انتخابی تو راهنماها و توضیح‌ها را کنترل می‌کند.',
'Start conversation →':'شروع گفت‌وگو ←',
'Your transcript':'متن تشخیص‌داده‌شدهٔ شما',
'Speak or type in English…':'به انگلیسی صحبت یا تایپ کن…',
'You can edit speech recognition before sending.':'اگر تشخیص صدا اشتباه است، پیش از ارسال آن را ویرایش کن.',
'Persian help':'راهنمای فارسی',
'AI Partner is temporarily unavailable.':'همراه هوشمند موقتاً در دسترس نیست.',
'Your regular LifeLingo missions still work.':'ماموریت‌های عادی LifeLingo همچنان کار می‌کنند.',
'Practice a regular Mission':'تمرین یک ماموریت عادی',
'Back to Speak':'بازگشت به مکالمه',
'Add learning goals':'افزودن هدف یادگیری',
'MY LIFELINGO AVATAR':'آواتار LifeLingo من',
'Your one-time avatar is yours forever.':'آواتار اختصاصی تو برای همیشه متعلق به خودت است.',
'Profile photos can change. Your LifeLingo avatar stays saved to this account.':'عکس پروفایل می‌تواند تغییر کند؛ آواتار LifeLingo تو در این حساب محفوظ می‌ماند.',
'View Avatar':'مشاهدهٔ آواتار',
'Share Avatar':'اشتراک‌گذاری آواتار',
'Full Persian support':'پشتیبانی کامل فارسی',
'Some support':'کمی پشتیبانی',
'English only':'فقط انگلیسی',
'Human Partner messages and raw voice are never included by this consent.':'پیام‌های هم‌تمرینی انسانی و صدای خام هرگز با این رضایت‌نامه وارد داده‌های آموزشی نمی‌شوند.',
'First Mission':'اولین ماموریت',
'3-Day Streak':'پیوستگی ۳ روزه',
'Chapter Complete':'فصل کامل‌شده',
'Manage journey':'مدیریت مسیر'
};
const reverse=Object.fromEntries(Object.entries(pairs).map(([en,fa])=>[fa,en]));
const isFa=()=>document.documentElement.dataset.language==='fa'||document.documentElement.lang==='fa';
const learningTarget=el=>!!el?.closest?.('.dailyPhrase,[data-learning-target="true"],[data-speak],#speakQuestion,.speakQuestion');
function text(node){if(!node?.nodeValue||!node.parentElement||learningTarget(node.parentElement))return;const raw=node.nodeValue,trim=raw.trim();if(!trim)return;let next=isFa()?pairs[trim]:reverse[trim];if(!next&&isFa())next=trim.replace(/New Arrival/g,'تازه‌وارد').replace(/elementary/g,'مقدماتی').replace(/learning EN/g,'در حال یادگیری انگلیسی').replace(/CEFR estimate, not a certificate/g,'تخمین CEFR است، نه مدرک رسمی').replace(/Active until\s+/g,'فعال تا ');else if(!next&&!isFa())next=trim.replace(/تازه‌وارد/g,'New Arrival').replace(/مقدماتی/g,'elementary').replace(/در حال یادگیری انگلیسی/g,'learning EN').replace(/تخمین CEFR است، نه مدرک رسمی/g,'CEFR estimate, not a certificate').replace(/فعال تا\s+/g,'Active until ');if(next&&next!==trim)node.nodeValue=raw.replace(trim,next)}
function attr(el,name){const raw=el.getAttribute?.(name);if(!raw)return;const next=isFa()?pairs[raw]:reverse[raw];if(next)el.setAttribute(name,next)}
function apply(root=document){const base=root===document?document.body:root;if(!base)return;if(base.nodeType===1){['placeholder','title','aria-label'].forEach(a=>attr(base,a))}const tw=document.createTreeWalker(base,NodeFilter.SHOW_TEXT);let n;while((n=tw.nextNode()))text(n);base.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(el=>['placeholder','title','aria-label'].forEach(a=>attr(el,a)))}
let queued=false;function queue(root=document){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;apply(root)})}
const obs=new MutationObserver(rs=>{for(const r of rs){if(r.type==='characterData')text(r.target);for(const n of r.addedNodes)if(n.nodeType===1)apply(n);if(r.type==='attributes')attr(r.target,r.attributeName)}});
function boot(){apply();obs.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});document.addEventListener('lifelingo:language-change',()=>queue(document))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
