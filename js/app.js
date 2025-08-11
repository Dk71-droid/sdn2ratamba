// js/app.js

import { GEMINI_API_URL } from "./api.js"; // NEW: Import from api.js

// Import modul-modul yang dibutuhkan
import {
  auth,
  onAuthStateChanged,
  signOut,
  db,
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
} from "./firebase.js";
import {
  showMessage,
  hashString,
  displayInlineError,
  clearInlineError,
  clearAllInlineErrors,
} from "./utils.js";
import {
  generateAndSaveDailyExercise,
  getDailyExerciseTypeForAI,
} from "./soal.js";
import { renderStudentTable, showStudentListModal } from "./dashboard.js"; // Menggunakan renderStudentTable dan showStudentListModal dari dashboard.js
import {
  handleLogout,
  handleUpdateProfile,
  handleChangePassword,
  setupSettingListeners,
} from "./setting.js"; // Import dari setting.js
// Import fungsi dan variabel yang diperlukan dari materi.js
import {
  renderMateriView as renderMateriViewContent, // Mengubah nama fungsi agar lebih spesifik untuk konten dinamis
  generateFokusPembahasanSuggestions,
  generateMaterial,
  setupMateriFormListenersModal,
  getFormValues,
  setFormValues,
  updateFormDisabledState,
  loadingMaterialGeneration,
  loadingSubTopicSuggestions,
  materialGenerationError,
  subTopicSuggestionError,
  learningModels,
  renderLessonContentDisplay, // Import renderLessonContentDisplay
  allGeneratedMaterials, // FIX: Import allGeneratedMaterials from materi.js
} from "./materi.js";
// NEW: Import fungsi dan variabel yang diperlukan dari jadwal.js
import {
  renderJadwalView, // Fungsi untuk merender tampilan penjadwalan
  // setupJadwalListeners, // Fungsi untuk setup event listeners di jadwal.js (jika ada, namun di jadwal.js ini tidak ada karena listener di-setup di renderJadwalView)
} from "./jadwal.js";

// --- Global State Variables ---
let teacherData = null;
let currentMainTeacherView = "dashboard";
let allStudents = [];
let currentDailyExerciseAdmin = null; // Untuk soal harian yang sedang ditampilkan di admin
let allGeneratedExercises = []; // Untuk riwayat soal yang digenerate (masih disimpan, tapi tidak ditampilkan di UI soal)
let studentExerciseHistory = []; // Untuk riwayat latihan siswa
let hasAttemptedDailyGenerate = false; // Flag untuk mencegah auto-generate berulang
let showDailyExerciseEditMode = false; // State untuk mengontrol tampilan soal harian (lihat/edit)
// REMOVED: let allGeneratedMaterials = []; // Ini dihapus karena sudah diimpor dari materi.js
let allScheduledTasks = []; // NEW: Untuk menyimpan data tugas terjadwal

// State for Modals
let showAddStudentModal = false;
let showEditStudentModal = false;
let editingStudent = null; // Store student object being edited
let showConfirmModal = false;
let confirmModalMessage = "";
let confirmModalAction = null;
let onCancelConfirm = null; // Callback for cancel action in confirm modal
let showExerciseDetailsModal = false; // New state for exercise details modal
let exerciseDetailsData = null; // Data for exercise details modal
let showEditExerciseModal = false; // New state for editing exercise (now used for old exercises, not daily)
let editingExerciseData = null; // Data for editing exercise (now used for old exercises, not daily)
let showStudentHistoryDetailsModal = false; // New: For viewing student history details
let currentStudentHistoryDetails = null; // New: Stores student history for detail modal

// NEW MODAL STATES FOR MATERI
let showGenerateMaterialModal = false; // State untuk modal generate materi baru
let showViewMaterialModal = false; // State untuk modal melihat detail materi
let viewMaterialData = null; // Data materi yang akan ditampilkan di modal detail

// --- DOM Elements ---
const logoutButtonMobile = document.getElementById("logoutButton");
const sidebarNavItems = document.querySelectorAll(".sidebar-nav-item");
const bottomNavButtons = document.querySelectorAll(".bottom-nav button");
const appView = document.getElementById("appView");
let modalContainer = document.getElementById("modal-container"); // Container for dynamically rendered modals

// Global Message Component
const globalMessage = document.getElementById("globalMessage");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");
const messageCloseBtn = document.getElementById("messageCloseBtn");

// Helper to hide loading overlay
function hideLoadingOverlay() {
  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) {
    loadingOverlay.classList.add("hidden");
  }
}

// --- Fungsi Inisialisasi Aplikasi ---
async function initializeApp() {
  onAuthStateChanged(auth, async (user) => {
    console.log("onAuthStateChanged fired. User:", user); // Debug Log 1

    if (user) {
      showMessage("loading", "Memuat data guru...");
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        console.log("User document snapshot exists:", userDocSnap.exists()); // Debug Log 2
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          console.log("User data from Firestore:", userData); // Debug Log 3
          console.log("User role:", userData.role); // Debug Log 4

          if (userData.role === "teacher") {
            teacherData = userData;
            console.log("Teacher data set:", teacherData); // Debug Log 5

            appView.classList.remove("hidden");

            // Setup listeners Firestore
            setupFirestoreListeners(user.uid);

            // Panggil renderMainContent untuk merender tampilan awal (dashboard) dan mengisi kartu info guru
            renderMainContent(); // Ini akan memanggil renderTeacherInfoCard secara internal

            // Setelah rendering awal, tampilkan pesan sukses
            showMessage(
              "success",
              `Selamat datang, ${teacherData.name || "Guru"}!`
            );
            hideLoadingOverlay();
            console.log("Login successful, dashboard rendered."); // Debug Log 6
          } else {
            console.warn(
              "User is logged in but role is not 'teacher'. Role:",
              userData.role
            ); // Debug Log 7
            showMessage("error", "Akses ditolak. Silakan login sebagai guru.");
            // Tambahkan jeda waktu sebelum mengarahkan untuk memberi kesempatan melihat pesan
            setTimeout(async () => {
              await signOut(auth);
              window.location.href = "loginguru.html";
            }, 2000); // Jeda 2 detik
          }
        } else {
          console.warn("User document does not exist for UID:", user.uid); // Debug Log 8
          // Data guru tidak ditemukan di Firestore untuk UID ini
          showMessage(
            "error",
            "Akses ditolak. Data guru tidak ditemukan.",
            "Login Gagal"
          );
          // Tambahkan jeda waktu sebelum mengarahkan untuk memberi kesempatan melihat pesan
          setTimeout(async () => {
            await signOut(auth);
            window.location.href = "loginguru.html";
          }, 2000); // Jeda 2 detik
        }
      } catch (error) {
        console.error("Error during user data fetching or role check:", error); // Debug Log 9
        showMessage(
          "error",
          `Terjadi kesalahan saat memuat data pengguna: ${error.message}`,
          "Login Gagal"
        );
        // Paksa logout saat terjadi error dan arahkan setelah jeda
        setTimeout(async () => {
          await signOut(auth);
          window.location.href = "loginguru.html";
        }, 2000); // Jeda 2 detik
      }
    } else {
      console.log("User is signed out. Redirecting to login page."); // Debug Log 10
      hideLoadingOverlay();
      // Arahkan ke halaman login jika belum di sana
      if (window.location.pathname !== "/loginguru.html") {
        window.location.href = "loginguru.html";
      }
    }
  });

  sidebarNavItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      const view = e.currentTarget.dataset.view;
      switchView(view);
    });
  });

  bottomNavButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const view = e.currentTarget.dataset.view;
      switchView(view);
    });
  });

  const totalStudentsCard = document.getElementById("totalStudentsCard");
  if (totalStudentsCard) {
    totalStudentsCard.addEventListener("click", () => {
      showStudentListModal(allStudents);
    });
  }
}

// --- Firestore Listeners ---
let unsubscribeTeacherProfile;
let unsubscribeDailyAIExercise;
let unsubscribeAllGeneratedExercises; // Tetap ada untuk keperluan internal (edit/delete)
let unsubscribeAllStudents;
let unsubscribeStudentExerciseHistory;
// Materi listener sekarang dihandle di materi.js, jadi tidak perlu unsubscribeAllGeneratedMaterials di sini
let unsubscribeScheduledTasks; // NEW: Listener untuk tugas terjadwal

function setupFirestoreListeners(teacherUid) {
  // Unsubscribe from previous listeners to prevent memory leaks and duplicate updates
  if (unsubscribeTeacherProfile) unsubscribeTeacherProfile();
  if (unsubscribeDailyAIExercise) unsubscribeDailyAIExercise();
  if (unsubscribeAllGeneratedExercises) unsubscribeAllGeneratedExercises();
  if (unsubscribeAllStudents) unsubscribeAllStudents();
  if (unsubscribeStudentExerciseHistory) unsubscribeStudentExerciseHistory();
  // Materi listener sudah dihandle di materi.js, pastikan tidak ada duplikasi unsubscribe di sini
  if (unsubscribeScheduledTasks) unsubscribeScheduledTasks(); // NEW: Unsubscribe listener tugas terjadwal

  // Listener untuk data guru
  const teacherDocRef = doc(db, "users", teacherUid);
  unsubscribeTeacherProfile = onSnapshot(
    teacherDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        teacherData = docSnap.data();
        if (currentMainTeacherView === "pengaturan") {
          renderPengaturanView(teacherData); // Re-render pengaturan view to update profile data
        }
        renderTeacherInfoCard(); // Perbarui kartu info guru saat data berubah
      } else {
        console.log("No teacher data found for current user!");
        teacherData = null;
        // Pertimbangkan untuk logout atau redirect jika data guru tiba-tiba hilang
      }
    },
    (error) => {
      console.error("Error fetching teacher data:", error);
      showMessage("error", "Gagal memuat data profil guru.");
    }
  );

  // Listener untuk soal AI harian (untuk tampilan admin)
  const todayDate = new Date().toISOString().slice(0, 10);
  const dailyAIExerciseDocRef = doc(db, "daily_ai_exercises", todayDate);
  unsubscribeDailyAIExercise = onSnapshot(
    dailyAIExerciseDocRef,
    async (docSnap) => {
      if (docSnap.exists()) {
        currentDailyExerciseAdmin = { id: docSnap.id, ...docSnap.data() };
        hasAttemptedDailyGenerate = true; // Set true if exercise already exists
      } else {
        currentDailyExerciseAdmin = null;
        showDailyExerciseEditMode = false; // Reset edit mode if exercise is deleted
        // Otomatis generate jika tidak ada soal untuk hari ini dan belum pernah dicoba
        if (!hasAttemptedDailyGenerate && teacherData) {
          // Pastikan teacherData sudah ada
          hasAttemptedDailyGenerate = true; // Set flag untuk mencegah re-trigger
          showMessage(
            "info",
            "Soal harian untuk hari ini belum ada. Mencoba menggenerate otomatis..."
          );
          const dailyTypeForToday = getDailyExerciseTypeForAI(todayDate);
          await generateAndSaveDailyExercise(
            todayDate,
            dailyTypeForToday,
            true
          ); // true for isAutoGenerate
        }
      }
      if (currentMainTeacherView === "soal") {
        // Only re-render if on the 'soal' tab
        renderSoalView(); // Render ulang untuk memperbarui tampilan soal
      }
    },
    (error) => {
      console.error("Error fetching daily AI exercise:", error);
      showMessage("error", "Gagal memuat soal latihan AI harian.");
    }
  );

  // Listener untuk semua soal yang digenerate (untuk tab soal)
  // Data ini masih dibutuhkan untuk fungsi edit/hapus meskipun tidak ditampilkan secara langsung di tabel
  const allGeneratedExercisesQuery = query(
    collection(db, "daily_ai_exercises")
  );
  unsubscribeAllGeneratedExercises = onSnapshot(
    allGeneratedExercisesQuery,
    (snapshot) => {
      allGeneratedExercises = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      allGeneratedExercises.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // Urutkan berdasarkan tanggal menurun (terbaru di atas)
      });
      // Tidak perlu renderSoalView() di sini karena perubahan ini tidak langsung mempengaruhi tampilan utama soal
      // Tampilan soal harian sudah diurus oleh unsubscribeDailyAIExercise
    },
    (error) => {
      console.error("Error fetching all generated exercises:", error);
      showMessage("error", "Gagal memuat riwayat soal yang digenerate.");
    }
  );

  // Listener untuk semua siswa (role: 'student') untuk manajemen siswa
  unsubscribeAllStudents = onSnapshot(
    query(collection(db, "users"), where("role", "==", "student")),
    (snapshot) => {
      allStudents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (
        currentMainTeacherView === "manajemen-siswa" ||
        currentMainTeacherView === "dashboard"
      ) {
        renderManajemenSiswaView();
        renderDashboardView(allStudents.length); // Perbarui dashboard dengan jumlah siswa
      }
    }
  );

  // Listener untuk riwayat latihan siswa (untuk dashboard)
  const studentHistoryQuery = query(collection(db, "student_exercise_history"));
  unsubscribeStudentExerciseHistory = onSnapshot(
    studentHistoryQuery,
    (snapshot) => {
      studentExerciseHistory = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      studentExerciseHistory.sort((a, b) => {
        const timestampA = a.timestamp
          ? a.timestamp.toDate
            ? a.timestamp.toDate()
            : new Date(a.timestamp)
          : new Date(0);
        const timestampB = b.timestamp
          ? b.timestamp.toDate
            ? b.timestamp.toDate()
            : new Date(b.timestamp)
          : new Date(0);
        return timestampB - timestampA;
      });
      if (currentMainTeacherView === "dashboard") {
        renderDashboardView(allStudents.length); // Render dashboard untuk update aktivitas terbaru
      }
    },
    (error) => {
      console.error("Error fetching student exercise history:", error);
      showMessage("error", "Gagal memuat riwayat latihan siswa.");
    }
  );

  // NEW: Listener untuk semua tugas terjadwal
  const scheduledTasksQuery = query(collection(db, "scheduled_tasks"));
  unsubscribeScheduledTasks = onSnapshot(
    scheduledTasksQuery,
    (snapshot) => {
      allScheduledTasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      allScheduledTasks.sort((a, b) => {
        // Urutkan berdasarkan tanggal dan waktu, yang paling dekat di atas
        const dateA = a.scheduleTime
          ? new Date(`${a.scheduleDate}T${a.scheduleTime}`)
          : new Date(a.scheduleDate);
        const dateB = b.scheduleTime
          ? new Date(`${b.scheduleDate}T${b.scheduleTime}`)
          : new Date(b.scheduleDate);
        return dateB - dateA; // Urutkan menurun (terbaru/terdekat di atas)
      });
      // Jika sedang di tampilan penjadwalan, render ulang
      if (currentMainTeacherView === "penjadwalan") {
        renderJadwalView(
          allScheduledTasks,
          allGeneratedExercises,
          allGeneratedMaterials
        ); // Teruskan data ke fungsi render di jadwal.js
      }
    },
    (error) => {
      console.error("Error fetching scheduled tasks:", error);
      showMessage("error", "Gagal memuat daftar tugas terjadwal.");
    }
  );
}

// --- Fungsi Pengganti Tampilan (Tab) ---
function switchView(viewName) {
  currentMainTeacherView = viewName;

  // Reset daily exercise edit mode when switching views
  showDailyExerciseEditMode = false;
  // Reset materi view state when switching views
  // currentGeneratedLesson = null; // Ini dihandle di materi.js sekarang

  document.querySelectorAll(".tab-content-section").forEach((section) => {
    section.classList.remove("active");
    section.classList.add("hidden");
  });

  sidebarNavItems.forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.view === viewName) {
      item.classList.add("active");
    }
  });
  bottomNavButtons.forEach((button) => {
    button.classList.remove("active");
    if (button.dataset.view === viewName) {
      button.classList.add("active");
    }
  });

  const activeViewElement = document.getElementById(`${viewName}View`);
  if (activeViewElement) {
    activeViewElement.classList.remove("hidden");
    activeViewElement.classList.add("active");
  }

  renderMainContent();
}

// --- Fungsi Utama untuk Merender Konten Aplikasi ---
function renderMainContent() {
  appView.classList.remove("hidden");

  switch (currentMainTeacherView) {
    case "dashboard":
      renderDashboardView(allStudents.length);
      break;
    case "soal":
      renderSoalView();
      break;
    case "materi":
      renderMateriViewContent(); // Panggil fungsi renderMateriView dari materi.js
      break;
    case "manajemen-siswa":
      renderManajemenSiswaView();
      break;
    // NEW: Case untuk tampilan penjadwalan
    case "penjadwalan":
      renderJadwalView(
        allScheduledTasks,
        allGeneratedExercises,
        allGeneratedMaterials
      ); // Teruskan data yang dibutuhkan
      break;
    case "pengaturan":
      renderPengaturanView(teacherData);
      break;
    default:
      renderDashboardView(allStudents.length);
  }
  renderModals(); // Pastikan modal dirender ulang setiap kali konten utama di-render
}

// --- Fungsi-fungsi Rendering UI ---

/**
 * Fungsi untuk merender dan mengisi kartu informasi guru.
 * Dipanggil saat data guru tersedia atau berubah.
 */
function renderTeacherInfoCard() {
  const teacherNameDisplay = document.getElementById("teacherNameDisplay");
  const teacherNipDisplay = document.getElementById("teacherNipDisplay"); // Ini tidak ada di HTML, tapi biarkan saja jika nanti ditambahkan
  const teacherClassesDisplay = document.getElementById(
    "teacherClassesDisplay"
  );

  if (teacherData) {
    if (teacherNameDisplay)
      teacherNameDisplay.innerText = teacherData.name || "N/A";
    if (teacherNipDisplay)
      teacherNipDisplay.innerText = teacherData.nip || "N/A";
    if (teacherClassesDisplay)
      teacherClassesDisplay.innerText =
        teacherData.classesTaught?.join(", ") || "N/A";
  } else {
    // Set placeholders if teacherData is not available
    if (teacherNameDisplay) teacherNameDisplay.innerText = "Memuat...";
    if (teacherNipDisplay) teacherNipDisplay.innerText = "Memuat...";
    if (teacherClassesDisplay) teacherClassesDisplay.innerText = "Memuat...";
  }
}

function renderDashboardView(totalStudentsCount) {
  const dashboardViewElement = document.getElementById("dashboardView");
  if (!dashboardViewElement) return;

  const totalStudentsCountElement =
    document.getElementById("totalStudentsCount");
  if (totalStudentsCountElement) {
    totalStudentsCountElement.innerText = totalStudentsCount;
  }

  // Render recent activities if dashboard is active
  if (currentMainTeacherView === "dashboard") {
    const recentActivities = studentExerciseHistory
      .slice(0, 10)
      .map((history) => {
        const student = allStudents.find((s) => s.id === history.studentId);
        return {
          date: history.exerciseDate,
          studentName: student ? student.name : "Siswa Tidak Dikenal",
          exerciseType: history.exerciseType,
          score: history.score !== undefined ? history.score : "N/A",
          aiSuggestions: history.aiSuggestions || "Tidak ada saran.",
          id: history.id,
        };
      });

    const recentActivitiesTableHtml = `
      <h2 class="card-header">Aktivitas Latihan Terbaru</h2>
      <div id="recentActivitiesTableContainer" class="overflow-x-auto">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Tanggal</th>
                    <th>Siswa</th>
                    <th>Jenis Latihan</th>
                    <th>Nilai</th>
                    <th class="actions-col">Saran AI</th>
                </tr>
            </thead>
            <tbody>
                ${recentActivities
                  .map(
                    (activity) => `
                        <tr>
                            <td>${activity.date}</td>
                            <td>${activity.studentName}</td>
                            <td>${activity.exerciseType}</td>
                            <td>${activity.score}</td>
                            <td class="actions-col">
                                <button class="text-blue-500 hover:text-blue-700 text-sm view-student-history-details-btn" data-history-id="${activity.id}">
                                    <i class="fas fa-eye"></i> Lihat
                                </button>
                            </td>
                        </tr>
                    `
                  )
                  .join("")}
                ${
                  recentActivities.length === 0
                    ? `<tr><td colspan="5" class="text-center text-gray-500">Belum ada riwayat latihan siswa.</td></tr>`
                    : ""
                }
            </tbody>
        </table>
      </div>
    `;
    const recentActivitiesCard = document.getElementById(
      "recentActivitiesCard"
    );
    if (recentActivitiesCard) {
      recentActivitiesCard.innerHTML = recentActivitiesTableHtml;
    }

    document
      .querySelectorAll(".view-student-history-details-btn")
      .forEach((button) => {
        button.addEventListener("click", async (e) => {
          const historyId = e.currentTarget.dataset.historyId;
          showMessage("loading", "Memuat detail riwayat latihan siswa...");
          try {
            const docRef = doc(db, "student_exercise_history", historyId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              currentStudentHistoryDetails = docSnap.data();
              renderModals({
                showStudentHistoryDetailsModal: true,
                currentStudentHistoryDetails: currentStudentHistoryDetails,
                allStudents: allStudents,
              });
              showMessage("success", "Detail riwayat latihan berhasil dimuat.");
            } else {
              showMessage("error", "Riwayat latihan tidak ditemukan.");
            }
          } catch (error) {
            console.error("Error viewing student history details:", error);
            showMessage(
              "error",
              "Gagal memuat detail riwayat latihan: " + error.message
            );
          }
        });
      });
  }
}

function renderSoalView() {
  const soalViewElement = document.getElementById("soalView");
  if (!soalViewElement) return;

  const generateTodayExerciseBtn = document.getElementById(
    "generateTodayExerciseBtn"
  );
  const viewEditDailyExerciseBtn = document.getElementById(
    "viewEditDailyExerciseBtn"
  );
  const dailyExerciseMessage = document.getElementById("dailyExerciseMessage");
  const dailyExerciseEditContent = document.getElementById(
    "dailyExerciseEditContent"
  );

  // Show/hide generate button
  if (generateTodayExerciseBtn) {
    generateTodayExerciseBtn.classList.remove("hidden");
  }

  // Show/hide view/edit button
  if (viewEditDailyExerciseBtn) {
    if (currentDailyExerciseAdmin) {
      // Only show if an exercise exists
      viewEditDailyExerciseBtn.classList.remove("hidden");
    } else {
      viewEditDailyExerciseBtn.classList.add("hidden");
    }
  }

  // Show/hide daily exercise message
  if (dailyExerciseMessage) {
    if (currentDailyExerciseAdmin) {
      dailyExerciseMessage.classList.add("hidden"); // Hide the message if exercise exists
    } else {
      // If no exercise, show the "Belum ada soal..." message
      const todayDate = new Date().toISOString().slice(0, 10);
      const dailyTypeForToday = getDailyExerciseTypeForAI(todayDate);
      const exerciseTypeLabel =
        dailyTypeForToday === "Literasi" ? "Literasi 📖" : "Numerasi ➕➖✖️➗";
      dailyExerciseMessage.innerText = `Belum ada soal latihan ${exerciseTypeLabel} yang digenerate untuk hari ini.`;
      dailyExerciseMessage.classList.remove("hidden");
    }
  }

  // Ensure inline edit content is always hidden unless explicitly shown by modal logic (which it won't be)
  if (dailyExerciseEditContent) {
    dailyExerciseEditContent.innerHTML = ""; // Clear content
    dailyExerciseEditContent.classList.add("hidden");
  }

  // Re-attach listeners for buttons in soal view
  if (generateTodayExerciseBtn) {
    generateTodayExerciseBtn.addEventListener("click", () => {
      const todayDate = new Date().toISOString().slice(0, 10);
      const dailyTypeForToday = getDailyExerciseTypeForAI(todayDate);
      generateAndSaveDailyExercise(todayDate, dailyTypeForToday);
    });
  }

  // Attach listener for the "Lihat/Edit Soal Hari Ini" button to open modal
  if (viewEditDailyExerciseBtn) {
    // Remove existing listener to prevent duplicates
    viewEditDailyExerciseBtn.removeEventListener(
      "click",
      handleViewEditDailyExerciseClick
    );
    viewEditDailyExerciseBtn.addEventListener(
      "click",
      handleViewEditDailyExerciseClick
    );
  }
}

/**
 * Handles the click event for "Lihat/Edit Soal Hari Ini" button, opening a modal.
 */
function handleViewEditDailyExerciseClick() {
  if (currentDailyExerciseAdmin) {
    renderModals({
      showEditExerciseModal: true,
      editingExerciseData: currentDailyExerciseAdmin,
    });
  } else {
    showMessage("info", "Tidak ada soal harian untuk dilihat atau diedit.");
  }
}

/**
 * Renders the Materi view content.
 * This function now assumes the static HTML structure is already in portalguru.html.
 * It only needs to manage the dynamic content within #materialsListContainer
 * and attach listeners to the pre-existing button.
 */
function renderMateriView() {
  const materiViewElement = document.getElementById("materiView");
  if (!materiViewElement) return;

  // Render the list of materials
  renderMateriViewContent(); // This function from materi.js will populate #materialsListContainer

  // Add listener for the "Buat Materi Pembelajaran Baru" button
  document
    .getElementById("showGenerateMaterialModalBtn")
    ?.addEventListener("click", () => {
      // Reset form values when opening the modal
      setFormValues({
        materialSubject: "",
        materialTopic: "",
        selectedLearningModel: "Eksplanasi",
        materialSubTopics: "",
      });
      clearAllInlineErrors(
        document.getElementById("generateMaterialFormModal")
      ); // Clear errors
      renderModals({ showGenerateMaterialModal: true });
    });
}

function renderManajemenSiswaView() {
  const manajemenSiswaViewElement = document.getElementById(
    "manajemen-siswaView"
  );
  if (!manajemenSiswaViewElement) return;

  // Render the actual student table using the function from dashboard.js
  renderStudentTable(allStudents, handleDeleteStudent, handleEditStudent);

  // Re-attach add student button listener
  document.getElementById("addStudentButton")?.addEventListener("click", () => {
    renderModals({ showAddStudentModal: true });
  });
}

function renderPengaturanView(teacherData) {
  const pengaturanViewElement = document.getElementById("pengaturanView");
  if (!pengaturanViewElement) return;

  // Populate profile form fields if teacherData is available
  if (teacherData) {
    const teacherNameInput = document.getElementById("teacherName");
    const teacherEmailInput = document.getElementById("teacherEmail");
    const teacherNipInput = document.getElementById("teacherNip");
    const teacherClassesTaughtInput = document.getElementById(
      "teacherClassesTaught"
    );

    if (teacherNameInput) teacherNameInput.value = teacherData.name || "";
    if (teacherEmailInput) teacherEmailInput.value = teacherData.email || "";
    if (teacherNipInput) teacherNipInput.value = teacherData.nip || "";
    if (teacherClassesTaughtInput)
      teacherClassesTaughtInput.value =
        teacherData.classesTaught?.join(", ") || "";
  } else {
    // Clear fields if no teacherData
    const teacherNameInput = document.getElementById("teacherName");
    const teacherEmailInput = document.getElementById("teacherEmail");
    const teacherNipInput = document.getElementById("teacherNip");
    const teacherClassesTaughtInput = document.getElementById(
      "teacherClassesTaught"
    );

    if (teacherNameInput) teacherNameInput.value = "";
    if (teacherEmailInput) teacherEmailInput.value = "";
    if (teacherNipInput) teacherNipInput.value = "";
    if (teacherClassesTaughtInput) teacherClassesTaughtInput.value = "";
  }

  // Attach listeners from setting.js after rendering
  setupSettingListeners();
}

/**
 * Handles opening the edit student modal.
 * @param {Object} student - The student object to be edited.
 */
function handleEditStudent(student) {
  editingStudent = student;
  renderModals({ showEditStudentModal: true, editingStudent: student });
}

/**
 * Merender modal (add, edit, confirm, details, generate materi, view materi).
 * @param {Object} modalState - Objek yang berisi state modal yang akan diperbarui.
 */
export function renderModals(modalState = {}) {
  // Keep export here
  // Update global modal states based on input
  showAddStudentModal =
    modalState.showAddStudentModal !== undefined
      ? modalState.showAddStudentModal
      : showAddStudentModal;
  showEditStudentModal =
    modalState.showEditStudentModal !== undefined
      ? modalState.showEditStudentModal
      : showEditStudentModal;
  editingStudent =
    modalState.editingStudent !== undefined
      ? modalState.editingStudent
      : editingStudent;
  showConfirmModal =
    modalState.showConfirmModal !== undefined
      ? modalState.showConfirmModal
      : showConfirmModal;
  confirmModalMessage =
    modalState.confirmModalMessage !== undefined
      ? modalState.confirmModalMessage
      : confirmModalMessage;
  confirmModalAction =
    modalState.confirmModalAction !== undefined
      ? modalState.confirmModalAction
      : confirmModalAction;
  onCancelConfirm =
    modalState.onCancel !== undefined ? modalState.onCancel : onCancelConfirm;
  showExerciseDetailsModal =
    modalState.showExerciseDetailsModal !== undefined
      ? modalState.showExerciseDetailsModal
      : showExerciseDetailsModal;
  exerciseDetailsData =
    modalState.exerciseDetailsData !== undefined
      ? modalState.exerciseDetailsData
      : exerciseDetailsData;
  showEditExerciseModal =
    modalState.showEditExerciseModal !== undefined
      ? modalState.showEditExerciseModal
      : showEditExerciseModal;
  editingExerciseData =
    modalState.editingExerciseData !== undefined
      ? modalState.editingExerciseData
      : editingExerciseData;
  showStudentHistoryDetailsModal =
    modalState.showStudentHistoryDetailsModal !== undefined
      ? modalState.showStudentHistoryDetailsModal
      : showStudentHistoryDetailsModal;
  currentStudentHistoryDetails =
    modalState.currentStudentHistoryDetails !== undefined
      ? modalState.currentStudentHistoryDetails
      : currentStudentHistoryDetails;
  let allStudentsForModal = modalState.allStudents || allStudents; // Use global allStudents if not provided

  // NEW MODAL STATES
  showGenerateMaterialModal =
    modalState.showGenerateMaterialModal !== undefined
      ? modalState.showGenerateMaterialModal
      : showGenerateMaterialModal;
  showViewMaterialModal =
    modalState.showViewMaterialModal !== undefined
      ? modalState.showViewMaterialModal
      : showViewMaterialModal;
  viewMaterialData =
    modalState.viewMaterialData !== undefined
      ? modalState.viewMaterialData
      : viewMaterialData;

  let modalHtml = "";

  if (showAddStudentModal) {
    modalHtml += `
        <div id="addStudentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[100] modal-overlay">
            <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
            <h3 class="text-xl font-bold text-cyan-700 mb-4">Tambah Siswa Baru</h3>
            <form id="addStudentForm" class="space-y-4">
                <div>
                <label for="newStudentName" class="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap Siswa</label>
                <input type="text" id="newStudentName" class="w-full p-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500" required />
                <div id="newStudentName-error" class="input-error-message hidden"></div>
                </div>
                <div>
                <label for="newStudentUsername" class="block text-sm font-medium text-gray-700 mb-1">Username (untuk login)</label>
                <input type="text" id="newStudentUsername" class="w-full p-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500" required />
                <div id="newStudentUsername-error" class="input-error-message hidden"></div>
                </div>
                <div>
                <label for="newStudentPassword" class="block text-sm font-medium text-gray-700 mb-1">Password (untuk login)</label>
                <input type="password" id="newStudentPassword" class="w-full p-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500" required />
                <p class="text-xs text-red-500 mt-1">Peringatan: Password akan di-hash sebelum disimpan.</p>
                <div id="newStudentPassword-error" class="input-error-message hidden"></div>
                </div>
                <div>
                <label for="newStudentNisn" class="block text-sm font-medium text-gray-700 mb-1">NISN (Opsional)</label>
                <input type="text" id="newStudentNisn" class="w-full p-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500" placeholder="Contoh: 1234567890" />
                <div id="newStudentNisn-error" class="input-error-message hidden"></div>
                </div>
                <div>
                <label for="newStudentClassId" class="block text-sm font-medium text-gray-700 mb-1">Kelas (Opsional)</label>
                <input type="text" id="newStudentClassId" class="w-full p-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500" />
                <div id="newStudentClassId-error" class="input-error-message hidden"></div>
                </div>
                <div class="flex justify-end space-x-3 mt-4">
                <button type="button" id="cancelAddStudent" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition duration-200">
                    Batal
                </button>
                <button type="submit" class="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition duration-200">
                    Simpan Siswa
                </button>
                </div>
            </form>
            </div>
        </div>
        `;
  }

  if (showEditStudentModal && editingStudent) {
    modalHtml += `
        <div id="editStudentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[100] modal-overlay">
            <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
            <h3 class="text-xl font-bold text-cyan-700 mb-4">Edit Data Siswa</h3>
            <form id="editStudentForm" class="space-y-4">
                <input type="hidden" id="editStudentId" value="${
                  editingStudent.id
                }" />
                <div>
                <label for="editStudentName" class="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap Siswa</label>
                <input type="text" id="editStudentName" class="w-full p-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500" value="${
                  editingStudent.name
                }" required />
                <div id="editStudentName-error" class="input-error-message hidden"></div>
                </div>
                <div>
                <label for="editStudentUsername" class="block text-sm font-medium text-gray-700 mb-1">Username (untuk login)</label>
                <input type="text" id="editStudentUsername" class="w-full p-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500" value="${
                  editingStudent.username || ""
                }" required />
                <div id="editStudentUsername-error" class="input-error-message hidden"></div>
                </div>
                <div>
                <label for="editStudentPassword" class="block text-sm font-medium text-gray-700 mb-1">Password (untuk login)</label>
                <input type="password" id="editStudentPassword" class="w-full p-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500" />
                <p class="text-xs text-gray-500 mt-1">Biarkan kosong jika tidak ingin mengubah password.</p>
                <div id="editStudentPassword-error" class="input-error-message hidden"></div>
                </div>
                <div>
                <label for="editStudentNisn" class="block text-sm font-medium text-gray-700 mb-1">NISN (Opsional)</label>
                <input type="text" id="editStudentNisn" class="w-full p-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500" value="${
                  editingStudent.studentId || ""
                }" />
                <div id="editStudentNisn-error" class="input-error-message hidden"></div>
                </div>
                <div>
                <label for="editStudentClassId" class="block text-sm font-medium text-gray-700 mb-1">Kelas (Opsional)</label>
                <input type="text" id="editStudentClassId" class="w-full p-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500" value="${
                  editingStudent.classId || ""
                }" />
                <div id="editStudentClassId-error" class="input-error-message hidden"></div>
                </div>
                <div class="flex justify-end space-x-3 mt-4">
                <button type="button" id="cancelEditStudent" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition duration-200">
                    Batal
                </button>
                <button type="submit" class="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition duration-200">
                    Simpan Perubahan
                </button>
                </div>
            </form>
            </div>
        </div>
        `;
  }

  if (showConfirmModal) {
    modalHtml += `
        <div id="confirmModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[100] modal-overlay">
            <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm text-center">
            <h3 class="text-xl font-bold text-red-700 mb-4">Konfirmasi Aksi</h3>
            <p class="text-gray-700 mb-6">${confirmModalMessage}</p>
            <div class="flex justify-center space-x-4">
                <button type="button" id="cancelConfirm" class="px-6 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition duration-200">
                Batal
                </button>
                <button type="button" id="executeConfirm" class="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition duration-200">
                Lanjutkan
                </button>
            </div>
            </div>
        </div>
        `;
  }

  if (showExerciseDetailsModal && exerciseDetailsData) {
    modalHtml += `
        <div id="exerciseDetailsModal" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[1000] modal-overlay">
            <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-cyan-700">Detail Soal Latihan (${
                      exerciseDetailsData.type
                    })</h3>
                    <button id="closeExerciseDetailsModal" class="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
                </div>
                <p class="text-gray-600 mb-4">Tanggal: ${
                  exerciseDetailsData.date
                } | Digenerate oleh: ${
      exerciseDetailsData.generatedByName || "N/A"
    }</p>
                ${
                  exerciseDetailsData.readingText
                    ? `<div class="ai-reading-text">
                        <h4 class="font-semibold text-cyan-700 mb-2">Bacaan:</h4>
                        <p>${exerciseDetailsData.readingText.replace(
                          /\n/g,
                          "<br>"
                        )}</p>
                    </div>`
                    : ""
                }
                <div>
                    <h4 class="font-semibold text-cyan-700 mb-2">Pertanyaan:</h4>
                    ${exerciseDetailsData.questions
                      .map(
                        (q, index) => `
                        <div class="ai-question-item">
                            <p><strong>Soal ${index + 1}:</strong> ${
                          q.question
                        } <small>${
                          q.minWords ? `(Min. ${q.minWords} kata)` : ""
                        }</small></p>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        </div>
        `;
  }

  if (showEditExerciseModal && editingExerciseData) {
    modalHtml += `
        <div id="editExerciseModal" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[1000] modal-overlay">
            <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-cyan-700">Edit Soal Latihan (${
                      editingExerciseData.type
                    }) - ${editingExerciseData.date}</h3>
                    <button id="closeEditExerciseModal" class="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
                </div>
                <form id="editExerciseForm" class="space-y-4">
                    <input type="hidden" id="editExerciseId" value="${
                      editingExerciseData.id
                    }" />
                    ${
                      editingExerciseData.type === "Literasi"
                        ? `
                        <div>
                            <label for="editReadingText" class="block text-sm font-medium text-gray-700 mb-1">Bacaan:</label>
                            <textarea id="editReadingText" class="w-full p-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500" rows="6">${
                              editingExerciseData.readingText || ""
                            }</textarea>
                            <div id="editReadingText-error" class="input-error-message hidden"></div>
                        </div>
                    `
                        : ""
                    }
                    <div id="editQuestionsContainer">
                        <h4 class="font-semibold text-gray-700 mb-2">Pertanyaan:</h4>
                        ${editingExerciseData.questions
                          .map(
                            (q, index) => `
                            <div class="form-group border p-3 rounded-md mb-3 bg-gray-50">
                                <label for="editQuestion${index}" class="block text-sm font-medium text-gray-700 mb-1">Soal ${
                              index + 1
                            }:</label>
                                <textarea id="editQuestion${index}" class="w-full p-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500" rows="3" data-question-index="${index}">${
                              q.question
                            }</textarea>
                                <div id="editQuestion${index}-error" class="input-error-message hidden"></div>
                                ${
                                  q.minWords
                                    ? `
                                    <label for="editMinWords${index}" class="block text-sm font-medium text-gray-700 mt-2 mb-1">Minimal Kata Jawaban:</label>
                                    <input type="number" id="editMinWords${index}" class="w-full p-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500" value="${q.minWords}" data-question-index="${index}" />
                                    <div id="editMinWords${index}-error" class="input-error-message hidden"></div>
                                `
                                    : ""
                                }
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                    <div class="flex justify-end space-x-3 mt-4">
                        <button type="button" id="cancelEditExercise" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition duration-200">
                            Batal
                        </button>
                        <button type="submit" class="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition duration-300">
                            Simpan Perubahan
                        </button>
                    </div>
                </form>
            </div>
        </div>
        `;
  }

  if (showStudentHistoryDetailsModal && currentStudentHistoryDetails) {
    modalHtml += `
        <div id="studentHistoryDetailsModal" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[1000] modal-overlay">
            <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-cyan-700">Detail Riwayat Latihan Siswa</h3>
                    <button id="closeStudentHistoryDetailsModal" class="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
                </div>
                <p class="text-gray-600 mb-4">Siswa: <strong>${
                  allStudentsForModal.find(
                    (s) => s.id === currentStudentHistoryDetails.studentId
                  )?.name || "Siswa Tidak Dikenal"
                }</strong> | Tanggal: ${
      currentStudentHistoryDetails.exerciseDate
    } | Jenis: ${currentStudentHistoryDetails.exerciseType} | Nilai: <strong>${
      currentStudentHistoryDetails.score || "N/A"
    }</strong></p>
                <div class="mb-4">
                    <h4 class="font-semibold text-cyan-700 mb-2">Jawaban Siswa:</h4>
                    ${currentStudentHistoryDetails.answers
                      .map(
                        (ans, index) => `
                        <div class="ai-question-item">
                            <p><strong>Soal ${index + 1}:</strong> ${
                          ans.question
                        }</p>
                            <p class="text-gray-700">Jawaban: ${ans.answer}</p>
                        </div>
                    `
                      )
                      .join("")}
                </div>
                <div class="ai-suggestion-box">
                    <h4 class="font-bold text-cyan-800">Saran AI:</h4>
                    <p>${
                      currentStudentHistoryDetails.aiSuggestions
                        ? currentStudentHistoryDetails.aiSuggestions.replace(
                            /\n/g,
                            "<br>"
                          )
                        : "Tidak ada saran yang tersedia."
                    }</p>
                </div>
            </div>
        </div>
        `;
  }

  // NEW MODAL: Generate Material Form
  if (showGenerateMaterialModal) {
    modalHtml += `
      <div id="generateMaterialModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[100] modal-overlay">
          <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <h3 class="text-xl font-bold text-blue-700 mb-4">Buat Materi Pembelajaran Baru</h3>
          <form id="generateMaterialFormModal" class="space-y-4">
              <div>
              <label for="materialSubjectModal" class="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran:</label>
              <input type="text" id="materialSubjectModal" class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Contoh: IPAS" />
              <div id="materialSubjectModal-error" class="input-error-message hidden"></div>
              </div>
              <div>
              <label for="materialTopicModal" class="block text-sm font-medium text-gray-700 mb-1">Topik:</label>
              <input type="text" id="materialTopicModal" class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Contoh: Siklus Air" />
              <div id="materialTopicModal-error" class="input-error-message hidden"></div>
              </div>
              <div>
              <label for="learningModelSelectModal" class="block text-sm font-medium text-gray-700 mb-1">Pilih Model Pembelajaran:</label>
              <select id="learningModelSelectModal" class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  ${learningModels
                    .map(
                      (model) =>
                        `<option value="${model.value}">${model.label}</option>`
                    )
                    .join("")}
              </select>
              <div id="learningModelSelectModal-error" class="input-error-message hidden"></div>
              </div>
              <div>
              <label for="materialSubTopicsModal" class="block text-sm font-medium text-gray-700 mb-1">Fokus Pembahasan (Sub-topik):</label>
              <textarea id="materialSubTopicsModal" class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" rows="5" placeholder="Masukkan sub-topik secara manual, atau klik 'Generate Sub-topik' untuk saran AI."></textarea>
              <div id="materialSubTopicsModal-error" class="input-error-message hidden"></div>
              ${
                subTopicSuggestionError
                  ? `<p class="text-red-500 text-xs mt-1">${subTopicSuggestionError}</p>`
                  : ""
              }
              </div>
              <button type="button" id="generateSubTopicsBtnModal" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-xl shadow-md transition duration-300 ease-in-out">
                ${
                  loadingSubTopicSuggestions
                    ? "Membuat Saran..."
                    : "Generate Sub-topik"
                }
              </button>
              <div class="flex justify-end space-x-3 mt-4">
                <button type="button" id="cancelGenerateMaterialModal" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition duration-200">
                    Batal
                </button>
                <button type="submit" id="generateMaterialBtnModal" class="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition duration-200">
                    ${
                      loadingMaterialGeneration
                        ? "Membuat Materi..."
                        : "Buat Materi!"
                    }
                </button>
              </div>
              ${
                materialGenerationError
                  ? `<p class="text-red-500 text-xs mt-1">${materialGenerationError}</p>`
                  : ""
              }
          </form>
          </div>
      </div>
    `;
  }

  // NEW MODAL: View Material Details
  if (showViewMaterialModal && viewMaterialData) {
    modalHtml += `
      <div id="viewMaterialDetailsModal" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[1000] modal-overlay">
          <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div class="flex justify-between items-center mb-4">
                  <h3 class="text-xl font-bold text-blue-700">Detail Materi: ${viewMaterialData.title}</h3>
                  <button id="closeViewMaterialDetailsModal" class="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
              </div>
              <div id="materialContentDisplayInModal">
                  <!-- Detailed lesson content will be rendered here by renderLessonContentDisplay -->
              </div>
          </div>
      </div>
    `;
  }

  modalContainer.innerHTML = modalHtml;

  // Attach event listeners for dynamically rendered modals
  if (showAddStudentModal) {
    document
      .getElementById("cancelAddStudent")
      ?.addEventListener("click", () =>
        renderModals({ showAddStudentModal: false })
      );
    document
      .getElementById("addStudentForm")
      ?.addEventListener("submit", handleAddStudent); // Changed to handleAddStudent
  }

  if (showEditStudentModal && editingStudent) {
    document
      .getElementById("cancelEditStudent")
      ?.addEventListener("click", () =>
        renderModals({ showEditStudentModal: false, editingStudent: null })
      );
    document
      .getElementById("editStudentForm")
      ?.addEventListener("submit", handleEditStudentSubmit); // Changed to handleEditStudentSubmit
  }

  if (showConfirmModal) {
    document.getElementById("cancelConfirm")?.addEventListener("click", () => {
      renderModals({ showConfirmModal: false });
      if (onCancelConfirm) onCancelConfirm(); // Call the onCancel callback
    });
    document.getElementById("executeConfirm")?.addEventListener("click", () => {
      if (confirmModalAction) confirmModalAction();
      renderModals({ showConfirmModal: false });
    });
  }

  if (showExerciseDetailsModal && exerciseDetailsData) {
    document
      .getElementById("closeExerciseDetailsModal")
      ?.addEventListener("click", () =>
        renderModals({
          showExerciseDetailsModal: false,
          exerciseDetailsData: null,
        })
      );
  }

  if (showEditExerciseModal && editingExerciseData) {
    document
      .getElementById("closeEditExerciseModal")
      ?.addEventListener("click", () =>
        renderModals({
          showEditExerciseModal: false,
          editingExerciseData: null,
        })
      );
    document
      .getElementById("cancelEditExercise")
      ?.addEventListener("click", () =>
        renderModals({
          showEditExerciseModal: false,
          editingExerciseData: null,
        })
      );
    document
      .getElementById("editExerciseForm")
      ?.addEventListener("submit", handleUpdateExerciseSubmit);
  }

  if (showStudentHistoryDetailsModal && currentStudentHistoryDetails) {
    document
      .getElementById("closeStudentHistoryDetailsModal")
      ?.addEventListener("click", () =>
        renderModals({
          showStudentHistoryDetailsModal: false,
          currentStudentHistoryDetails: null,
        })
      );
  }

  // NEW MODAL LISTENERS: Generate Material Form
  if (showGenerateMaterialModal) {
    setupMateriFormListenersModal(); // Setup listeners for elements INSIDE the modal
  }

  // NEW MODAL LISTENERS: View Material Details
  if (showViewMaterialModal && viewMaterialData) {
    const materialContentDisplayInModal = document.getElementById(
      "materialContentDisplayInModal"
    );
    if (materialContentDisplayInModal) {
      renderLessonContentDisplay(
        // Call the imported function directly
        viewMaterialData.lessonData,
        viewMaterialData.learningModel,
        materialContentDisplayInModal
      );
    }
    document
      .getElementById("closeViewMaterialDetailsModal")
      ?.addEventListener("click", () => {
        renderModals({ showViewMaterialModal: false, viewMaterialData: null });
      });
  }
}

// Global function to show confirmation modal, callable from other modules
export function showConfirmationModal(message, action, onCancel = null) {
  renderModals({
    showConfirmModal: true,
    confirmModalMessage: message,
    confirmModalAction: action,
    onCancel: onCancel,
  });
}

// --- Student Management Functions ---

/**
 * Handles adding a new student to Firestore.
 * @param {Event}
 * e - The form submission event.
 */
async function handleAddStudent(e) {
  // Renamed from handleAddStudentSubmit
  e.preventDefault();
  clearAllInlineErrors(e.target); // Clear all previous errors

  const name = document.getElementById("newStudentName").value.trim();
  const username = document.getElementById("newStudentUsername").value.trim();
  const password = document.getElementById("newStudentPassword").value.trim();
  const nisn = document.getElementById("newStudentNisn").value.trim();
  const classId = document.getElementById("newStudentClassId").value.trim();

  let isValid = true;

  if (!name) {
    displayInlineError("newStudentName", "Nama harus diisi.");
    isValid = false;
  }
  if (!username) {
    displayInlineError("newStudentUsername", "Username harus diisi.");
    isValid = false;
  }
  if (!password) {
    displayInlineError("newStudentPassword", "Password harus diisi.");
    isValid = false;
  } else if (password.length < 6) {
    displayInlineError("newStudentPassword", "Password minimal 6 karakter.");
    isValid = false;
  }

  if (!isValid) {
    showMessage("error", "Mohon perbaiki kesalahan pada formulir.");
    return;
  }

  showMessage("loading", "Menambahkan siswa baru...");

  try {
    // Check if username already exists
    const usernameQuery = query(
      collection(db, "users"),
      where("username", "==", username)
    );
    const usernameSnapshot = await getDocs(usernameQuery);
    if (!usernameSnapshot.empty) {
      displayInlineError(
        "newStudentUsername",
        `Username '${username}' sudah digunakan. Mohon gunakan username lain.`
      );
      showMessage(
        "error",
        `Username '${username}' sudah digunakan. Mohon gunakan username lain.`
      );
      return;
    }

    const hashedPassword = await hashString(password);

    const newStudentData = {
      name: name,
      username: username,
      passwordHash: hashedPassword, // Store hashed password
      role: "student",
      studentId: nisn, // NISN
      classId: classId,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser.uid,
    };

    await setDoc(doc(collection(db, "users")), newStudentData);

    showMessage("success", "Siswa baru berhasil ditambahkan!");
    renderModals({ showAddStudentModal: false }); // Close modal
    // Student list will auto-update via onSnapshot listener
  } catch (error) {
    console.error("Error adding student:", error);
    showMessage("error", `Gagal menambahkan siswa: ${error.message}`);
  }
}

/**
 * Handles updating an existing student's data in Firestore.
 * @param {Event} e - The form submission event.
 */
async function handleEditStudentSubmit(e) {
  // Renamed from handleUpdateStudentSubmit
  e.preventDefault();
  clearAllInlineErrors(e.target); // Clear all previous errors

  const studentId = document.getElementById("editStudentId").value;
  const name = document.getElementById("editStudentName").value.trim();
  const username = document.getElementById("editStudentUsername").value.trim();
  const password = document.getElementById("editStudentPassword").value.trim(); // New password, if any
  const nisn = document.getElementById("editStudentNisn").value.trim();
  const classId = document.getElementById("editStudentClassId").value.trim();

  let isValid = true;

  if (!name) {
    displayInlineError("editStudentName", "Nama harus diisi.");
    isValid = false;
  }
  if (!username) {
    displayInlineError("editStudentUsername", "Username harus diisi.");
    isValid = false;
  }
  if (password && password.length < 6) {
    displayInlineError("editStudentPassword", "Password minimal 6 karakter.");
    isValid = false;
  }

  if (!isValid) {
    showMessage("error", "Mohon perbaiki kesalahan pada formulir.");
    return;
  }

  showMessage("loading", "Memperbarui data siswa...");

  try {
    const studentDocRef = doc(db, "users", studentId);
    const updatedData = {
      name: name,
      username: username,
      studentId: nisn,
      classId: classId,
    };

    // Only update password if a new one is provided
    if (password) {
      updatedData.passwordHash = await hashString(password);
    }

    // Check if username already exists for another student
    const usernameQuery = query(
      collection(db, "users"),
      where("username", "==", username)
    );
    const usernameSnapshot = await getDocs(usernameQuery);
    let usernameConflict = false;
    usernameSnapshot.forEach((doc) => {
      if (doc.id !== studentId) {
        // If it's a different student
        usernameConflict = true;
      }
    });

    if (usernameConflict) {
      displayInlineError(
        "editStudentUsername",
        `Username '${username}' sudah digunakan oleh siswa lain. Mohon gunakan username lain.`
      );
      showMessage(
        "error",
        `Username '${username}' sudah digunakan oleh siswa lain. Mohon gunakan username lain.`
      );
      return;
    }

    await updateDoc(studentDocRef, updatedData);

    showMessage("success", "Data siswa berhasil diperbarui!");
    renderModals({ showEditStudentModal: false, editingStudent: null }); // Close modal
    // Student list will auto-update via onSnapshot listener
  } catch (error) {
    console.error("Error updating student:", error);
    showMessage("error", `Gagal memperbarui siswa: ${error.message}`);
  }
}

/**
 * Handles deleting a student and their history.
 * This function is triggered by the confirmation modal.
 * @param {string} studentId - The ID of the student to delete.
 */
async function handleDeleteStudent(studentId) {
  showMessage("loading", "Menghapus siswa dan riwayat latihannya...");
  try {
    // Delete all associated exercise history
    const historyToDeleteQuery = query(
      collection(db, "student_exercise_history"),
      where("studentId", "==", studentId)
    );
    const historySnapshot = await getDocs(historyToDeleteQuery);
    const deleteHistoryPromises = historySnapshot.docs.map((docToDelete) =>
      deleteDoc(doc(db, "student_exercise_history", docToDelete.id))
    );
    await Promise.all(deleteHistoryPromises);

    // Delete the student document
    await deleteDoc(doc(db, "users", studentId));

    showMessage(
      "success",
      "Siswa dan semua riwayat latihannya berhasil dihapus!"
    );
    // Student list will auto-update via onSnapshot listener
  } catch (error) {
    console.error("Error deleting student:", error);
    showMessage("error", `Gagal menghapus siswa: ${error.message}`);
  } finally {
    renderModals({ showConfirmModal: false });
  }
}

/**
 * Handles updating an existing exercise's data in Firestore.
 * This function is now primarily for old exercises if a modal is used.
 * For daily exercise, use saveInlineExerciseChanges.
 * @param {Event} e - The form submission event.
 */
async function handleUpdateExerciseSubmit(e) {
  e.preventDefault();
  // Clear all inline errors for the form
  clearAllInlineErrors(e.target);

  const exerciseId = editingExerciseData.id;
  const exerciseType = editingExerciseData.type; // Assuming editingExerciseData is available from modal state

  let updatedReadingText = "";
  const updatedQuestions = [];

  let isValid = true;

  if (exerciseType === "Literasi") {
    updatedReadingText = document
      .getElementById("editReadingText")
      .value.trim();
    if (!updatedReadingText) {
      displayInlineError("editReadingText", "Bacaan tidak boleh kosong.");
      isValid = false;
    }

    for (let i = 0; i < 3; i++) {
      // Assuming 3 questions for Literasi
      const questionText = document
        .getElementById(`editQuestion${i}`)
        .value.trim();
      const minWordsInput = document.getElementById(`editMinWords${i}`);
      const minWords = parseInt(
        minWordsInput ? minWordsInput.value.trim() : "10"
      ); // Default to 10 if input not found or invalid

      if (!questionText) {
        displayInlineError(
          `editQuestion${i}`,
          "Pertanyaan tidak boleh kosong."
        );
        isValid = false;
      }
      if (minWordsInput && (isNaN(minWords) || minWords <= 0)) {
        displayInlineError(
          `editMinWords${i}`,
          "Minimal kata harus angka positif."
        );
        isValid = false;
      }
      updatedQuestions.push({
        question: questionText,
        minWords: isNaN(minWords) || minWords <= 0 ? 10 : minWords,
      });
    }
  } else {
    // Numerasi
    for (let i = 0; i < 5; i++) {
      // Assuming 5 questions for Numerasi
      const questionText = document
        .getElementById(`editQuestion${i}`)
        .value.trim();
      if (!questionText) {
        displayInlineError(
          `editQuestion${i}`,
          "Pertanyaan tidak boleh kosong."
        );
        isValid = false;
      }
      updatedQuestions.push({ question: questionText });
    }
  }

  if (!isValid) {
    showMessage("error", "Mohon perbaiki kesalahan pada formulir.");
    return;
  }

  showMessage("loading", "Memperbarui soal latihan...");

  try {
    const exerciseDocRef = doc(db, "daily_ai_exercises", exerciseId);
    const updatedData = {
      readingText: updatedReadingText,
      questions: updatedQuestions,
      lastEditedAt: serverTimestamp(),
      lastEditedBy: teacherData?.uid || "unknown",
      lastEditedByName: teacherData?.name || "Unknown Teacher",
    };

    await updateDoc(exerciseDocRef, updatedData);

    showMessage("success", "Soal latihan berhasil diperbarui!");
    renderModals({ showEditExerciseModal: false, editingExerciseData: null }); // Close modal
  } catch (error) {
    console.error("Error updating exercise:", error);
    showMessage("error", `Gagal memperbarui soal latihan: ${error.message}`);
  }
}

/**
 * Handles deleting an exercise.
 * @param {string} exerciseId - The ID of the exercise to delete.
 */
async function handleDeleteExercise(exerciseId) {
  showMessage("loading", "Menghapus soal latihan...");
  try {
    await deleteDoc(doc(db, "daily_ai_exercises", exerciseId));
    showMessage("success", "Soal latihan berhasil dihapus!");
    showDailyExerciseEditMode = false; // Ensure view resets after deletion
    renderSoalView();
  } catch (error) {
    console.error("Error deleting exercise:", error);
    showMessage("error", `Gagal menghapus soal latihan: ${error.message}`);
  } finally {
    renderModals({ showConfirmModal: false });
  }
}

// Inisialisasi aplikasi ketika DOM sudah sepenuhnya dimuat
document.addEventListener("DOMContentLoaded", initializeApp);

// Ekspor variabel dan fungsi yang mungkin dibutuhkan oleh modul lain (misalnya dashboard.js)
export {
  teacherData,
  currentMainTeacherView,
  allStudents,
  currentDailyExerciseAdmin,
  studentExerciseHistory,
  switchView,
  showMessage,
  renderMainContent,
  renderDashboardView,
  renderSoalView,
  renderManajemenSiswaView,
  renderPengaturanView,
  handleAddStudent, // Export for use in modal
  handleEditStudent, // Export for use in modal
  handleDeleteExercise,
  allGeneratedExercises, // NEW: Ekspor ini agar jadwal.js bisa mengaksesnya
  allGeneratedMaterials, // NEW: Ekspor ini agar jadwal.js bisa mengaksesnya
  allScheduledTasks, // NEW: Ekspor ini agar jadwal.js bisa mengaksesnya
};
