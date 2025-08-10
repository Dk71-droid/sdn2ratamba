// js/modelsoal/materi_narasi.js
// Modul ini khusus untuk rendering model pembelajaran "Petualangan Cerita & Narasi".
import { renderMateriView } from "../materi_siswa.js";

/**
 * Merender konten cerita dan narasi.
 * @param {object} materialData - Objek materi yang dipilih.
 * @param {array} materials - Array semua materi (untuk navigasi kembali).
 */
export function renderNarasi(materialData, materials) {
  const materialDetailContent = document.getElementById(
    "materialDetailContent"
  );
  if (!materialDetailContent) return;

  const lesson = materialData.lessonData || {};
  const materialTitle =
    lesson.storyTitle || materialData.title || "Judul Tidak Tersedia";
  const materialIntro =
    lesson.introduction ||
    materialData.introduction ||
    "Pendahuluan tidak tersedia.";

  let narasiHtml = `
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
      <h2 class="text-2xl md:text-3xl font-extrabold text-blue-900 mb-1">${materialTitle}</h2>
      <p id="storyIntroText" class="text-blue-800 text-sm md:text-lg italic mb-4">${materialIntro}</p>
  `;

  // Kontainer untuk konten cerita yang akan diubah ukurannya
  narasiHtml += `<div id="storyContent">`;

  // Plot per bab
  if (Array.isArray(lesson.plot) && lesson.plot.length > 0) {
    lesson.plot.forEach((chapter, idx) => {
      narasiHtml += `
        <div class="mb-6">
          <h3 class="font-bold text-blue-800 text-xl mb-2">${
            chapter.chapterTitle || "Tanpa Judul"
          }</h3>
          <p class="story-text text-gray-800 leading-relaxed">${
            chapter.chapterContent
              ? chapter.chapterContent.replace(/\n/g, "<br>")
              : "Konten bab tidak tersedia."
          }</p>
        </div>
      `;
    });
  } else if (lesson.narrative) {
    narasiHtml += `<div class="story-text text-gray-800 leading-relaxed space-y-4">${lesson.narrative}</div>`;
  } else {
    narasiHtml += `<p class="story-text text-gray-500">Plot cerita tidak tersedia.</p>`;
  }

  // Pesan moral
  if (lesson.moralLesson) {
    narasiHtml += `
      <h4 class="font-bold text-green-700 text-xl mt-4 mb-2">Pesan Moral:</h4>
      <p class="story-text text-green-800 leading-relaxed">${lesson.moralLesson.replace(
        /\n/g,
        "<br>"
      )}</p>
    `;
  }

  // Story Assessment - Pemahaman cerita
  if (lesson.storyAssessment) {
    narasiHtml += `<div class="bg-blue-100 p-4 rounded-xl mt-6 border border-blue-300">`;

    if (
      Array.isArray(lesson.storyAssessment.comprehensionQuestions) &&
      lesson.storyAssessment.comprehensionQuestions.length > 0
    ) {
      lesson.storyAssessment.comprehensionQuestions.forEach((q) => {
        narasiHtml += `
          <div class="bg-yellow-50 p-4 rounded-xl mb-4 border border-yellow-200">
            <h4 class="font-semibold text-yellow-800 mb-2">Ayo Pahami Cerita! 🤔</h4>
            <p class="story-text text-yellow-700 text-sm mb-2">${
              q.questionText || "Pertanyaan tidak tersedia."
            }</p>
            <textarea class="w-full p-2 rounded-md border border-yellow-300 text-gray-700 text-sm" rows="3" placeholder="Tulis jawabanmu di sini..."></textarea>
          </div>
        `;
      });
    }

    // Story Assessment - Menjodohkan
    if (
      Array.isArray(lesson.storyAssessment.matchingActivities) &&
      lesson.storyAssessment.matchingActivities.length > 0
    ) {
      lesson.storyAssessment.matchingActivities.forEach((activity) => {
        narasiHtml += `
          <div class="bg-blue-50 p-4 rounded-xl mt-4 border border-blue-200">
            <h4 class="font-semibold text-blue-800 mb-2">Ayo Menjodohkan! 🧩</h4>
            <p class="story-text text-blue-700 text-sm mb-2">${
              activity.instructions || "Instruksi tidak tersedia."
            }</p>
            <div class="grid grid-cols-2 gap-4 mt-4">
              <div class="flex flex-col space-y-2">
                ${activity.pairs
                  ?.map(
                    (p) =>
                      `<div class="bg-blue-100 p-2 rounded-md border border-blue-300 text-blue-800 font-medium">${
                        p.term || ""
                      }</div>`
                  )
                  .join("")}
              </div>
              <div class="flex flex-col space-y-2">
                ${activity.pairs
                  ?.map(
                    (p) =>
                      `<select class="w-full p-2 rounded-md border border-blue-300 text-gray-700 text-sm"><option value="">Pilih...</option><option>${
                        p.match || ""
                      }</option></select>`
                  )
                  .join("")}
              </div>
            </div>
          </div>
        `;
      });
    }
    narasiHtml += `</div>`;
  }

  // Creative Projects
  if (
    Array.isArray(lesson.creativeProjects) &&
    lesson.creativeProjects.length > 0
  ) {
    narasiHtml += `
      <div class="bg-yellow-50 p-4 rounded-xl mt-4 border border-yellow-200">
        <h4 class="font-semibold text-yellow-800 mb-2">Ayo Berkreasi! ✍️</h4>
        <ul class="list-disc list-inside text-yellow-700 text-sm">
          ${lesson.creativeProjects
            .map((p) => `<li class="story-text">${p}</li>`)
            .join("")}
        </ul>
      </div>
    `;
  }

  narasiHtml += `</div></div>`; // Menutup div #storyContent dan div p-4
  materialDetailContent.innerHTML = narasiHtml;

  document
    .getElementById("backToMaterialsListBtn")
    .addEventListener("click", () => {
      renderMateriView(materials);
    });

  const storyContentElement = document.getElementById("storyContent");
  const storyIntroTextElement = document.getElementById("storyIntroText");
  const increaseFontBtn = document.getElementById("increaseFontBtn");
  const decreaseFontBtn = document.getElementById("decreaseFontBtn");
  let currentFontSize = 16;
  const minFontSize = 14;
  const maxFontSize = 24;

  if (
    storyContentElement &&
    storyIntroTextElement &&
    increaseFontBtn &&
    decreaseFontBtn
  ) {
    const applyFontSize = (size) => {
      storyIntroTextElement.style.fontSize = `${size}px`;
      storyContentElement.querySelectorAll(".story-text").forEach((el) => {
        el.style.fontSize = `${size}px`;
      });
    };

    // Set initial font size
    applyFontSize(currentFontSize);

    increaseFontBtn.addEventListener("click", () => {
      if (currentFontSize < maxFontSize) {
        currentFontSize += 2;
        applyFontSize(currentFontSize);
      }
    });

    decreaseFontBtn.addEventListener("click", () => {
      if (currentFontSize > minFontSize) {
        currentFontSize -= 2;
        applyFontSize(currentFontSize);
      }
    });
  }
}
