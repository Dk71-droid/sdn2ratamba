// js/dashboard_siswa.js
// Berisi semua fungsi khusus untuk tampilan dashboard siswa.
// Versi ini sekarang merender seluruh konten dashboard secara dinamis dan mandiri.

import { switchView, showMessage, studentData } from "./app_siswa.js";
import { renderMaterialDetail, renderMateriView } from "./materi_siswa.js";
import { getMaterialProgressSummary } from "./modelsoal/materi_diskusi.js";
import { db, collection, getDocs } from "./firebase.js"; // Impor langsung fungsi Firestore

// Impor fungsi dari file pembagianku.js
import { renderPembagiankuApp, renderPembagiankuCSS } from "./pembagianku.js";

// Variabel global untuk menyimpan data nilai mata pelajaran yang sudah di-cache
// Ini mencegah pemuatan ulang data dari Firestore setiap kali tab diakses
let subjectScoresCache = null;

// Tambahkan container untuk aplikasi Pembagianku
const appContainer = document.getElementById("appContainer");
if (appContainer) {
  const pembagiankuView = document.createElement("div");
  pembagiankuView.id = "pembagiankuView";
  pembagiankuView.className = "view-container hidden";
  appContainer.appendChild(pembagiankuView);
}

// Inisialisasi CSS Pembagianku satu kali
renderPembagiankuCSS();

// Callback untuk menangani pemilihan level di Pembagianku.js
const handleSelectPembagiankuLevel = (levelKey) => {
  // Anda bisa menambahkan logika tambahan di sini jika diperlukan,
  // misalnya untuk mencatat event di analytics.
  console.log(`Level Pembagianku dipilih: ${levelKey}`);
};

/**
 * Merender tampilan dashboard siswa dengan data yang diberikan.
 * Seluruh konten dashboard sekarang dibuat secara dinamis oleh fungsi ini.
 * @param {Object} studentData - Data profil siswa.
 * @param {Array} studentExerciseHistory - Riwayat latihan siswa.
 * @param {Object} dailyExerciseForStudent - Data tugas harian (latihan atau materi).
 * @param {string} motivationMessage - Pesan motivasi untuk siswa.
 */
async function renderDashboardView(
  studentData,
  studentExerciseHistory,
  dailyExerciseForStudent,
  motivationMessage
) {
  const dashboardViewElement = document.getElementById("dashboardView");
  if (!dashboardViewElement) return;

  // Hapus semua konten lama dari dashboardView
  dashboardViewElement.innerHTML = "";

  // Tampilkan overlay loading jika data siswa belum dimuat
  if (!studentData) {
    dashboardViewElement.innerHTML = `
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-t-emerald-500 border-gray-200 mx-auto"></div>
          <p class="mt-4 text-gray-600">Memuat data siswa...</p>
        </div>
      </div>
    `;
    return;
  }

  // Buat kontainer utama untuk layout grid
  const gridContainer = document.createElement("div");
  gridContainer.className = "grid grid-cols-1 md:grid-cols-2 gap-6";

  // --- Render Student Info Card ---
  const studentInfoCard = document.createElement("div");
  studentInfoCard.className =
    "card flex flex-col border-2 border-slate-200 shadow-lg";
  studentInfoCard.innerHTML = `
    <h3 class="card-header">Informasi Siswa</h3>
    <div class="space-y-2 text-gray-700 flex-grow flex flex-col justify-center">
      <p><strong>Nama:</strong> <span id="studentNameDisplay">${
        studentData.name || "N/A"
      }</span></p>
      <p><strong>Kelas:</strong> <span id="studentClassDisplay">${
        studentData.classId || "N/A"
      }</span></p>
      <p><strong>Username:</strong> <span id="studentUsernameDisplay">${
        studentData.username || "N/A"
      }</span></p>
    </div>
  `;
  gridContainer.appendChild(studentInfoCard);

  // --- Tambahkan notifikasi tugas harian jika ada ---
  if (dailyExerciseForStudent) {
    const taskNotification = document.createElement("div");
    taskNotification.className =
      "todays-task-notification mt-4 p-2 rounded-lg bg-red-500 text-white font-semibold text-sm cursor-pointer hover:bg-red-600 transition-colors duration-200 flex items-center justify-between shadow-xl";
    taskNotification.innerHTML = `
      <span class="flex items-center">
        <i class="fas fa-exclamation-circle mr-2"></i>
        <span>Ada tugas ${
          dailyExerciseForStudent.isMaterial ? "Materi" : "Latihan"
        }!</span>
      </span>
      <span class="ml-auto text-xs font-bold py-1 px-2 rounded-full bg-white text-red-500">
        Kerjakan Sekarang
      </span>
    `;
    studentInfoCard.appendChild(taskNotification);

    taskNotification.addEventListener("click", () =>
      handleGoToTodaysTask(dailyExerciseForStudent)
    );
  }

  // --- Render Material Scores Card ---
  const materialScoresCard = document.createElement("div");
  materialScoresCard.className =
    "card col-span-full border-2 border-slate-200 shadow-lg";
  gridContainer.appendChild(materialScoresCard);

  // --- Tambahkan kartu untuk menu aplikasi lainnya (tambahan dari permintaan) ---
  const otherAppsCard = document.createElement("div");
  otherAppsCard.className =
    "card col-span-full border-2 border-slate-200 shadow-lg";
  otherAppsCard.innerHTML = `
    <h3 class="card-header">Menu Aplikasi Lainnya</h3>
    <div class="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Contoh menu untuk aplikasi "Pembagianku" -->
      <a href="javascript:void(0)" class="flex items-center space-x-4 p-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors duration-200 cursor-pointer shadow-sm pembagianku-link">
        <i class="fas fa-book-reader text-indigo-500 text-2xl"></i>
        <span class="font-semibold text-gray-800">Pembagianku</span>
      </a>
      <!-- Anda bisa menambahkan menu lainnya di sini -->
    </div>
  `;
  gridContainer.appendChild(otherAppsCard);

  // Tambahkan semua elemen ke dashboard
  dashboardViewElement.appendChild(gridContainer);

  // --- Tambahkan event listener untuk tautan "Pembagianku" ---
  const pembagiankuLink = document.querySelector(".pembagianku-link");
  if (pembagiankuLink) {
    pembagiankuLink.addEventListener("click", (e) => {
      e.preventDefault();
      // Mengasumsikan ada view dengan ID "pembagiankuView" yang dapat dialihkan
      switchView("pembagianku");
      // Panggil fungsi render dari file pembagianku.js
      const pembagiankuViewElement = document.getElementById("pembagiankuView");
      renderPembagiankuApp(
        pembagiankuViewElement,
        handleSelectPembagiankuLevel
      );
    });
  }

  // Fungsi untuk merender tabel nilai
  const renderScoresTable = (scores) => {
    if (scores.length === 0) {
      materialScoresCard.innerHTML = `
        <h3 class="card-header">Nilai Mata Pelajaran</h3>
        <div class="flex items-center justify-center p-8 text-gray-500 italic">
          <p>Belum ada mata pelajaran yang memiliki nilai.</p>
        </div>
      `;
      return;
    }

    let scoresContent = `
      <table class="data-table min-w-full">
        <thead>
          <tr>
            <th class="py-2 px-4 border-b">Mata Pelajaran</th>
            <th class="py-2 px-4 border-b">Nilai Rata-rata</th>
          </tr>
        </thead>
        <tbody>
          ${scores
            .map(
              (score) => `
            <tr class="hover:bg-gray-50 cursor-pointer subject-row" data-subject="${score.subject}">
              <td class="py-2 px-4 border-b text-center">${score.subject}</td>
              <td class="py-2 px-4 border-b text-center">${score.averageScore}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    materialScoresCard.innerHTML = `
      <h3 class="card-header">Nilai Mata Pelajaran</h3>
      <div id="materialScoresList">${scoresContent}</div>
    `;

    // Tambahkan event listener untuk setiap baris mata pelajaran
    document.querySelectorAll(".subject-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        const subject = e.currentTarget.dataset.subject;
        const subjectData = scores.find((s) => s.subject === subject);
        const existingMaterialList = e.currentTarget.nextElementSibling;

        // Jika daftar materi sudah ada, hapus
        if (
          existingMaterialList &&
          existingMaterialList.classList.contains("material-list-row")
        ) {
          existingMaterialList.remove();
          return;
        }

        // Jika tidak ada daftar materi, buat dan tambahkan
        if (subjectData) {
          const materialListRow = document.createElement("tr");
          materialListRow.className = "material-list-row";

          const materialListCell = document.createElement("td");
          materialListCell.colSpan = "2"; // Ubah colSpan menjadi 2 untuk mengakomodasi kolom baru
          materialListCell.className = "p-4 border-b bg-gray-50";

          // Buat HTML untuk daftar materi
          const materialListHTML = `
            <p class="font-bold text-gray-700 mb-2">Daftar Materi:</p>
            <ul class="space-y-2">
              ${subjectData.materials
                .map(
                  (material) => `
                  <li class="p-2 bg-white rounded-lg border-2 border-slate-100 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                      onclick="handleGoToTodaysTask({isMaterial: true, ...${JSON.stringify(
                        material
                      )}})">
                    <span class="text-gray-800">${
                      material.title || "Materi Tanpa Judul"
                    }</span>
                    <span class="font-semibold text-sm text-right flex-shrink-0 min-w-[5rem] ${
                      material.averageScore !== null
                        ? "text-emerald-600"
                        : "text-red-500"
                    }">
                      ${
                        material.averageScore !== null
                          ? `Nilai: ${material.averageScore}`
                          : `Belum`
                      }
                    </span>
                  </li>
                `
                )
                .join("")}
            </ul>
          `;

          materialListCell.innerHTML = materialListHTML;
          materialListRow.appendChild(materialListCell);

          e.currentTarget.after(materialListRow);
        }
      });
    });
  };

  // --- Gunakan data cache jika tersedia, jika tidak muat dari Firestore ---
  if (subjectScoresCache) {
    console.log("Menggunakan data nilai dari cache.");
    renderScoresTable(subjectScoresCache);
  } else {
    console.log("Mengambil data nilai baru dari Firestore.");
    // Tampilkan loading state untuk kartu nilai
    materialScoresCard.innerHTML = `
      <h3 class="card-header">Nilai Mata Pelajaran</h3>
      <div class="flex items-center justify-center p-8">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-t-emerald-500 border-gray-200"></div>
        <p class="ml-4 text-gray-600">Memuat nilai...</p>
      </div>
    `;

    try {
      const studentUid = studentData?.uid;

      if (!studentUid) {
        console.error("Student UID not available. Cannot fetch scores.");
        materialScoresCard.innerHTML = `
              <h3 class="card-header">Nilai Mata Pelajaran</h3>
              <p class="text-red-500 text-center py-4">Data siswa belum lengkap. Tidak dapat memuat nilai.</p>
          `;
        return;
      }

      if (!db) {
        console.error("Firebase database is not initialized.");
        materialScoresCard.innerHTML = `
              <h3 class="card-header">Nilai Mata Pelajaran</h3>
              <p class="text-red-500 text-center py-4">Koneksi database gagal. Coba muat ulang halaman.</p>
          `;
        return;
      }

      // Ambil semua materi dari Firestore
      const materialsSnapshot = await getDocs(collection(db, "materials"));
      const materials = materialsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Kelompokkan materi berdasarkan mata pelajaran (subject) dengan case-insensitive
      const subjectsMap = new Map();
      materials.forEach((material) => {
        const originalSubject = material.subject || "Lain-lain";
        const normalizedSubject = originalSubject.toLowerCase(); // Normalisasi ke huruf kecil
        if (!subjectsMap.has(normalizedSubject)) {
          subjectsMap.set(normalizedSubject, {
            subject: originalSubject, // Simpan nama asli untuk ditampilkan
            materials: [],
          });
        }
        subjectsMap.get(normalizedSubject).materials.push(material);
      });

      // Hitung nilai rata-rata per mata pelajaran secara asinkron
      const subjectScores = [];
      for (const [normalizedSubject, data] of subjectsMap.entries()) {
        const allSummaries = await Promise.all(
          data.materials.map((material) =>
            getMaterialProgressSummary(material.id, studentUid)
          )
        );

        let totalScore = 0;
        let scoreCount = 0;
        const totalMaterialCount = data.materials.length;

        const materialsWithScores = data.materials.map((material, index) => {
          const summary = allSummaries[index];
          const score =
            summary &&
            typeof summary.averageScore === "number" &&
            !isNaN(summary.averageScore)
              ? summary.averageScore
              : null;

          if (score !== null) {
            totalScore += score;
            scoreCount++;
          }

          return {
            ...material,
            averageScore: score,
          };
        });

        const averageSubjectScore =
          scoreCount > 0 ? (totalScore / scoreCount).toFixed(0) : "N/A";

        // Tambahkan mata pelajaran ke daftar hanya jika ada tugas yang sudah dinilai
        if (scoreCount > 0) {
          subjectScores.push({
            subject: data.subject,
            averageScore: averageSubjectScore,
            materials: materialsWithScores,
          });
        }
      }

      // Simpan data ke cache sebelum merender
      subjectScoresCache = subjectScores;
      // Panggil fungsi render setelah data dimuat
      renderScoresTable(subjectScores);
    } catch (error) {
      console.error("Gagal memuat nilai mata pelajaran:", error);
      materialScoresCard.innerHTML = `
        <h3 class="card-header">Nilai Mata Pelajaran</h3>
        <p class="text-red-500 text-center py-4">Gagal memuat data nilai. Coba lagi nanti.</p>
      `;
    }
  }

  // Tambahkan event listener untuk tugas harian
  if (dailyExerciseForStudent) {
    const taskNotification = document.querySelector(
      ".todays-task-notification"
    );
    if (taskNotification) {
      taskNotification.addEventListener("click", () =>
        handleGoToTodaysTask(dailyExerciseForStudent)
      );
    }
  }
}

/**
 * Mengelola klik pada tombol "Go to Today's Task".
 * @param {Object} dailyExerciseForStudent - Data tugas harian (latihan atau materi).
 */
function handleGoToTodaysTask(dailyExerciseForStudent) {
  if (dailyExerciseForStudent) {
    if (dailyExerciseForStudent.isMaterial) {
      // Jika tugasnya adalah materi, pindah ke tampilan materi dan tampilkan detailnya
      switchView("materi");
      const materialContentDisplay = document.getElementById(
        "materialContentDisplay"
      );
      // Memastikan element ada sebelum memanggil fungsi
      if (materialContentDisplay) {
        renderMaterialDetail(dailyExerciseForStudent, materialContentDisplay);
      } else {
        console.error("Element materialContentDisplay not found.");
        showMessage(
          "error",
          "Gagal menampilkan detail materi. Elemen tidak ditemukan."
        );
      }
    } else {
      // Jika tugasnya adalah soal, pindah ke tampilan soal-harian
      switchView("soal-harian");
    }
  }
}

// Ekspor fungsi yang diperlukan agar bisa diakses oleh file lain
export { renderDashboardView };
