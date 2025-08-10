// js/materi_siswa.js
// Modul ini berisi logika utama untuk menampilkan daftar materi pembelajaran.
// Logika rendering detail materi kini dipisahkan ke modul-modul yang lebih spesifik.

import { showMessage } from "./utils.js";
import { studentData } from "./app_siswa.js";
import { renderNarasi } from "./modelsoal/materi_narasi.js"; // Import modul narasi dari folder baru
import {
  renderDiskusi,
  getMaterialProgressSummary,
} from "./modelsoal/materi_diskusi.js"; // Import modul diskusi dan fungsi baru

// --- Global State Variables for Materi Module ---
export let allGeneratedMaterials = [];

// --- State Management for Chapter Progress ---
// Menyimpan progress siswa di localStorage.
// Gunakan `uid` siswa untuk memastikan progress tidak tercampur antar pengguna.
export function saveChapterProgress(materialId, chapterIndex) {
  if (!studentData || !studentData.uid) {
    console.error("Data siswa tidak tersedia. Tidak dapat menyimpan progress.");
    return;
  }
  let progress =
    JSON.parse(localStorage.getItem(`progress_${studentData.uid}`)) || {};
  if (!progress[materialId]) {
    progress[materialId] = 0; // Default ke bab 0 jika belum ada
  }
  // Hanya simpan jika bab yang selesai lebih besar dari progress terakhir
  if (chapterIndex > progress[materialId]) {
    progress[materialId] = chapterIndex;
    localStorage.setItem(
      `progress_${studentData.uid}`,
      JSON.stringify(progress)
    );
    showMessage(
      "success",
      "Bab berhasil diselesaikan! Bab selanjutnya sudah terbuka."
    );
  }
}

export function getChapterProgress(materialId) {
  if (!studentData || !studentData.uid) {
    console.error("Data siswa tidak tersedia. Progress tidak dapat diambil.");
    return 0;
  }
  let progress =
    JSON.parse(localStorage.getItem(`progress_${studentData.uid}`)) || {};
  return progress[materialId] || 0;
}

/**
 * Mengubah setiap kata dalam string menjadi huruf besar di awal kata.
 * @param {string} str - String yang akan diformat.
 * @returns {string} String dengan format huruf besar di awal kata.
 */
function capitalizeWords(str) {
  if (!str) return "";
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

// --- Fungsi Rendering UI Materi ---

export async function renderMateriView(materials) {
  const materialsListContainer = document.getElementById(
    "materialsListContainer"
  );
  const materialContentDisplay = document.getElementById(
    "materialContentDisplay"
  );

  if (!materialsListContainer || !materialContentDisplay) return;

  // Sembunyikan tampilan detail materi dan tampilkan daftar materi
  materialContentDisplay.classList.add("hidden");
  materialsListContainer.classList.remove("hidden");

  if (!Array.isArray(materials) || materials.length === 0) {
    materialsListContainer.innerHTML = `
      <div class="text-center text-gray-500 py-8">
        <p>Belum ada materi pembelajaran yang tersedia.</p>
      </div>
    `;
    return;
  }

  // Kelompokkan materi berdasarkan subjek secara case-insensitive
  const groupedMaterials = materials.reduce((acc, material) => {
    const subjectKey = material.subject.toLowerCase();
    if (!acc[subjectKey]) {
      acc[subjectKey] = {
        name: material.subject, // Simpan nama asli
        items: [],
      };
    }
    acc[subjectKey].items.push(material);
    return acc;
  }, {});

  let materialsListHtml = `
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
  `;

  const shadowClasses = ["shadow-md", "shadow-lg", "shadow-xl"];
  const borderColorClasses = [
    "border-blue-400",
    "border-green-400",
    "border-yellow-400",
    "border-red-400",
    "border-purple-400",
  ];
  const cardBgClasses = [
    "bg-indigo-50",
    "bg-sky-50",
    "bg-emerald-50",
    "bg-amber-50",
    "bg-rose-50",
    "bg-fuchsia-50",
  ];
  let colorIndex = 0;

  // Mengambil semua data progress secara paralel sebelum merender UI
  const allMaterialPromises = materials.map(async (material) => {
    let progressSummary = null;
    let isCompleted = false;
    if (
      material.learningModel === "Eksplorasi Konsep & Diskusi Esai" &&
      studentData?.uid
    ) {
      progressSummary = await getMaterialProgressSummary(
        material.id,
        studentData.uid
      );
      const totalChapters = material.lessonData.sections.length;
      if (progressSummary) {
        isCompleted = progressSummary.completedChapters === totalChapters;
      }
    }
    return { id: material.id, progressSummary, isCompleted };
  });

  const allProgressResults = await Promise.all(allMaterialPromises);
  const progressMap = new Map(allProgressResults.map((p) => [p.id, p]));

  for (const subjectKey in groupedMaterials) {
    const subjectData = groupedMaterials[subjectKey];
    const borderClass =
      borderColorClasses[colorIndex % borderColorClasses.length];
    colorIndex++;

    materialsListHtml += `
      <div class="mb-2 md:mb-4">
        <div class="flex items-center p-3 md:p-4 cursor-pointer hover:shadow-lg transition-all duration-300 subject-header rounded-lg shadow-md border-l-4 ${borderClass} bg-gray-100" data-subject-key="${subjectKey}">
          <h3 class="flex-grow font-bold text-left text-sm md:text-xl text-gray-800">${capitalizeWords(
            subjectData.name
          )}</h3>
          <svg class="w-4 h-4 md:w-5 md:h-5 text-gray-600 transform transition-transform duration-300 chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <div id="materials-${subjectKey}" class="materials-list overflow-hidden transition-all duration-300 max-h-0">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 p-2 md:p-4">
    `;

    materialsListHtml += subjectData.items
      .map((material, index) => {
        const progressResult = progressMap.get(material.id);
        const { isCompleted, progressSummary } = progressResult || {
          isCompleted: false,
          progressSummary: null,
        };

        const shadowClass = shadowClasses[index % shadowClasses.length];
        const cardBackgroundColor = isCompleted
          ? "bg-white"
          : cardBgClasses[index % cardBgClasses.length];
        const cardBorderClass = isCompleted
          ? "border-green-400"
          : borderColorClasses[index % borderColorClasses.length];

        let scoreTextColor = "";
        let titleTextColor = "";
        let modelTextColor = "text-gray-600";
        let cornerFoldColorClass = "";

        if (isCompleted) {
          const score = progressSummary.averageScore;
          if (score < 60) {
            scoreTextColor = "text-red-800";
            cornerFoldColorClass = "corner-fold-red";
          } else {
            scoreTextColor = "text-blue-800";
            cornerFoldColorClass = "corner-fold-blue";
          }
          titleTextColor = "text-gray-800";
          modelTextColor = "text-gray-600";
        } else {
          scoreTextColor = "text-gray-800";
          titleTextColor = "text-gray-800";
          modelTextColor = "text-gray-600";
        }

        return `
          <div class="card p-3 md:p-5 cursor-pointer transition-all duration-300 view-material-btn rounded-lg ${cardBackgroundColor} ${shadowClass} hover:shadow-2xl border-l-4 ${cardBorderClass} ${
          isCompleted ? "relative corner-fold " + cornerFoldColorClass : ""
        }" data-material-id="${material.id}">
            ${
              isCompleted
                ? `
              <p class="text-xs font-bold ${scoreTextColor} mb-1">
                Selesai: Nilai ${progressSummary.averageScore}
              </p>
            `
                : ""
            }
            <h4 class="font-bold text-sm md:text-lg ${titleTextColor}">${
          material.title
        }</h4>
            <p class="text-xs md:text-sm mt-1 ${modelTextColor}">
              Model: ${material.learningModel}
            </p>
          </div>
        `;
      })
      .join("");
    materialsListHtml += `
          </div>
        </div>
      </div>
    `;
  }
  materialsListHtml += `</div>`;
  materialsListContainer.innerHTML = materialsListHtml;

  // Add event listeners for subject headers to toggle materials list
  document.querySelectorAll(".subject-header").forEach((header) => {
    header.addEventListener("click", (e) => {
      const subjectKey = e.currentTarget.dataset.subjectKey;
      const materialList = document.getElementById(`materials-${subjectKey}`);
      const chevron = e.currentTarget.querySelector(".chevron");

      // Close other open lists
      document.querySelectorAll(".materials-list").forEach((list) => {
        if (list.id !== `materials-${subjectKey}`) {
          list.classList.remove("max-h-screen");
          list.classList.add("max-h-0");
        }
      });
      document.querySelectorAll(".chevron").forEach((chev) => {
        if (chev !== chevron) {
          chev.classList.remove("rotate-90");
        }
      });

      // Toggle the clicked list
      materialList.classList.toggle("max-h-0");
      materialList.classList.toggle("max-h-screen");
      chevron.classList.toggle("rotate-90");
    });
  });

  // Add event listeners for the material cards
  document.querySelectorAll(".view-material-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const materialId = e.currentTarget.dataset.materialId;
      const materialData = materials.find((m) => m.id === materialId);
      if (materialData) {
        renderMaterialDetail(materialData, materials);
      }
    });
  });
}

/**
 * Fungsi "router" yang memanggil fungsi render yang sesuai
 * berdasarkan model pembelajaran.
 * @param {object} materialData - Objek materi yang dipilih.
 * @param {array} materials - Array semua materi.
 */
export function renderMaterialDetail(materialData, materials) {
  const materialsListContainer = document.getElementById(
    "materialsListContainer"
  );
  const materialContentDisplay = document.getElementById(
    "materialContentDisplay"
  );

  if (!materialsListContainer || !materialContentDisplay) return;

  // Sembunyikan daftar materi dan tampilkan kontainer detail
  materialsListContainer.classList.add("hidden");
  materialContentDisplay.classList.remove("hidden");

  // Panggil fungsi render yang sesuai berdasarkan learningModel
  if (materialData.learningModel === "Petualangan Cerita & Narasi") {
    renderNarasi(materialData, materials);
  } else {
    // Model default atau model lain
    renderDiskusi(materialData, materials);
  }
}
