(()=>{
'use strict';
/* NAV_VOICE_FIX_V164
   Voice-only overlay. Does not touch map, GPS, routing, zoom, tiles or music.
   Test button speaks directly from the user click. Automatic guidance restores
   the distant step bucket and uses browser SpeechSynthesis only. */
try{
  const synth=window.speechSynthesis;
  const pickVoice=()=>{
    const voices=synth?.getVoices?.()||[];
    const female=['zuzana','vlasta','tereza','lucia','lucie','viktoria','victoria','alena','iveta','jana','monika','veronika','maria','marie','eva','hana','female','woman'];
    const male=['filip','martin','jakub','petr','peter','michal','tomas','tomáš','ondrej','matej','jiri','jan ','adam','daniel','david','male','man'];
    const name=v=>String(v?.name||'').toLowerCase();
    const isFemale=v=>female.some(x=>name(v).includes(x))&&!male.some(x=>name(v).includes(x));
    const isSk=v=>/^sk(?:-|_)/i.test(v?.lang||'');
    const isCs=v=>/^(?:cs|cz)(?:-|_)/i.test(v?.lang||'');
    return voices.find(v=>isSk(v)&&isFemale(v))||voices.find(v=>isCs(v)&&isFemale(v))||voices.find(isSk)||voices.find(isCs)||voices.find(isFemale)||voices[0]||null;
  };
  const speakNow=text=>{
    if(!synth||typeof SpeechSynthesisUtterance==='undefined')return false;
    const u=new SpeechSynthesisUtterance(String(text||''));
    const v=pickVoice();
    if(v){u.voice=v;u.lang=v.lang||'sk-SK'}else u.lang='sk-SK';
    u.rate=(window.state?.voiceMode==='soft')?.9:.96;
    u.pitch=(window.state?.voiceMode==='soft')?1.08:1;
    u.volume=Math.max(.2,Math.min(1,Number(window.state?.voiceVolume)||.85));
    try{synth.cancel();synth.resume?.();synth.speak(u);return true}catch{return false}
  };

  const install=()=>{
    if(typeof window.voiceNavigation!=='function'||typeof window.instruction!=='function'||typeof window.fmtSpeechD!=='function')return false;
    const test=document.getElementById('voiceTest');
    if(test&&!test.__voiceV164){
      test.__voiceV164=true;
      test.addEventListener('click',e=>{
        e.preventDefault();e.stopImmediatePropagation();
        speakNow('O 300 metrov odbočte doprava. Polícia pred vami, približne 800 metrov.');
      },true);
    }
    window.speak=async function(text,force=false){
      if((!window.state?.voice||!window.state?.navigating)&&!force)return;
      speakNow(typeof window.normalizeSpeechText==='function'?window.normalizeSpeechText(text):text);
    };
    window.voiceNavigation=function(){
      const st=window.state;
      if(!st?.voice||!st?.navigating)return;
      const r=st.routes?.[st.routeIndex],p=st.routeProgress;
      if(!r||!p)return;
      const step=r.steps?.[p.stepIdx];if(!step)return;
      const d=Number(p.distanceToManeuver),op=String(step?.opcode||'').replace(/-/g,'_').toUpperCase(),ramp=op.startsWith('RAMP_')||op.startsWith('EXIT_');
      let bucket='step';
      if(Number.isFinite(d)&&d>=0){bucket=ramp?(d<=100?'now':d<=250?'200':d<=600?'500':d<=1200?'1000':d<=2200?'2000':d<=3200?'3000':'step'):(d<=100?'now':d<=250?'200':d<=600?'500':d<=1200?'1000':'step')}
      const sig=typeof window.voiceManeuverSignature==='function'?window.voiceManeuverSignature(step):`${p.stepIdx}|${op}|${step?.street||''}`;
      const rank=({step:1,3000:2,2000:3,1000:4,500:5,200:6,now:7})[bucket]||1;
      const hist=window.voiceManeuverHistory;
      const seen=hist?.get?.(sig)||0;if(rank<=seen)return;hist?.set?.(sig,rank);
      const key=`${sig}:${bucket}`;if(key===st.lastVoice)return;st.lastVoice=key;
      const distance=Number.isFinite(d)&&d>=0?`${window.fmtSpeechD(d)}. `:'';
      window.speak(`${distance}${window.instruction(step)}`);
    };
    return true;
  };
  if(!install()){
    const t=setInterval(()=>{if(install())clearInterval(t)},100);
    setTimeout(()=>clearInterval(t),10000);
  }
}catch(e){console.warn('Navigation voice V164 unavailable:',e?.message||e)}
})();
