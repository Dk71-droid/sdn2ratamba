import{initializeApp as ze}from"https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";import{getAuth as Je,signInWithCustomToken as mt,signInAnonymously as bt,onAuthStateChanged as gt}from"https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";import{getFirestore as Ke,query as $e,collection as le,where as fe,getDocs as Oe,doc as M,getDoc as se,serverTimestamp as Ee,setDoc as he,onSnapshot as re,updateDoc as pt}from"https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const n of i)if(n.type==="childList")for(const o of n.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function a(i){const n={};return i.integrity&&(n.integrity=i.integrity),i.referrerPolicy&&(n.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?n.credentials="include":i.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function s(i){if(i.ep)return;i.ep=!0;const n=a(i);fetch(i.href,n)}})();const ft={apiKey:"AIzaSyBWTYZH2OZuyq_mnbbxiap7iBg-17II55A",authDomain:"tabungansiswa-8bbd6.firebaseapp.com",projectId:"tabungansiswa-8bbd6",storageBucket:"tabungansiswa-8bbd6.firebasestorage.app",messagingSenderId:"1068130708793",appId:"1:1068130708793:web:d6afeed38a9d42dd034ce8"},Re=ze(ft);Je(Re);const E=Ke(Re),y=(e,t,a=null)=>{const s=document.getElementById("globalMessage"),i=document.getElementById("messageTitle"),n=document.getElementById("messageText"),o=document.getElementById("messageCloseBtn");if(!s||!i||!n||!o){console.error("Global message elements not found.");return}s.classList.remove("hidden","bg-blue-100","border-blue-500","text-blue-700","bg-green-100","border-green-500","text-green-700","bg-red-100","border-red-500","text-red-700","bg-gray-100","border-gray-500","text-gray-700");let r,l,u,d,c=3e3;switch(e){case"loading":r="bg-blue-100",l="border-blue-500",u="text-blue-700",d="Memuat...";break;case"success":r="bg-green-100",l="border-green-500",u="text-green-700",d="Berhasil!";break;case"error":r="bg-red-100",l="border-red-500",u="text-red-700",d="Terjadi Kesalahan!",c=5e3;break;case"info":r="bg-blue-100",l="border-blue-500",u="text-blue-700",d="Informasi";break;default:r="bg-gray-100",l="border-gray-500",u="text-gray-700",d=""}i.innerText=a||d,s.classList.add(r,"border-l-4",l,u),n.innerText=t,s.classList.remove("hidden"),e!=="loading"&&setTimeout(()=>s.classList.add("hidden"),c),o.onclick=()=>s.classList.add("hidden")},je=(e,t)=>{const a=document.getElementById(`${e}-error`);a&&(a.innerText=t,a.classList.remove("hidden"))},Ve=e=>{e.querySelectorAll(".input-error-message").forEach(t=>{t.innerText="",t.classList.add("hidden")})};async function ht(e){const a=new TextEncoder().encode(e),s=await crypto.subtle.digest("SHA-256",a);return Array.from(new Uint8Array(s)).map(o=>o.toString(16).padStart(2,"0")).join("")}function xt(e,t){const a=document.getElementById("materialDetailContent");if(!a)return;const s=e.lessonData||{},i=s.storyTitle||e.title||"Judul Tidak Tersedia",n=s.introduction||e.introduction||"Pendahuluan tidak tersedia.";let o=`
    <div class="mb-3 flex items-center justify-between">
      <button id="backToMaterialsListBtn" class="flex items-center text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200">
        <i class="fas fa-arrow-left mr-2"></i> Kembali ke Daftar Materi
      </button>
      <div class="flex items-center space-x-2">
        <button id="decreaseFontBtn" class="text-slate-500 hover:text-slate-700 transition duration-200 text-xl" title="Perkecil Font">
          <i class="fas fa-minus-circle"></i>
        </button>
        <button id="increaseFontBtn" class="text-slate-500 hover:text-slate-700 transition duration-200 text-xl" title="Perbesar Font">
          <i class="fas fa-plus-circle"></i>
        </button>
      </div>
    </div>
    <div class="p-4 sm:p-5 bg-sky-50 rounded-2xl shadow-inner mb-6">
      <h2 class="text-2xl md:text-3xl font-extrabold text-blue-900 mb-1">${i}</h2>
      <p id="storyIntroText" class="text-blue-800 text-sm md:text-lg italic mb-4">${n}</p>
  `;o+='<div id="storyContent">',Array.isArray(s.plot)&&s.plot.length>0?s.plot.forEach((m,f)=>{o+=`
        <div class="mb-6">
          <h3 class="font-bold text-blue-800 text-xl mb-2">${m.chapterTitle||"Tanpa Judul"}</h3>
          <p class="story-text text-gray-800 leading-relaxed">${m.chapterContent?m.chapterContent.replace(/\n/g,"<br>"):"Konten bab tidak tersedia."}</p>
        </div>
      `}):s.narrative?o+=`<div class="story-text text-gray-800 leading-relaxed space-y-4">${s.narrative}</div>`:o+='<p class="story-text text-gray-500">Plot cerita tidak tersedia.</p>',s.moralLesson&&(o+=`
      <h4 class="font-bold text-green-700 text-xl mt-4 mb-2">Pesan Moral:</h4>
      <p class="story-text text-green-800 leading-relaxed">${s.moralLesson.replace(/\n/g,"<br>")}</p>
    `),s.storyAssessment&&(o+='<div class="bg-blue-100 p-4 rounded-xl mt-6 border border-blue-300">',Array.isArray(s.storyAssessment.comprehensionQuestions)&&s.storyAssessment.comprehensionQuestions.length>0&&s.storyAssessment.comprehensionQuestions.forEach(m=>{o+=`
          <div class="bg-yellow-50 p-4 rounded-xl mb-4 border border-yellow-200">
            <h4 class="font-semibold text-yellow-800 mb-2">Ayo Pahami Cerita! 🤔</h4>
            <p class="story-text text-yellow-700 text-sm mb-2">${m.questionText||"Pertanyaan tidak tersedia."}</p>
            <textarea class="w-full p-2 rounded-md border border-yellow-300 text-gray-700 text-sm" rows="3" placeholder="Tulis jawabanmu di sini..."></textarea>
          </div>
        `}),Array.isArray(s.storyAssessment.matchingActivities)&&s.storyAssessment.matchingActivities.length>0&&s.storyAssessment.matchingActivities.forEach(m=>{o+=`
          <div class="bg-blue-50 p-4 rounded-xl mt-4 border border-blue-200">
            <h4 class="font-semibold text-blue-800 mb-2">Ayo Menjodohkan! 🧩</h4>
            <p class="story-text text-blue-700 text-sm mb-2">${m.instructions||"Instruksi tidak tersedia."}</p>
            <div class="grid grid-cols-2 gap-4 mt-4">
              <div class="flex flex-col space-y-2">
                ${m.pairs?.map(f=>`<div class="bg-blue-100 p-2 rounded-md border border-blue-300 text-blue-800 font-medium">${f.term||""}</div>`).join("")}
              </div>
              <div class="flex flex-col space-y-2">
                ${m.pairs?.map(f=>`<select class="w-full p-2 rounded-md border border-blue-300 text-gray-700 text-sm"><option value="">Pilih...</option><option>${f.match||""}</option></select>`).join("")}
              </div>
            </div>
          </div>
        `}),o+="</div>"),Array.isArray(s.creativeProjects)&&s.creativeProjects.length>0&&(o+=`
      <div class="bg-yellow-50 p-4 rounded-xl mt-4 border border-yellow-200">
        <h4 class="font-semibold text-yellow-800 mb-2">Ayo Berkreasi! ✍️</h4>
        <ul class="list-disc list-inside text-yellow-700 text-sm">
          ${s.creativeProjects.map(m=>`<li class="story-text">${m}</li>`).join("")}
        </ul>
      </div>
    `),o+="</div></div>",a.innerHTML=o,document.getElementById("backToMaterialsListBtn").addEventListener("click",()=>{xe(t)});const r=document.getElementById("storyContent"),l=document.getElementById("storyIntroText"),u=document.getElementById("increaseFontBtn"),d=document.getElementById("decreaseFontBtn");let c=16;const b=14,g=24;if(r&&l&&u&&d){const m=f=>{l.style.fontSize=`${f}px`,r.querySelectorAll(".story-text").forEach(p=>{p.style.fontSize=`${f}px`})};m(c),u.addEventListener("click",()=>{c<g&&(c+=2,m(c))}),d.addEventListener("click",()=>{c>b&&(c-=2,m(c))})}}const yt=void 0,Qe=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${yt}`;async function Ge(e,t){if(!t)return[];try{const a=$e(le(E,"student_chapter_submissions"),fe("materialId","==",e),fe("studentUid","==",t)),s=await Oe(a),i=[];return s.forEach(n=>{i.push(n.data())}),i}catch(a){return console.error("Gagal mengambil progres dari Firestore:",a),[]}}async function Ie(e,t){const a=document.getElementById("materialDetailContent");if(!a)return;const s=await Ge(e.id,x?.uid),i=s.length>0?s.length:0;let n=0,o=0;s.forEach(c=>{typeof c.combinedScore=="number"&&(n+=c.combinedScore,o++)});const r=o>0?Math.round(n/o):null;let l=`
    <div class="mb-3">
      <button id="backToMaterialsListBtn" class="flex items-center text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200">
        <i class="fas fa-arrow-left mr-2"></i> Kembali ke Daftar Materi
      </button>
    </div>

    <h2 class="text-xl md:text-2xl font-extrabold text-blue-900 mb-6 text-center">
      ${e.title||"Judul Tidak Tersedia"}
    </h2>

    ${r!==null?`
    <div class="bg-blue-100 text-blue-900 rounded-xl p-4 md:p-6 mb-6 text-center shadow-md">
      <p class="text-sm font-semibold">Nilai Rata-Rata Kamu</p>
      <p class="text-4xl md:text-5xl font-extrabold mt-1">${r}</p>
    </div>
    `:""}

  `;l+=`
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg md:text-xl font-bold text-gray-800 flex-grow text-center">Daftar Bab</h3>
    </div>
    <div class="space-y-3">
  `,e.lessonData.sections.forEach((c,b)=>{const g=b<i,m=b===i,f=b>i,p=g?"Selesai":m?"Saat Ini":"Terkunci";l+=`
      <div class="card p-4 rounded-2xl shadow-md transition-all duration-300 ${f?"bg-gray-100 text-gray-500 cursor-not-allowed":"bg-white hover:bg-blue-50 cursor-pointer"} chapter-card" data-chapter-index="${b}" ${f?"disabled":""}>
        <div class="flex items-center justify-between">
          <div class="flex-grow flex items-center">
            <span class="text-xl mr-3">${g?"✅":m?"▶️":"🔒"}</span>
            <h4 class="text-xs md:text-sm font-bold chapter-title">${c.title||"Bab Tanpa Judul"}</h4>
          </div>
          <span class="text-xs font-semibold text-white px-2 py-1 rounded-full ${g?"bg-green-500":m?"bg-blue-500":"bg-gray-400"}">
            ${p}
          </span>
        </div>
      </div>
    `}),l+="</div>",a.innerHTML=l,document.getElementById("backToMaterialsListBtn").addEventListener("click",()=>{xe(t)}),document.querySelectorAll(".chapter-card").forEach(c=>{c.hasAttribute("disabled")||c.addEventListener("click",()=>{const b=parseInt(c.dataset.chapterIndex);Ue(e,b,t)})});const u=document.querySelectorAll(".chapter-title");let d=14;u.forEach(c=>c.style.fontSize=`${d}px`)}async function Ue(e,t,a,s=null){const i=document.getElementById("materialDetailContent"),n=e.lessonData.sections[t];if(!n){i.innerHTML='<p class="text-center text-gray-500 py-8">Bab tidak ditemukan.</p>';return}let o=s;if(!o&&x?.uid){const v=M(E,"student_chapter_submissions",`${e.id}_${t}_${x.uid}`);try{const C=await se(v);C.exists()&&(o=C.data())}catch(C){console.error("Gagal mengambil data progres: ",C)}}const r=!!n.discussionQuestion,l=!!n.quizQuestion;let u=`
    <div class="py-2 px-4 md:p-4 flex items-center justify-between transition-shadow duration-300">
      <button id="backToChapterListBtn" class="flex items-center text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200">
        <i class="fas fa-arrow-left mr-2"></i> Kembali ke Bab
      </button>
      <div class="flex items-center space-x-2">
        <button id="decreaseFontBtn" class="text-slate-500 hover:text-slate-700 transition duration-200 text-xl" title="Perkecil Font">
          <i class="fas fa-minus-circle"></i>
        </button>
        <button id="increaseFontBtn" class="text-slate-500 hover:text-slate-700 transition duration-200 text-xl" title="Perbesar Font">
          <i class="fas fa-plus-circle"></i>
        </button>
      </div>
    </div>
    <div class="overflow-y-auto pb-12 pt-2">
      <div class="p-4 sm:p-5 bg-white rounded-2xl shadow-lg border-t-4 border-sky-500">
        <div class="mb-4 text-center">
          <h3 class="text-xl md:text-2xl font-extrabold text-slate-800">
            ${n.title||"Bab Tanpa Judul"}
          </h3>
        </div>
  `;o&&(u+=`
      <div class="bg-blue-50 rounded-xl p-4 md:p-6 mb-6 text-center shadow-inner border-l-4 border-blue-500">
        <p class="text-xl md:text-2xl font-bold text-blue-800">Skor Anda:</p>
        <p class="text-5xl md:text-6xl font-extrabold text-blue-600">${o.combinedScore}</p>
      </div>
    `),u+=`
        <div id="explanationText" class="text-gray-800 leading-relaxed mb-6 text-left">
          ${n.explanation||"Penjelasan untuk bagian ini tidak tersedia."}
        </div>
      </div>
  `,r&&(u+=`
      <div class="p-4 sm:p-5 bg-yellow-50 rounded-xl border-l-4 border-yellow-500 mt-6 shadow-md" id="discussionContainer">
        <h4 class="font-bold text-yellow-800 flex items-center mb-2">
          <i class="fas fa-lightbulb text-xl mr-2"></i> Diskusi
        </h4>
        <p class="text-yellow-700 italic text-sm mb-3">${n.discussionQuestion}</p>
        ${o?`
          <div class="mb-4">
            <p class="font-semibold text-yellow-800">Jawaban Anda:</p>
            <p class="p-2 text-sm bg-yellow-100 rounded-md whitespace-pre-wrap">${o.studentDiscussionAnswer}</p>
          </div>
          <div>
            <p class="font-semibold text-yellow-800">Kunci Jawaban:</p>
            <p class="p-2 text-sm bg-yellow-100 rounded-md whitespace-pre-wrap">${o.discussionExampleAnswer||"Kunci jawaban tidak tersedia."}</p>
          </div>
          ${o.discussionFeedback?`
            <div class="mt-4">
              <p class="font-semibold text-yellow-800">Umpan Balik AI:</p>
              <p class="p-2 text-sm bg-yellow-100 rounded-md whitespace-pre-wrap">${o.discussionFeedback}</p>
            </div>
          `:""}
        `:`
          <textarea id="discussion-answer-${t}" class="w-full p-2 rounded-md border border-yellow-300 text-gray-700 text-sm" rows="3" placeholder="Tulis jawabanmu di sini..."></textarea>
          <div id="discussion-feedback-${t}" class="mt-3 text-sm"></div>
        `}
      </div>
    `),l&&(u+=`
      <div class="p-4 sm:p-5 bg-green-50 rounded-xl border-l-4 border-green-500 mt-6 shadow-md" id="quizContainer">
        <h4 class="font-bold text-green-800 flex items-center mb-2">
          <i class="fas fa-question-circle text-xl mr-2"></i> Kuis
        </h4>
        <p class="text-green-700 font-medium text-sm mb-3">${n.quizQuestion}</p>
        <form id="quiz-form-${t}" class="flex flex-col space-y-2">
          ${n.quizOptions.map((v,C)=>{const A=v.trim()===n.quizCorrectAnswer.trim(),S=o&&v.trim()===o.studentQuizAnswer.trim();let I="",Q="";return o?A?(I="bg-green-100 border-green-400 font-bold",Q='<i class="fas fa-check-circle text-green-600 ml-auto"></i>'):S?(I="bg-red-100 border-red-400 line-through",Q='<i class="fas fa-times-circle text-red-600 ml-auto"></i>'):I="bg-gray-100 border-gray-300 text-gray-500":I="bg-white hover:bg-green-100",`
                <label class="flex items-center cursor-pointer p-2 rounded-md transition duration-200 border ${I}">
                  <input type="radio" name="quiz-q-${t}" value="${v}" class="mr-2" ${o?"disabled":""} ${S?"checked":""} />
                  <span class="text-slate-700">${String.fromCharCode(65+C)}. ${v}</span>
                  ${Q}
                </label>
              `}).join("")}
        </form>
        <div id="quiz-feedback-${t}" class="mt-3 text-sm"></div>
        ${o?`
          <div class="mt-4">
            <p class="font-semibold text-green-800">Jawaban yang Benar:</p>
            <p class="p-2 text-sm bg-green-100 rounded-md whitespace-pre-wrap">${o.quizCorrectAnswer||"Jawaban benar tidak tersedia."}</p>
          </div>
        `:""}
      </div>
    `),u+=`
    <div class="mt-6 text-right">
  `,o?u+=`
      <button id="returnToChapterListBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition duration-300">
        <i class="fas fa-arrow-left mr-2"></i> Kembali ke Bab
      </button>
    `:(r||l)&&(u+=`
      <button id="submitAllBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition duration-300">
        <i class="fas fa-paper-plane mr-2"></i> Kirim Jawaban
      </button>
    `),u+=`
    </div>
  </div>`,i.innerHTML=u;let d=document.getElementById("feedbackModal"),c=document.getElementById("modalContentContainer"),b=document.getElementById("modalContent"),g;d||(d=document.createElement("div"),d.id="feedbackModal",d.className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900 bg-opacity-50 hidden transition-opacity duration-300",d.innerHTML=`
      <div id="modalContentContainer" class="bg-white rounded-2xl shadow-xl w-11/12 md:w-3/4 lg:w-1/2 p-6 m-4 transform scale-95 transition-transform duration-300 max-h-screen overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-2xl font-bold text-blue-700">Hasil Evaluasi</h3>
          <button id="closeModalBtn" class="text-gray-500 hover:text-gray-800 transition-colors duration-200 text-3xl leading-none">
            &times;
          </button>
        </div>
        <div id="modalContent" class="space-y-4">
          <!-- Konten umpan balik akan dimuat di sini -->
        </div>
      </div>
    `,document.body.appendChild(d),c=document.getElementById("modalContentContainer"),b=document.getElementById("modalContent")),g=document.getElementById("closeModalBtn");const m=()=>{d.classList.add("hidden"),document.body.classList.remove("overflow-hidden")};g&&g.addEventListener("click",m),d.addEventListener("click",v=>{(v.target===d||v.target===c)&&m()}),document.getElementById("backToChapterListBtn").addEventListener("click",()=>{Ie(e,a)});const f=document.getElementById("returnToChapterListBtn");f&&f.addEventListener("click",()=>{Ie(e,a)});const p=document.getElementById("submitAllBtn");p&&p.addEventListener("click",async()=>{let v=!0;p.disabled=!0,p.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i> Mengirim...',p.classList.add("bg-gray-400","cursor-not-allowed"),p.classList.remove("bg-blue-600","hover:bg-blue-700");let C,A;if(r&&(C=document.getElementById(`discussion-answer-${t}`).value,C.trim()||(y("error","Jawaban diskusi tidak boleh kosong."),v=!1)),l&&(A=document.getElementById(`quiz-form-${t}`).querySelector(`input[name="quiz-q-${t}"]:checked`)?.value,A||(y("error","Pilih salah satu jawaban kuis."),v=!1)),x?.uid||(y("error","Data siswa tidak ditemukan. Silakan coba login ulang."),v=!1),v)try{const S=n.quizCorrectAnswer,I=A&&S?A.trim()===S.trim():!1,Q=I?100:0;let H=0,U="";const ue=n.discussionExampleAnswer;if(r){const F=`
Berdasarkan materi penjelasan berikut: '${n.explanation}', dan pertanyaan diskusi ini: '${n.discussionQuestion}', serta kunci jawaban berikut: '${ue||"Tidak tersedia"}',

Nilailah jawaban siswa berikut: '${C}'.
Tugasmu adalah memberikan skor dan umpan balik yang ramah, sederhana, dan mudah dimengerti oleh siswa SD. Umpan balik harus mencakup alasan mengapa skor tersebut diberikan dan saran perbaikan dalam satu paragraf yang mengalir.

Aturan penilaian:
- Jika jawaban siswa tidak nyambung sama sekali atau salah, berikanlah skor 0.
- Jika jawaban siswa "so-so" (kurang lengkap tapi ada benarnya), berikan skor antara 20 sampai 95.
- Jika jawaban siswa sudah relevan dan benar, meskipun tidak terlalu lengkap, berikanlah skor 100.

Contoh format output:
{
  "score": 75,
  "feedback": "Jawabanmu sudah cukup bagus! Kamu sudah mengerti sebagian, karena kamu menyebutkan tentang [...]. Namun, kamu bisa membuatnya lebih lengkap dengan [...]. Coba baca lagi penjelasan materinya ya!"
}
`;let z=[];z.push({role:"user",parts:[{text:F}]});const W={contents:z,generationConfig:{responseMimeType:"application/json",responseSchema:{type:"OBJECT",properties:{score:{type:"NUMBER"},feedback:{type:"STRING"}},propertyOrdering:["score","feedback"]}}},qe="",ee=Qe,te=3,ne=1e3;let D;for(let P=0;P<te;P++)try{if(D=await fetch(ee,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(W)}),D.ok)break;if(D.status===429){const _=ne*Math.pow(2,P);console.log(`Rate limit exceeded. Retrying in ${_}ms...`),await new Promise(G=>setTimeout(G,_))}else throw new Error(`API returned status ${D.status}`)}catch(_){if(P===te-1)throw _}if(!D.ok)throw new Error("API failed after multiple retries.");const J=await D.json();if(J.candidates&&J.candidates.length>0&&J.candidates[0].content&&J.candidates[0].content.parts&&J.candidates[0].content.parts.length>0){const P=J.candidates[0].content.parts[0].text,_=JSON.parse(P);H=_.score||0,U=_.feedback||""}}let me=Q+H,X=0;r&&X++,l&&X++;const be=X>0?Math.round(me/X):0,h={materialId:e.id,chapterIndex:t,studentUid:x.uid,discussionQuestion:n.discussionQuestion||null,studentDiscussionAnswer:C||null,discussionExampleAnswer:ue||null,quizQuestion:n.quizQuestion||null,studentQuizAnswer:A||null,quizCorrectAnswer:S||null,isQuizCorrect:I,discussionScore:H,discussionFeedback:U,combinedScore:be,timestamp:Ee()},L=M(E,"student_chapter_submissions",`${e.id}_${t}_${x.uid}`);await he(L,h,{merge:!0}),b.innerHTML=`
            <div class="text-center mb-6">
              <p class="text-xl font-bold text-slate-800">Skor Total</p>
              <p class="text-7xl font-extrabold text-blue-600 mt-2 mb-4">${be}</p>
            </div>

            <div class="border-t border-gray-200 pt-4">
              <h4 class="text-lg font-bold text-slate-800 mb-2">Detail Skor</h4>
              <div class="grid grid-cols-2 gap-4 text-center">
                ${r?`<div>
                      <p class="text-sm font-semibold text-yellow-700">Skor Diskusi</p>
                      <p class="text-2xl font-bold text-yellow-600">${H}</p>
                    </div>`:""}
                ${l?`<div>
                      <p class="text-sm font-semibold text-green-700">Skor Kuis</p>
                      <p class="text-2xl font-bold text-green-600">${Q}</p>
                    </div>`:""}
              </div>
            </div>

            ${U?`
              <div class="border-t border-gray-200 pt-4 mt-4">
                <h4 class="text-lg font-bold text-slate-800 mb-2 flex items-center"><i class="fas fa-comment-dots mr-2 text-yellow-500"></i> Umpan Balik AI</h4>
                <p class="text-gray-700 text-sm whitespace-pre-wrap">${U}</p>
              </div>
            `:""}

            <div class="mt-6 flex justify-end">
                <button id="modalContinueBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition duration-300">
                    <i class="fas fa-check mr-2"></i> Lanjutkan
                </button>
            </div>
          `,d.classList.remove("hidden"),document.body.classList.add("overflow-hidden"),document.getElementById("modalContinueBtn").addEventListener("click",()=>{m(),Ue(e,t,a,h)}),y("success","Semua jawaban berhasil dikirim!")}catch(S){console.error("Error submitting combined answers:",S),y("error","Terjadi kesalahan saat mengirim jawaban. Coba lagi."),p.disabled=!1,p.innerHTML='<i class="fas fa-paper-plane mr-2"></i> Kirim Jawaban',p.classList.remove("bg-gray-400","cursor-not-allowed"),p.classList.add("bg-blue-600","hover:bg-blue-700"),d.classList.contains("hidden")||(d.classList.add("hidden"),document.body.classList.remove("overflow-hidden"))}else p.disabled=!1,p.innerHTML='<i class="fas fa-paper-plane mr-2"></i> Kirim Jawaban',p.classList.remove("bg-gray-400","cursor-not-allowed"),p.classList.add("bg-blue-600","hover:bg-blue-700")});const k=document.getElementById("explanationText"),w=document.getElementById("increaseFontBtn"),$=document.getElementById("decreaseFontBtn");let T=16;const j=14,q=24;k&&w&&$&&(k.style.fontSize=`${T}px`,w.addEventListener("click",()=>{T<q&&(T+=2,k.style.fontSize=`${T}px`)}),$.addEventListener("click",()=>{T>j&&(T-=2,k.style.fontSize=`${T}px`)}))}async function We(e,t){if(!t)return null;const a=await Ge(e,t),s=[];let i=0,n=0;a.forEach(l=>{typeof l.combinedScore=="number"&&(s.push({chapterIndex:l.chapterIndex,score:l.combinedScore}),i+=l.combinedScore,n++)});const o=n>0?Math.round(i/n):null,r=a.length;return{averageScore:o,chapterScores:s,completedChapters:r}}function kt(e){return e?e.replace(/\b\w/g,t=>t.toUpperCase()):""}async function xe(e){const t=document.getElementById("materialsListContainer"),a=document.getElementById("materialContentDisplay");if(!t||!a)return;if(a.classList.add("hidden"),t.classList.remove("hidden"),!Array.isArray(e)||e.length===0){t.innerHTML=`
      <div class="text-center text-gray-500 py-8">
        <p>Belum ada materi pembelajaran yang tersedia.</p>
      </div>
    `;return}const s=e.reduce((b,g)=>{const m=g.subject.toLowerCase();return b[m]||(b[m]={name:g.subject,items:[]}),b[m].items.push(g),b},{});let i=`
    <style>
      /* CSS untuk efek lipatan sudut */
      .corner-fold {
        overflow: hidden;
      }
      .corner-fold::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        border-width: 0 16px 16px 0;
        border-style: solid;
        display: block;
        width: 0;
      }
      .corner-fold-red::before {
        border-color: #fca5a5 #fca5a5 #fff #fff; /* Warna merah untuk nilai rendah */
      }
      .corner-fold-blue::before {
        border-color: #93c5fd #93c5fd #fff #fff; /* Warna biru untuk nilai tinggi */
      }
    </style>
    <h2 class="text-xl md:text-3xl font-extrabold text-gray-800 mb-4">Materi Pembelajaran</h2>
    <p class="text-gray-600 mb-6">Jelajahi materi pembelajaran yang tersedia dan tingkatkan pemahamanmu.</p>
    <div id="subject-accordion">
  `;const n=["shadow-md","shadow-lg","shadow-xl"],o=["border-blue-400","border-green-400","border-yellow-400","border-red-400","border-purple-400"],r=["bg-indigo-50","bg-sky-50","bg-emerald-50","bg-amber-50","bg-rose-50","bg-fuchsia-50"];let l=0;const u=e.map(async b=>{let g=null,m=!1;if(b.learningModel==="Eksplorasi Konsep & Diskusi Esai"&&x?.uid){g=await We(b.id,x.uid);const f=b.lessonData.sections.length;g&&(m=g.completedChapters===f)}return{id:b.id,progressSummary:g,isCompleted:m}}),d=await Promise.all(u),c=new Map(d.map(b=>[b.id,b]));for(const b in s){const g=s[b],m=o[l%o.length];l++,i+=`
      <div class="mb-2 md:mb-4">
        <div class="flex items-center p-3 md:p-4 cursor-pointer hover:shadow-lg transition-all duration-300 subject-header rounded-lg shadow-md border-l-4 ${m} bg-gray-100" data-subject-key="${b}">
          <h3 class="flex-grow font-bold text-left text-sm md:text-xl text-gray-800">${kt(g.name)}</h3>
          <svg class="w-4 h-4 md:w-5 md:h-5 text-gray-600 transform transition-transform duration-300 chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <div id="materials-${b}" class="materials-list overflow-hidden transition-all duration-300 max-h-0">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 p-2 md:p-4">
    `,i+=g.items.map((f,p)=>{const k=c.get(f.id),{isCompleted:w,progressSummary:$}=k||{isCompleted:!1,progressSummary:null},T=n[p%n.length],j=w?"bg-white":r[p%r.length],q=w?"border-green-400":o[p%o.length];let v="",C="",A="text-gray-600",S="";return w?($.averageScore<60?(v="text-red-800",S="corner-fold-red"):(v="text-blue-800",S="corner-fold-blue"),C="text-gray-800",A="text-gray-600"):(v="text-gray-800",C="text-gray-800",A="text-gray-600"),`
          <div class="card p-3 md:p-5 cursor-pointer transition-all duration-300 view-material-btn rounded-lg ${j} ${T} hover:shadow-2xl border-l-4 ${q} ${w?"relative corner-fold "+S:""}" data-material-id="${f.id}">
            ${w?`
              <p class="text-xs font-bold ${v} mb-1">
                Selesai: Nilai ${$.averageScore}
              </p>
            `:""}
            <h4 class="font-bold text-sm md:text-lg ${C}">${f.title}</h4>
            <p class="text-xs md:text-sm mt-1 ${A}">
              Model: ${f.learningModel}
            </p>
          </div>
        `}).join(""),i+=`
          </div>
        </div>
      </div>
    `}i+="</div>",t.innerHTML=i,document.querySelectorAll(".subject-header").forEach(b=>{b.addEventListener("click",g=>{const m=g.currentTarget.dataset.subjectKey,f=document.getElementById(`materials-${m}`),p=g.currentTarget.querySelector(".chevron");document.querySelectorAll(".materials-list").forEach(k=>{k.id!==`materials-${m}`&&(k.classList.remove("max-h-screen"),k.classList.add("max-h-0"))}),document.querySelectorAll(".chevron").forEach(k=>{k!==p&&k.classList.remove("rotate-90")}),f.classList.toggle("max-h-0"),f.classList.toggle("max-h-screen"),p.classList.toggle("rotate-90")})}),document.querySelectorAll(".view-material-btn").forEach(b=>{b.addEventListener("click",g=>{const m=g.currentTarget.dataset.materialId,f=e.find(p=>p.id===m);f&&Ye(f,e)})})}function Ye(e,t){const a=document.getElementById("materialsListContainer"),s=document.getElementById("materialContentDisplay");!a||!s||(a.classList.add("hidden"),s.classList.remove("hidden"),e.learningModel==="Petualangan Cerita & Narasi"?xt(e,t):Ie(e,t))}function Ze(e,t,a){const s=document.getElementById("scheduledTasksListContainer");if(!s)return;if(e.length===0){s.innerHTML=`
      <div class="text-center text-gray-500 py-8">
        <p>Belum ada tugas yang dijadwalkan untuk Anda.</p>
      </div>
    `;return}let i=`
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${e.map(n=>{let o="Konten tidak ditemukan",r="Tidak Diketahui",l="";if(n.contentType==="materi"){r="Materi";const u=t.find(d=>d.id===n.contentId);u&&(o=u.title,l=`
                <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full text-sm view-scheduled-content-btn" data-content-type="materi" data-content-id="${n.contentId}">
                  Lihat Materi
                </button>
              `)}else if(n.contentType==="soal"){r="Soal Latihan";const u=a.find(d=>d.id===n.contentId);u&&(o=`Soal ${u.type} (${u.date})`,l=`
                <button class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full text-sm view-scheduled-content-btn" data-content-type="soal" data-content-id="${n.contentId}">
                  Kerjakan Soal
                </button>
              `)}return`
            <div class="card p-4 shadow-md rounded-xl bg-white">
              <h3 class="font-bold text-lg text-gray-800 mb-2">${o}</h3>
              <p class="text-gray-600 text-sm mb-1">Jenis: ${r}</p>
              <p class="text-gray-600 text-sm mb-1">Tanggal: ${n.scheduleDate}</p>
              <p class="text-gray-600 text-sm mb-4">Waktu: ${n.scheduleTime||"Sepanjang Hari"}</p>
              <div class="flex justify-end">
                ${l}
              </div>
            </div>
          `}).join("")}
    </div>
  `;s.innerHTML=i,document.querySelectorAll(".view-scheduled-content-btn").forEach(n=>{n.addEventListener("click",async o=>{const r=o.currentTarget.dataset.contentType,l=o.currentTarget.dataset.contentId;if(r==="materi"){const u=t.find(d=>d.id===l);if(u){V("materi");const d=document.getElementById("materialContentDisplay");d?typeof window.renderMaterialDetail=="function"?window.renderMaterialDetail(u,d):y("error","Fungsi renderMaterialDetail tidak ditemukan. Pastikan materi_siswa.js dimuat dengan benar."):y("error","Elemen tampilan materi tidak ditemukan.")}else y("error","Materi tidak ditemukan.")}else r==="soal"&&(V("soal-harian"),y("info","Anda akan diarahkan ke halaman soal latihan."))})})}let ye,ce,ge,Z,R=0,pe=[],ae=0,vt=null,ke,ie;const wt=15;let St;const Me=typeof __firebase_config<"u"?JSON.parse(__firebase_config):{},Xe=typeof __app_id<"u"?__app_id:"default-app-id",De=typeof __initial_auth_token<"u"?__initial_auth_token:null,Ct={"A.1":[{q:"2 ÷ 2",a:"1",trik:"A.1"},{q:"4 ÷ 2",a:"2",trik:"A.1"},{q:"6 ÷ 2",a:"3",trik:"A.1"},{q:"8 ÷ 2",a:"4",trik:"A.1"}],"A.2":[{q:"20 ÷ 2",a:"10",trik:"A.2"},{q:"40 ÷ 2",a:"20",trik:"A.2"},{q:"60 ÷ 2",a:"30",trik:"A.2"},{q:"80 ÷ 2",a:"40",trik:"A.2"},{q:"100 ÷ 2",a:"50",trik:"A.2"}],"A.3":[{q:"24 ÷ 2",a:"12",trik:"A.3"},{q:"46 ÷ 2",a:"23",trik:"A.3"},{q:"68 ÷ 2",a:"34",trik:"A.3"},{q:"82 ÷ 2",a:"41",trik:"A.3"},{q:"26 ÷ 2",a:"13",trik:"A.3"}],"A.4":[{q:"28 ÷ 2",a:"14",trik:"A.4"},{q:"42 ÷ 2",a:"21",trik:"A.4"},{q:"64 ÷ 2",a:"32",trik:"A.4"},{q:"86 ÷ 2",a:"43",trik:"A.4"},{q:"88 ÷ 2",a:"44",trik:"A.4"}],"B.1":[{q:"25 ÷ 5",a:"5",trik:"B.1"},{q:"35 ÷ 5",a:"7",trik:"B.1"},{q:"45 ÷ 5",a:"9",trik:"B.1"},{q:"65 ÷ 5",a:"13",trik:"B.1"},{q:"75 ÷ 5",a:"15",trik:"B.1"}],"B.2":[{q:"250 ÷ 5",a:"50",trik:"B.2"},{q:"350 ÷ 5",a:"70",trik:"B.2"},{q:"450 ÷ 5",a:"90",trik:"B.2"},{q:"650 ÷ 5",a:"130",trik:"B.2"},{q:"750 ÷ 5",a:"150",trik:"B.2"}],"B.3":[{q:"25 ÷ 2.5",a:"10",trik:"B.3"},{q:"35 ÷ 2.5",a:"14",trik:"B.3"},{q:"45 ÷ 2.5",a:"18",trik:"B.3"},{q:"65 ÷ 2.5",a:"26",trik:"B.3"},{q:"75 ÷ 2.5",a:"30",trik:"B.3"}],"C.1":[{q:"123 ÷ 3",a:"41",trik:"C.1"},{q:"456 ÷ 3",a:"152",trik:"C.1"},{q:"789 ÷ 3",a:"263",trik:"C.1"},{q:"987 ÷ 3",a:"329",trik:"C.1"},{q:"369 ÷ 3",a:"123",trik:"C.1"}],"C.2":[{q:"246 ÷ 6",a:"41",trik:"C.2"},{q:"369 ÷ 9",a:"41",trik:"C.2"},{q:"4812 ÷ 12",a:"401",trik:"C.2"},{q:"6129 ÷ 9",a:"681",trik:"C.2"},{q:"12369 ÷ 3",a:"4123",trik:"C.2"}],"C.3":[{q:"18 ÷ 9",a:"2",trik:"C.3"},{q:"27 ÷ 9",a:"3",trik:"C.3"},{q:"36 ÷ 9",a:"4",trik:"C.3"},{q:"45 ÷ 9",a:"5",trik:"C.3"},{q:"54 ÷ 9",a:"6",trik:"C.3"}],Test:[{q:"24 ÷ 2",a:"12"},{q:"20 ÷ 2",a:"10"},{q:"25 ÷ 5",a:"5"},{q:"45 ÷ 5",a:"9"},{q:"123 ÷ 3",a:"41"},{q:"369 ÷ 9",a:"41"},{q:"27 ÷ 9",a:"3"},{q:"60 ÷ 2",a:"30"},{q:"75 ÷ 5",a:"15"},{q:"456 ÷ 3",a:"152"}]},Lt={"A.1":"Pembagian dengan 2 untuk angka genap satuan (2, 4, 6, 8)","A.2":"Pembagian dengan 2 untuk angka genap puluhan (20, 40, 60, 80)","A.3":"Pembagian dengan 2 untuk angka genap yang tidak beraturan","A.4":"Pembagian dengan 2 untuk angka genap yang tidak beraturan dengan trik yang lebih kompleks","B.1":"Pembagian dengan 5 untuk angka berakhiran 5","B.2":"Pembagian dengan 5 untuk angka berakhiran 0","B.3":"Pembagian dengan 2.5 dengan trik cepat","C.1":"Pembagian dengan 3 untuk angka yang jumlah digitnya bisa dibagi 3","C.2":"Pembagian dengan 6, 9, 12, dan 15","C.3":"Trik Pembagian dengan 9"};async function Tt(){if(!ce||!Z){console.error("Firestore or user not initialized.");return}try{const e=M(ce,`artifacts/${Xe}/users/${Z}/division_tricks`,"progress"),t=await se(e);t.exists()?R=t.data().level||0:(R=0,await he(e,{level:0},{merge:!0})),console.log("Highest completed level fetched:",R)}catch(e){console.error("Error fetching highest completed level:",e)}}async function $t(e){if(!ce||!Z){console.error("Firestore or user not initialized.");return}try{if(e>R){const t=M(ce,`artifacts/${Xe}/users/${Z}/division_tricks`,"progress");await he(t,{level:e},{merge:!0}),R=e,console.log("Highest completed level saved:",R)}}catch(t){console.error("Error saving highest completed level:",t)}}async function It(){try{if(Object.keys(Me).length===0)throw console.error("Firebase config is missing."),new Error("Firebase config is missing.");ye=ze(Me),ge=Je(ye),ce=Ke(ye),De?await mt(ge,De):await bt(ge),gt(ge,e=>{e?(Z=e.uid,Tt().then(()=>{})):(Z=crypto.randomUUID(),console.warn("User not authenticated, using anonymous ID."))})}catch(e){console.error("Error initializing Firebase or authenticating:",e),Z=crypto.randomUUID()}}function Bt(e,t){if(!e){console.error("Pembagianku container element not found.");return}e.innerHTML=`
    <!-- Main Category & Level Selection Screen -->
    <div id="main-selection-screen" class="w-full text-center flex flex-col flex-grow pt-4">
      <h1 class="text-3xl font-bold text-blue-800 mb-6 flex-shrink-0">
        Pilih Level Trik Pembagian
      </h1>

      <!-- Overall Progress Summary -->
      <div id="overall-progress-summary" class="bg-indigo-100 text-indigo-800 font-semibold py-2 px-4 rounded-lg mb-4 mx-auto w-full max-w-xs">
        <!-- Progress text will be inserted here by JavaScript -->
      </div>

      <!-- Level Progress Visualizer (Minimalist Graph) -->
      <div id="level-progress-visualizer" class="flex justify-center items-center gap-2 mb-6 flex-wrap">
        <!-- Dots will be injected here by JavaScript -->
      </div>

      <!-- The flex-grow and overflow-y-auto on category-list should now work correctly -->
      <div id="category-and-level-list" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto flex-grow pb-8 min-h-0">
        <!-- Categories and Level buttons will be injected here by JavaScript -->
      </div>
    </div>

    <!-- Game Screen (Hidden by default) -->
    <div id="game-screen" class="hidden w-full flex flex-col flex-grow">
      <!-- Header Bar -->
      <div class="flex justify-between items-center p-2 mb-2 bg-white rounded-t-lg">
        <button
          id="pembagianku-back-button"
          class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-3 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-110"
        >
          &larr;
        </button>
        <h2 id="current-level-title" class="text-xl font-semibold text-blue-700"></h2>
        <!-- Timer Display -->
        <div id="timer-display" class="text-lg font-bold text-red-600"></div>
      </div>

      <!-- Instruction Hint for Level 5 -->
      <div
        id="level5-instruction-hint"
        class="hidden bg-blue-100 text-blue-800 font-semibold py-2 px-4 rounded-lg mb-4 mx-auto w-full max-w-xs text-center"
      >
        Fokuslah menghafal pola soal ini! Ini adalah dasar trik selanjutnya.
      </div>

      <!-- Progress Bar -->
      <div id="progress-container" class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
        <div id="progress-bar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
      </div>

      <!-- Main Content Area -->
      <div class="flex flex-col items-center justify-start px-2 min-h-0 overflow-y-auto">
        <!-- Trick Description Display -->
        <div id="trick-description-display" class="hidden w-full mb-1 mt-1">
          <p class="font-bold mb-1">Trik yang Digunakan:</p>
          <p id="current-trick-text"></p>
        </div>

        <!-- Card Container -->
        <div id="flash-card" class="flip-card mb-1">
          <div class="flip-card-inner">
            <div class="flip-card-front">
              <p class="text-5xl font-bold mb-2" id="question-text">?</p>
              <p id="card-feedback-message-front" class="card-feedback-message"></p>
            </div>
            <div class="flip-card-back">
              <p class="text-5xl font-bold mb-2" id="answer-text"></p>
              <p id="card-feedback-message-back" class="card-feedback-message"></p>
            </div>
          </div>
        </div>

        <!-- Score Display for Test Level -->
        <div
          id="test-score-display"
          class="hidden bg-blue-100 text-blue-800 font-bold py-2 px-4 rounded-lg shadow-md mb-4 w-full max-w-xs text-center"
        >
          Skor: <span id="current-score">0</span> /
          <span id="total-test-questions">0</span>
        </div>
      </div>

      <!-- Input Methods -->
      <div class="flex flex-col gap-3 w-full max-w-xs mx-auto px-2 pb-2 flex-shrink-0 mt-1">
        <input
          type="number"
          id="manual-input"
          placeholder="Ketik jawaban di sini..."
          class="p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg"
        />
      </div>
    </div>

    <!-- Hafalan Screen (Hidden by default) -->
    <div id="hafalan-screen" class="hidden w-full flex flex-col flex-grow items-center justify-center p-4 text-center">
      <h2 id="hafalan-title" class="text-3xl font-bold text-purple-700 mb-6"></h2>
      <div id="hafalan-trick-display" class="bg-purple-50 border-2 border-purple-300 text-purple-800 p-4 rounded-lg shadow-md max-w-md mx-auto mb-8">
        <p class="font-bold text-xl mb-2">Trik:</p>
        <p id="hafalan-trick-text" class="text-lg"></p>
      </div>
      <button id="hafalan-complete-button" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105">
        Saya Sudah Hafal!
      </button>
    </div>

    <!-- Instruction Modal (Hidden by default) -->
    <div id="instruction-modal" class="modal-backdrop hidden">
      <div class="modal-content">
        <button class="modal-close-button" id="modal-close-button">&times;</button>
        <h2 id="modal-title" class="text-2xl font-bold text-blue-700 mb-4"></h2>
        <div id="modal-instruction-text" class="text-gray-700 text-base leading-relaxed">
          <!-- Instruction content will be injected here -->
        </div>
      </div>
    </div>
  `;const a=e.querySelector("#main-selection-screen"),s=e.querySelector("#game-screen"),i=e.querySelector("#hafalan-screen"),n=e.querySelector("#pembagianku-back-button"),o=e.querySelector("#question-text"),r=e.querySelector("#answer-text"),l=e.querySelector("#manual-input"),u=e.querySelector("#card-feedback-message-front"),d=e.querySelector("#card-feedback-message-back"),c=e.querySelector("#flash-card"),b=e.querySelector("#progress-bar");e.querySelector("#current-level-title");const g=e.querySelector("#timer-display");e.querySelector("#level5-instruction-hint"),e.querySelector("#trick-description-display");const m=e.querySelector("#current-trick-text");e.querySelector("#hafalan-title"),e.querySelector("#hafalan-trick-text"),e.querySelector("#hafalan-complete-button");const f=e.querySelector("#overall-progress-summary"),p=e.querySelector("#level-progress-visualizer"),k=e.querySelector("#category-and-level-list"),w=e.querySelector("#instruction-modal"),$=e.querySelector("#modal-close-button"),T=e.querySelector("#modal-title"),j=e.querySelector("#modal-instruction-text");e.querySelector("#test-score-display"),e.querySelector("#current-score"),e.querySelector("#total-test-questions");const q=(h,L)=>{h&&h.classList.toggle("hidden",!L)},v=(h,L)=>{T.textContent=h,j.innerHTML=L,q(w,!0)},C=()=>{q(w,!1)},A=()=>{k.innerHTML="",p.innerHTML="";let h=0;const L={"Trik Pembagian dengan 2":["A.1","A.2","A.3","A.4"],"Trik Pembagian dengan 5":["B.1","B.2","B.3"],"Trik Pembagian dengan 3 & 9":["C.1","C.2","C.3"],"Tes Akhir":["Test"]};let F=0;for(const ee in L)F+=L[ee].length;let z=0;for(const ee in L){const te=document.createElement("div");te.className="flex flex-col col-span-2 md:col-span-3 lg:col-span-4",te.innerHTML=`<h3 class="text-xl font-bold text-gray-700 mb-2 mt-4 text-left col-span-full">${ee}</h3>`,k.appendChild(te);const ne=document.createElement("div");ne.className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",k.appendChild(ne),L[ee].forEach(D=>{h++;const J=D==="Test",P=h>R+1,_=h<=R;_&&!J&&z++;const G=document.createElement("button");G.className=`level-button text-white w-full ${P?"bg-slate-300 text-slate-600 cursor-not-allowed":_?"bg-emerald-500 text-white hover:bg-emerald-600":"bg-indigo-500 hover:bg-indigo-600"}`,G.disabled=P,G.setAttribute("data-level-key",D);const ut=J?"Tes Akhir":`Level ${D}`;G.innerHTML=`
          <span>${ut}</span>
          ${P?'<i class="fa-solid fa-lock ml-2"></i>':""}
        `,G.addEventListener("click",()=>{P||t(D)}),ne.appendChild(G);const Ae=document.createElement("div");Ae.className=`w-4 h-4 rounded-full border-2 transition-colors duration-300 ${_?"bg-emerald-500 border-emerald-500":"bg-gray-300 border-gray-400"}`,p.appendChild(Ae)})}const W=h-1,qe=W>0?(z/W*100).toFixed(0):0;f.textContent=`Progresmu: ${z} / ${W} (${qe}%)`},S=()=>{q(a,!0),q(s,!1),q(i,!1),A()},I=()=>{ie=wt,g.classList.remove("hidden"),ke=setInterval(()=>{ie--,Q(),ie<=0&&(clearInterval(ke),me())},1e3)},Q=()=>{const h=Math.floor(ie/60),L=ie%60,F=`${String(h).padStart(2,"0")}:${String(L).padStart(2,"0")}`;g.textContent=F},H=()=>{clearInterval(ke),clearInterval(St),g.classList.add("hidden")},U=()=>{if(H(),l.value="",l.disabled=!1,l.focus(),c.classList.remove("flipped"),q(u,!1),q(d,!1),ae<pe.length){const h=pe[ae];o.textContent=h.q,r.textContent=h.a,m.textContent=Lt[h.trik];{I();const L=ae/pe.length*100;b.style.width=`${L}%`}}else H(),be()},ue=()=>{H(),l.disabled=!0,c.classList.add("flipped");const h=c.classList.contains("flipped")?d:u;h.textContent="Jawaban Benar!",h.className="card-feedback-message feedback-correct",q(h,!0),setTimeout(()=>{ae++,U()},1e3)},me=()=>{H(),l.disabled=!0;const h=c.classList.contains("flipped")?d:u;h.textContent="Salah!",h.className="card-feedback-message feedback-incorrect",q(h,!0),c.classList.add("flipped"),setTimeout(()=>{ae++,U()},1e3)},X=()=>{const h=l.value;if(h==="")return;const L=pe[ae].a;h.trim()===L?ue():me()},be=()=>{const h=vt,L=Object.keys(Ct),F=L.indexOf(h),z=F+1;if(F+1>R&&$t(F+1),z<L.length){const W=L[z];v("Level Selesai!",`Selamat! Kamu telah menyelesaikan Level ${h}. Sekarang kamu bisa melanjutkan ke Level ${W}.`)}else v("Selamat!","Kamu telah menyelesaikan semua level latihan. Sekarang waktunya mencoba Level Tes!");$.addEventListener("click",S,{once:!0})};l.addEventListener("keypress",h=>{h.key==="Enter"&&!l.disabled&&X()}),n.addEventListener("click",()=>{H(),S()}),$.addEventListener("click",C),It().then(()=>{S()})}function Et(){const e=document.createElement("style");e.textContent=`
    .flip-card {
      perspective: 1000px;
      width: 100%;
      max-width: 300px;
      height: 200px;
      margin: auto;
    }
    .flip-card-inner {
      position: relative;
      width: 100%;
      height: 100%;
      text-align: center;
      transition: transform 0.6s;
      transform-style: preserve-3d;
    }
    .flip-card.flipped .flip-card-inner {
      transform: rotateY(180deg);
    }
    .flip-card-front,
    .flip-card-back {
      position: absolute;
      width: 100%;
      height: 100%;
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      border-radius: 0.75rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
        0 4px 6px -2px rgba(0, 0, 0, 0.05);
      padding: 1rem;
    }
    .flip-card-front {
      background-color: #f0f9ff;
      color: #1e40af;
    }
    .flip-card-back {
      background-color: #dbeafe;
      color: #1e40af;
      transform: rotateY(180deg);
    }
    body {
      font-family: "Inter", sans-serif;
    }
    .card-feedback-message {
      font-size: 1.25rem;
      font-weight: bold;
      margin-top: 0.5rem;
      padding: 0.25rem 0.75rem;
      border-radius: 0.375rem;
      display: none;
    }
    .card-feedback-message.feedback-correct {
      background-color: #d1fae5;
      color: #065f46;
    }
    .card-feedback-message.feedback-incorrect {
      background-color: #fee2e2;
      color: #991b1b;
    }
    #trick-description-display {
      background-color: #fffbeb;
      border: 1px solid #fcd34d;
      color: #b45309;
      padding: 0.75rem;
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      text-align: center;
      width: 100%;
    }
    .level-button {
      background-color: #6366f1;
      font-weight: bold;
      padding: 1rem 1.5rem;
      border-radius: 0.75rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06);
      transition: background-color 0.2s, transform 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .level-button:hover:not(:disabled) {
      background-color: #4f46e5;
      transform: translateY(-2px);
    }
    .level-button:disabled {
      background-color: #cbd5e1;
      color: #64748b;
      cursor: not-allowed;
      box-shadow: none;
    }
    .level-button.locked svg {
      fill: #64748b;
    }
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .modal-content {
      background-color: #fff;
      padding: 1.5rem;
      border-radius: 0.75rem;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
      max-width: 90%;
      max-height: 90%;
      overflow-y: auto;
      position: relative;
    }
    .modal-close-button {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #666;
    }
  `,document.head.appendChild(e)}let ve=null;const Pe=document.getElementById("appContainer");if(Pe){const e=document.createElement("div");e.id="pembagiankuView",e.className="view-container hidden",Pe.appendChild(e)}Et();const qt=e=>{console.log(`Level Pembagianku dipilih: ${e}`)};async function Y(e,t,a,s){const i=document.getElementById("dashboardView");if(!i)return;if(i.innerHTML="",!e){i.innerHTML=`
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-t-emerald-500 border-gray-200 mx-auto"></div>
          <p class="mt-4 text-gray-600">Memuat data siswa...</p>
        </div>
      </div>
    `;return}const n=document.createElement("div");n.className="grid grid-cols-1 md:grid-cols-2 gap-6";const o=document.createElement("div");if(o.className="card flex flex-col border-2 border-slate-200 shadow-lg",o.innerHTML=`
    <h3 class="card-header">Informasi Siswa</h3>
    <div class="space-y-2 text-gray-700 flex-grow flex flex-col justify-center">
      <p><strong>Nama:</strong> <span id="studentNameDisplay">${e.name||"N/A"}</span></p>
      <p><strong>Kelas:</strong> <span id="studentClassDisplay">${e.classId||"N/A"}</span></p>
      <p><strong>Username:</strong> <span id="studentUsernameDisplay">${e.username||"N/A"}</span></p>
    </div>
  `,n.appendChild(o),a){const c=document.createElement("div");c.className="todays-task-notification mt-4 p-2 rounded-lg bg-red-500 text-white font-semibold text-sm cursor-pointer hover:bg-red-600 transition-colors duration-200 flex items-center justify-between shadow-xl",c.innerHTML=`
      <span class="flex items-center">
        <i class="fas fa-exclamation-circle mr-2"></i>
        <span>Ada tugas ${a.isMaterial?"Materi":"Latihan"}!</span>
      </span>
      <span class="ml-auto text-xs font-bold py-1 px-2 rounded-full bg-white text-red-500">
        Kerjakan Sekarang
      </span>
    `,o.appendChild(c),c.addEventListener("click",()=>_e(a))}const r=document.createElement("div");r.className="card col-span-full border-2 border-slate-200 shadow-lg",n.appendChild(r);const l=document.createElement("div");l.className="card col-span-full border-2 border-slate-200 shadow-lg",l.innerHTML=`
    <h3 class="card-header">Menu Aplikasi Lainnya</h3>
    <div class="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Contoh menu untuk aplikasi "Pembagianku" -->
      <a href="javascript:void(0)" class="flex items-center space-x-4 p-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors duration-200 cursor-pointer shadow-sm pembagianku-link">
        <i class="fas fa-book-reader text-indigo-500 text-2xl"></i>
        <span class="font-semibold text-gray-800">Pembagianku</span>
      </a>
      <!-- Anda bisa menambahkan menu lainnya di sini -->
    </div>
  `,n.appendChild(l),i.appendChild(n);const u=document.querySelector(".pembagianku-link");u&&u.addEventListener("click",c=>{c.preventDefault(),V("pembagianku");const b=document.getElementById("pembagiankuView");Bt(b,qt)});const d=c=>{if(c.length===0){r.innerHTML=`
        <h3 class="card-header">Nilai Mata Pelajaran</h3>
        <div class="flex items-center justify-center p-8 text-gray-500 italic">
          <p>Belum ada mata pelajaran yang memiliki nilai.</p>
        </div>
      `;return}let b=`
      <table class="data-table min-w-full">
        <thead>
          <tr>
            <th class="py-2 px-4 border-b">Mata Pelajaran</th>
            <th class="py-2 px-4 border-b">Nilai Rata-rata</th>
          </tr>
        </thead>
        <tbody>
          ${c.map(g=>`
            <tr class="hover:bg-gray-50 cursor-pointer subject-row" data-subject="${g.subject}">
              <td class="py-2 px-4 border-b text-center">${g.subject}</td>
              <td class="py-2 px-4 border-b text-center">${g.averageScore}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;r.innerHTML=`
      <h3 class="card-header">Nilai Mata Pelajaran</h3>
      <div id="materialScoresList">${b}</div>
    `,document.querySelectorAll(".subject-row").forEach(g=>{g.addEventListener("click",m=>{const f=m.currentTarget.dataset.subject,p=c.find(w=>w.subject===f),k=m.currentTarget.nextElementSibling;if(k&&k.classList.contains("material-list-row")){k.remove();return}if(p){const w=document.createElement("tr");w.className="material-list-row";const $=document.createElement("td");$.colSpan="2",$.className="p-4 border-b bg-gray-50";const T=`
            <p class="font-bold text-gray-700 mb-2">Daftar Materi:</p>
            <ul class="space-y-2">
              ${p.materials.map(j=>`
                  <li class="p-2 bg-white rounded-lg border-2 border-slate-100 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                      onclick="handleGoToTodaysTask({isMaterial: true, ...${JSON.stringify(j)}})">
                    <span class="text-gray-800">${j.title||"Materi Tanpa Judul"}</span>
                    <span class="font-semibold text-sm text-right flex-shrink-0 min-w-[5rem] ${j.averageScore!==null?"text-emerald-600":"text-red-500"}">
                      ${j.averageScore!==null?`Nilai: ${j.averageScore}`:"Belum"}
                    </span>
                  </li>
                `).join("")}
            </ul>
          `;$.innerHTML=T,w.appendChild($),m.currentTarget.after(w)}})})};if(ve)console.log("Menggunakan data nilai dari cache."),d(ve);else{console.log("Mengambil data nilai baru dari Firestore."),r.innerHTML=`
      <h3 class="card-header">Nilai Mata Pelajaran</h3>
      <div class="flex items-center justify-center p-8">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-t-emerald-500 border-gray-200"></div>
        <p class="ml-4 text-gray-600">Memuat nilai...</p>
      </div>
    `;try{const c=e?.uid;if(!c){console.error("Student UID not available. Cannot fetch scores."),r.innerHTML=`
              <h3 class="card-header">Nilai Mata Pelajaran</h3>
              <p class="text-red-500 text-center py-4">Data siswa belum lengkap. Tidak dapat memuat nilai.</p>
          `;return}if(!E){console.error("Firebase database is not initialized."),r.innerHTML=`
              <h3 class="card-header">Nilai Mata Pelajaran</h3>
              <p class="text-red-500 text-center py-4">Koneksi database gagal. Coba muat ulang halaman.</p>
          `;return}const g=(await Oe(le(E,"materials"))).docs.map(p=>({id:p.id,...p.data()})),m=new Map;g.forEach(p=>{const k=p.subject||"Lain-lain",w=k.toLowerCase();m.has(w)||m.set(w,{subject:k,materials:[]}),m.get(w).materials.push(p)});const f=[];for(const[p,k]of m.entries()){const w=await Promise.all(k.materials.map(C=>We(C.id,c)));let $=0,T=0;const j=k.materials.length,q=k.materials.map((C,A)=>{const S=w[A],I=S&&typeof S.averageScore=="number"&&!isNaN(S.averageScore)?S.averageScore:null;return I!==null&&($+=I,T++),{...C,averageScore:I}}),v=T>0?($/T).toFixed(0):"N/A";T>0&&f.push({subject:k.subject,averageScore:v,materials:q})}ve=f,d(f)}catch(c){console.error("Gagal memuat nilai mata pelajaran:",c),r.innerHTML=`
        <h3 class="card-header">Nilai Mata Pelajaran</h3>
        <p class="text-red-500 text-center py-4">Gagal memuat data nilai. Coba lagi nanti.</p>
      `}}if(a){const c=document.querySelector(".todays-task-notification");c&&c.addEventListener("click",()=>_e(a))}}function _e(e){if(e)if(e.isMaterial){V("materi");const t=document.getElementById("materialContentDisplay");t?Ye(e,t):(console.error("Element materialContentDisplay not found."),y("error","Gagal menampilkan detail materi. Elemen tidak ditemukan."))}else V("soal-harian")}let x=null,N="dashboard",K=[],de=[],oe=[],B=null;const Ne=document.getElementById("logoutButtonDesktop"),et=document.querySelectorAll(".sidebar-nav-item"),tt=document.querySelectorAll(".bottom-nav button"),at=document.getElementById("appView");document.getElementById("globalMessage");document.getElementById("messageTitle");document.getElementById("messageText");document.getElementById("messageCloseBtn");async function At(){y("loading","Memuat data siswa...");const e=localStorage.getItem("currentStudentId");if(!e){console.log("No student ID found in localStorage. Redirecting to login."),window.location.href="loginsiswa.html";return}try{const t=M(E,"users",e),a=await se(t);if(a.exists()){const s=a.data();s.role==="student"?(x=s,x.uid=e,at.classList.remove("hidden"),jt(x.uid,x.classId),st(),y("success",`Selamat datang, ${x.name}!`)):(console.warn("User ID in localStorage is not a student. Clearing localStorage and redirecting."),localStorage.removeItem("currentStudentId"),y("error","Akses ditolak. Silakan login sebagai siswa."),setTimeout(()=>{window.location.href="loginsiswa.html"},2e3))}else console.warn("User data not found for ID in localStorage. Clearing localStorage and redirecting."),localStorage.removeItem("currentStudentId"),y("error","Data pengguna tidak ditemukan."),setTimeout(()=>{window.location.href="loginsiswa.html"},2e3)}catch(t){console.error("Error during student data fetching:",t),y("error",`Terjadi kesalahan saat memuat data pengguna: ${t.message}`),localStorage.removeItem("currentStudentId"),setTimeout(()=>{window.location.href="loginsiswa.html"},2e3)}et.forEach(t=>{t.addEventListener("click",a=>{const s=a.currentTarget.dataset.view;V(s)})}),tt.forEach(t=>{t.addEventListener("click",a=>{const s=a.currentTarget.dataset.view;V(s)})}),Ne&&Ne.addEventListener("click",rt)}let we,Se,Ce,Le,Te;function jt(e,t){we&&we(),Se&&Se(),Ce&&Ce(),Le&&Le(),Te&&Te();const a=M(E,"users",e);we=re(a,r=>{r.exists()?(x={...r.data(),uid:r.id},N==="pengaturan"&&nt(x),N==="dashboard"&&Y(x,K,B)):(console.log("No student data found for current user!"),x=null,rt())},r=>{console.error("Error fetching student data:",r),y("error","Gagal memuat data profil siswa.")});const s=$e(le(E,"student_exercise_history"),fe("studentId","==",e));Se=re(s,r=>{K=r.docs.map(l=>({id:l.id,...l.data()})),K.sort((l,u)=>{const d=l.timestamp?l.timestamp.toDate?l.timestamp.toDate():new Date(l.timestamp):new Date(0);return(u.timestamp?u.timestamp.toDate?u.timestamp.toDate():new Date(u.timestamp):new Date(0))-d}),N==="dashboard"&&Y(x,K,B)},r=>{console.error("Error fetching student exercise history:",r),y("error","Gagal memuat riwayat latihan Anda.")}),Ce=re(le(E,"materials"),r=>{de=r.docs.map(l=>({id:l.id,...l.data()})),N==="materi"&&xe(de)},r=>{console.error("Error fetching materials:",r),y("error","Gagal memuat daftar materi.")});const i=new Date().toISOString().slice(0,10),n=$e(le(E,"scheduled_tasks"),fe("scheduleDate",">=",i));Le=re(n,async r=>{oe=r.docs.map(d=>({id:d.id,...d.data()})),oe.sort((d,c)=>{const b=d.scheduleTime?new Date(`${d.scheduleDate}T${d.scheduleTime}`):new Date(d.scheduleDate),g=c.scheduleTime?new Date(`${c.scheduleDate}T${c.scheduleTime}`):new Date(c.scheduleDate);return b-g});const l=new Date().toISOString().slice(0,10),u=oe.find(d=>d.scheduleDate===l);if(u){if(u.contentType==="soal"){const d=await se(M(E,"daily_ai_exercises",u.contentId));d.exists()?B={id:d.id,...d.data()}:B=null}else if(u.contentType==="materi"){const d=await se(M(E,"materials",u.contentId));d.exists()?B={id:d.id,...d.data(),isMaterial:!0}:B=null}}else B=null;N==="dashboard"&&Y(x,K,B),N==="jadwal-tugas"&&Ze(oe,de,[]),N==="soal-harian"&&Be(B||null,x.uid)},r=>{console.error("Error fetching scheduled tasks:",r),y("error","Gagal memuat jadwal tugas.")});const o=M(E,"student_motivation_messages",e);Te=re(o,r=>{r.exists()&&r.data().message&&r.data().message,N==="dashboard"&&Y(x,K,B)},r=>{console.error("Error fetching motivation message:",r),N==="dashboard"&&Y(x,K,B)})}function V(e){N=e,document.querySelectorAll(".tab-content-section").forEach(a=>{a.classList.remove("active"),a.classList.add("hidden")}),et.forEach(a=>{a.classList.remove("active"),a.dataset.view===e&&a.classList.add("active")}),tt.forEach(a=>{a.classList.remove("active"),a.dataset.view===e&&a.classList.add("active")});const t=document.getElementById(`${e}View`);t&&(t.classList.remove("hidden"),t.classList.add("active")),st()}function st(){switch(at.classList.remove("hidden"),N){case"dashboard":Y(x,K,B);break;case"soal-harian":B!==null?Be(B,x.uid):y("info","Memuat soal harian...");break;case"materi":xe(de);break;case"jadwal-tugas":Ze(oe,de,[]);break;case"pengaturan":nt(x);break;default:Y(x,K,B)}}function nt(e){if(!document.getElementById("pengaturanView"))return;e&&(document.getElementById("studentName").value=e.name||"",document.getElementById("studentUsername").value=e.username||"",document.getElementById("studentClass").value=e.classId||"");const a=document.getElementById("passwordChangeForm");a&&(a.removeEventListener("submit",He),a.addEventListener("submit",He))}async function rt(){y("info","Sedang logout...");try{localStorage.removeItem("currentStudentId"),y("success","Berhasil logout."),window.location.href="loginsiswa.html"}catch(e){console.error("Logout error:",e),y("error","Gagal logout: "+e.message)}}async function He(e){e.preventDefault(),Ve(e.target);const t=document.getElementById("newPassword").value.trim(),a=document.getElementById("confirmNewPassword").value.trim();let s=!0;if((!t||t.length<6)&&(Fe("newPassword","Password minimal 6 karakter."),s=!1),t!==a&&(Fe("confirmNewPassword","Konfirmasi password tidak cocok."),s=!1),!s){y("error","Mohon perbaiki kesalahan pada formulir.");return}y("loading","Mengubah kata sandi...");try{const i=await ht(t),n=M(E,"users",x.uid);await pt(n,{passwordHash:i,lastPasswordChange:Ee()}),y("success","Kata sandi berhasil diubah!"),document.getElementById("newPassword").value="",document.getElementById("confirmNewPassword").value=""}catch(i){console.error("Error changing password:",i),y("error",`Gagal mengubah kata sandi: ${i.message}`)}}document.addEventListener("DOMContentLoaded",At);function Fe(e,t){const a=document.getElementById(e);if(a){let s=a.nextElementSibling;(!s||!s.classList.contains("text-red-500"))&&(s=document.createElement("p"),s.classList.add("mt-1","text-red-500","text-xs","italic","inline-error-message"),a.parentNode.insertBefore(s,a.nextSibling)),s.innerText=t}}async function it(e,t,a=3,s=1e3){try{const i=await fetch(e,t);if(!i.ok)throw new Error(`HTTP error! status: ${i.status}`);return i}catch(i){if(a>0)return console.warn(`Fetch failed, retrying in ${s}ms...`),await new Promise(n=>setTimeout(n,s)),it(e,t,a-1,s*2);throw console.error("Fetch failed after 3 retries."),i}}function ot(e,t){const a=document.getElementById("dailyExerciseContent");if(!a)return;const s=t.combined_feedback||"Tidak ada umpan balik yang tersedia.";a.innerHTML=`
    <div class="text-center py-8">
      <h3 class="text-xl font-bold text-green-700 mb-4">Halo ${x.name}, Anda Telah Menyelesaikan Latihan Ini Hari Ini!</h3>
      <p class="text-gray-700 mb-2">Jenis Latihan: <strong>${e.type}</strong></p>
      <p class="text-gray-700 mb-4">Tanggal Pengerjaan: <strong>${e.date}</strong></p>
      ${t.score!==void 0&&t.score!==null?`<p class="text-gray-700 mb-4">Skor Anda: <strong>${t.score}</strong></p>`:'<p class="text-gray-700 mb-4">Skor sedang dalam tinjauan guru.</p>'}
      <div class="bg-blue-50 p-4 rounded-lg text-left mt-4">
        <h4 class="font-semibold text-blue-800 mb-2">Umpan Balik:</h4>
        <p class="text-gray-800">${s.replace(/\n/g,"<br>")}</p>
      </div>
      <button id="backToDashboardBtn" class="btn-primary mt-6">Kembali ke Dashboard</button>
    </div>
  `,document.getElementById("backToDashboardBtn")?.addEventListener("click",()=>{V("dashboard")})}async function Be(e,t){const a=document.getElementById("dailyExerciseContent");if(!a)return;if(!e){a.innerHTML=`
      <div class="text-center p-8">
        <h3 class="text-xl font-bold text-gray-700 mb-4">Tidak ada soal harian untuk hari ini.</h3>
        <p class="text-gray-500">Silakan cek kembali jadwal Anda atau kerjakan materi lain.</p>
        <button id="backToDashboardBtn" class="btn-primary mt-6">Kembali ke Dashboard</button>
      </div>
    `,document.getElementById("backToDashboardBtn")?.addEventListener("click",()=>{V("dashboard")});return}const s=new Date().toISOString().slice(0,10),i=M(E,"student_exercise_history",`${t}_${e.id}_${s}`),n=await se(i);if(n.exists()){const r=n.data();ot(e,{score:r.score,combined_feedback:r.combinedFeedback});return}let o=`
    <h3 class="text-xl font-bold text-blue-700 mb-4">Soal Latihan ${e.type}</h3>
    <p class="text-gray-600 mb-6">Tanggal: ${e.date}</p>
    <form id="exerciseForm" class="space-y-4">
  `;e.questions.forEach((r,l)=>{o+=`
      <div class="form-group">
        <label for="question${l}" class="block text-sm font-medium text-gray-700 mb-1">
          Soal ${l+1}: ${r.question}
          ${r.minWords?`<span class="text-xs text-gray-500">(Min. ${r.minWords} kata)</span>`:""}
        </label>
        <textarea id="question${l}" class="w-full p-2 border border-gray-300 rounded-md" rows="4" required></textarea>
        <div id="question${l}-error" class="input-error-message hidden"></div>
      </div>
    `}),o+='<button type="submit" class="btn-primary w-full">Kirim Jawaban</button></form>',a.innerHTML=o,document.getElementById("exerciseForm")?.addEventListener("submit",async r=>{r.preventDefault(),Ve(r.target),await Mt(e,t)})}async function Mt(e,t){y("loading","Mengirim jawaban dan memproses...");const a=[];let s=!0;for(let n=0;n<e.questions.length;n++){const r=document.getElementById(`question${n}`)?.value.trim()??"";r?e.questions[n].minWords&&r.split(/\s+/).filter(u=>u.length).length<e.questions[n].minWords&&(je(`question${n}`,`Jawaban minimal ${e.questions[n].minWords} kata.`),s=!1):(je(`question${n}`,"Jawaban tidak boleh kosong."),s=!1),a.push({question:e.questions[n].question,answer:r})}if(!s)return y("error","Mohon perbaiki jawaban Anda.");let i={};try{if(e.type==="Numerasi"&&e.answer){const o=a[0].answer.trim(),r=e.answer.finalAnswer.trim(),l=e.answer.explanation,u=o.toLowerCase()===r.toLowerCase();i.score=u?100:0,i.combined_feedback=u?`Kerja bagus, ${x.name}! Jawabanmu benar. Skor: 100.
           ${l}`:`Halo ${x.name}, jawabanmu masih kurang tepat.
           Jawaban yang benar adalah: ${r}.
           ${l}`}else{const r={contents:[{role:"user",parts:[{text:`Evaluasi jawaban siswa ${x.name} untuk soal berikut. Beri skor 0-100.
      Berikan umpan balik yang singkat dan langsung, menggabungkan motivasi dan koreksi.
      
      Data Latihan:
      ${e.readingText?`Bacaan: ${e.readingText}

`:""}
      Soal: ${a[0].question}
      Jawaban: ${a[0].answer}
      
      Format JSON:
      {
        "score": (nilai dari 0-100),
        "combined_feedback": "(Umpan balik yang singkat dan langsung, mencakup nama siswa, koreksi, dan motivasi)."
      }`}]}],generationConfig:{responseMimeType:"application/json",responseSchema:{type:"OBJECT",properties:{score:{type:"NUMBER"},combined_feedback:{type:"STRING"}}}}},d=(await(await it(Qe,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)})).json())?.candidates?.[0]?.content?.parts?.[0]?.text??"";if(!d)console.warn("Respons AI kosong. Menggunakan fallback."),i={score:null,combined_feedback:`Halo ${x.name}, jawabanmu sedang ditinjau oleh guru. Tetap semangat ya!`};else try{i=JSON.parse(d)}catch{console.warn(`Respons AI bukan JSON valid:
`,d),i={score:null,combined_feedback:`Maaf ${x.name}, saran tidak tersedia karena ada masalah. Coba lagi nanti ya!`}}}ot(e,i),y("success","Jawaban Anda berhasil dikirim!");const n=`${t}_${e.id}_${new Date().toISOString().slice(0,10)}`;await he(M(E,"student_exercise_history",n),{studentId:t,exerciseId:e.id,exerciseDate:e.date,submissionDate:new Date().toISOString().slice(0,10),exerciseType:e.type,answers:a,score:i.score??null,combinedFeedback:i.combined_feedback??"Tidak ada umpan balik yang tersedia.",timestamp:Ee()})}catch(n){console.error("Error submitting exercise:",n),y("error",`Gagal mengirim jawaban: ${n.message}`)}}const O={},lt="./",Dt="./backup_before_replace",dt=[];function ct(e){O.readdirSync(e,{withFileTypes:!0}).forEach(t=>{const a=O.join(e,t.name);t.isDirectory()?ct(a):(t.name.endsWith(".js")||t.name.endsWith(".html"))&&dt.push(a)})}function Pt(e){const t=O.relative(lt,e),a=O.join(Dt,t),s=O.dirname(a);O.mkdirSync(s,{recursive:!0}),O.copyFileSync(e,a)}function _t(e){Pt(e);let t=O.readFileSync(e,"utf8");t=t.replace(/import\s+\{[^}]+\}\s+from\s+['"]\.\/api\.js['"];?/g,""),t=t.replace(/\bGEMINI_API_URL\b/g,"'/api/gemini'"),t=t.replace(/\bGEMINI_API_KEY\b/g,"''"),O.writeFileSync(e,t,"utf8"),console.log(`Updated: ${e}`)}ct(lt);dt.forEach(_t);console.log("✅ Semua import api.js diganti ke /api/gemini (backup ada di folder backup_before_replace)");
