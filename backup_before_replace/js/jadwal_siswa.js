// js/jadwal_siswa.js
// Modul ini akan berisi logika untuk menampilkan jadwal tugas harian siswa.

import { showMessage } from "./utils.js";
import { studentData, switchView } from "./app_siswa.js"; // Import studentData dan switchView
// Import renderMaterialDetail dan allGeneratedExercises jika diperlukan untuk melihat konten
// Meskipun tidak diimpor langsung di sini untuk menghindari circular dependency,
// diasumsikan app_siswa.js akan mengelola pemuatan data ini.
// Jika Anda ingin melihat detail materi/soal langsung dari jadwal,
// pastikan fungsi renderMaterialDetail dan data allGeneratedExercises
// tersedia di scope global (misalnya, diekspor dari app_siswa.js dan diakses via window).

/**
 * Merender tampilan jadwal tugas untuk siswa.
 * @param {Array} scheduledTasks - Array objek tugas terjadwal dari Firestore.
 * @param {Array} allMaterials - Array objek materi dari Firestore (untuk mendapatkan judul).
 * @param {Array} allGeneratedExercises - Array objek soal dari Firestore (untuk mendapatkan judul).
 */
export function renderJadwalTugasView( // Perbaikan: Menambahkan 'export' di sini
  scheduledTasks,
  allMaterials,
  allGeneratedExercises
) {
  const scheduledTasksListContainer = document.getElementById(
    "scheduledTasksListContainer"
  );
  if (!scheduledTasksListContainer) return;

  // Filter tugas yang relevan untuk siswa ini (jika ada penugasan per kelas/siswa)
  // Untuk saat ini, asumsikan semua tugas terjadwal relevan.
  // Jika Anda mengimplementasikan penugasan per kelas, Anda perlu memfilter di sini
  // const relevantTasks = scheduledTasks.filter(task => task.assignedTo === studentData.classId || task.assignedTo === studentData.uid);

  if (scheduledTasks.length === 0) {
    scheduledTasksListContainer.innerHTML = `
      <div class="text-center text-gray-500 py-8">
        <p>Belum ada tugas yang dijadwalkan untuk Anda.</p>
      </div>
    `;
    return;
  }

  let tasksHtml = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${scheduledTasks
        .map((task) => {
          let contentTitle = "Konten tidak ditemukan";
          let contentTypeLabel = "Tidak Diketahui";
          let viewButtonHtml = "";

          if (task.contentType === "materi") {
            contentTypeLabel = "Materi";
            const material = allMaterials.find((m) => m.id === task.contentId);
            if (material) {
              contentTitle = material.title;
              viewButtonHtml = `
                <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full text-sm view-scheduled-content-btn" data-content-type="materi" data-content-id="${task.contentId}">
                  Lihat Materi
                </button>
              `;
            }
          } else if (task.contentType === "soal") {
            contentTypeLabel = "Soal Latihan";
            // Asumsi allGeneratedExercises tersedia secara global atau diimpor
            const exercise = allGeneratedExercises.find(
              (ex) => ex.id === task.contentId
            );
            if (exercise) {
              contentTitle = `Soal ${exercise.type} (${exercise.date})`;
              viewButtonHtml = `
                <button class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full text-sm view-scheduled-content-btn" data-content-type="soal" data-content-id="${task.contentId}">
                  Kerjakan Soal
                </button>
              `;
            }
          }

          return `
            <div class="card p-4 shadow-md rounded-xl bg-white">
              <h3 class="font-bold text-lg text-gray-800 mb-2">${contentTitle}</h3>
              <p class="text-gray-600 text-sm mb-1">Jenis: ${contentTypeLabel}</p>
              <p class="text-gray-600 text-sm mb-1">Tanggal: ${
                task.scheduleDate
              }</p>
              <p class="text-gray-600 text-sm mb-4">Waktu: ${
                task.scheduleTime || "Sepanjang Hari"
              }</p>
              <div class="flex justify-end">
                ${viewButtonHtml}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  scheduledTasksListContainer.innerHTML = tasksHtml;

  // Add event listeners for view buttons
  document.querySelectorAll(".view-scheduled-content-btn").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const contentType = e.currentTarget.dataset.contentType;
      const contentId = e.currentTarget.dataset.contentId;

      if (contentType === "materi") {
        const material = allMaterials.find((mat) => mat.id === contentId);
        if (material) {
          switchView("materi"); // Pindah ke tampilan materi
          // Panggil renderMaterialDetail dari materi_siswa.js
          // Ini memerlukan materi_siswa.js untuk mengekspor renderMaterialDetail dan materialContentDisplay
          // Asumsi materialContentDisplay tersedia di portal siswa
          const materialContentDisplay = document.getElementById(
            "materialContentDisplay"
          );
          if (materialContentDisplay) {
            // Pastikan renderMaterialDetail diimpor atau diakses secara global
            // Untuk menghindari impor sirkular, bisa diakses via window jika materi_siswa.js juga dimuat
            // Atau pastikan materi_siswa.js meng-export renderMaterialDetail dan diimpor di app_siswa.js
            // dan diteruskan ke sini jika perlu.
            // Untuk saat ini, diasumsikan renderMaterialDetail diekspor dari materi_siswa.js
            // dan materi_siswa.js diimpor di app_siswa.js, sehingga bisa diakses.
            // Jika tidak, Anda mungkin perlu mengimpornya langsung di sini atau meneruskannya.
            // Untuk demo, kita bisa mengandalkan window.renderMaterialDetail jika materi_siswa.js dimuat global.
            if (typeof window.renderMaterialDetail === "function") {
              window.renderMaterialDetail(material, materialContentDisplay);
            } else {
              showMessage(
                "error",
                "Fungsi renderMaterialDetail tidak ditemukan. Pastikan materi_siswa.js dimuat dengan benar."
              );
            }
          } else {
            showMessage("error", "Elemen tampilan materi tidak ditemukan.");
          }
        } else {
          showMessage("error", "Materi tidak ditemukan.");
        }
      } else if (contentType === "soal") {
        // Untuk soal, kita hanya akan mengarahkan ke tampilan soal harian
        // Logika untuk memuat soal spesifik akan ditangani oleh app_siswa.js
        // berdasarkan dailyExerciseForStudent atau parameter lain.
        switchView("soal-harian");
        showMessage("info", "Anda akan diarahkan ke halaman soal latihan.");
      }
    });
  });
}

// Tidak perlu setupJadwalListeners() di sini karena event listener ditambahkan langsung
// setelah renderJadwalTugasView dipanggil.
