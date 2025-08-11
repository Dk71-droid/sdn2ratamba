// js/app_siswa.js

// Import modul-modul yang dibutuhkan
import {
  db,
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  updateDoc,
  serverTimestamp,
} from "./firebase.js";
import { showMessage, hashString, clearAllInlineErrors } from "./utils.js";
import { renderSoalHarianView } from "./soal_siswa.js";
import { renderMateriView, renderMaterialDetail } from "./materi_siswa.js";
import { renderJadwalTugasView } from "./jadwal_siswa.js";
import { renderDashboardView } from "./dashboard_siswa.js"; // NEW: Import fungsi dashboard

// --- Global State Variables ---
let studentData = null;
let currentMainStudentView = "dashboard";
let studentExerciseHistory = [];
let allMaterials = [];
let allScheduledTasks = [];
let dailyExerciseForStudent = null; // Soal harian yang relevan untuk siswa
let motivationMessage = "Belajar adalah investasi terbaik untuk masa depanmu."; // Default motivation message

// --- DOM Elements ---
const logoutButtonDesktop = document.getElementById("logoutButtonDesktop");
const sidebarNavItems = document.querySelectorAll(".sidebar-nav-item");
const bottomNavButtons = document.querySelectorAll(".bottom-nav button");
const appView = document.getElementById("appView");

// Global Message Component (from utils.js) - Anda mungkin ingin memindahkannya ke file utils
const globalMessage = document.getElementById("globalMessage");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");
const messageCloseBtn = document.getElementById("messageCloseBtn");

// --- Fungsi Inisialisasi Aplikasi ---
async function initializeApp() {
  showMessage("loading", "Memuat data siswa...");
  const studentIdFromLocalStorage = localStorage.getItem("currentStudentId");

  if (!studentIdFromLocalStorage) {
    console.log("No student ID found in localStorage. Redirecting to login.");
    window.location.href = "login.html";
    return;
  }

  try {
    const userDocRef = doc(db, "users", studentIdFromLocalStorage);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      if (userData.role === "student") {
        studentData = userData;
        studentData.uid = studentIdFromLocalStorage;
        appView.classList.remove("hidden");

        setupFirestoreListeners(studentData.uid, studentData.classId);
        renderMainContent();
        showMessage("success", `Selamat datang, ${studentData.name}!`);
      } else {
        console.warn(
          "User ID in localStorage is not a student. Clearing localStorage and redirecting."
        );
        localStorage.removeItem("currentStudentId");
        showMessage("error", "Akses ditolak. Silakan login sebagai siswa.");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
      }
    } else {
      console.warn(
        "User data not found for ID in localStorage. Clearing localStorage and redirecting."
      );
      localStorage.removeItem("currentStudentId");
      showMessage("error", "Data pengguna tidak ditemukan.");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    }
  } catch (error) {
    console.error("Error during student data fetching:", error);
    showMessage(
      "error",
      `Terjadi kesalahan saat memuat data pengguna: ${error.message}`
    );
    localStorage.removeItem("currentStudentId");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
  }

  // Setup navigation listeners
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

  // Setup logout listener
  if (logoutButtonDesktop) {
    logoutButtonDesktop.addEventListener("click", handleLogout);
  }
}

// --- Firestore Listeners ---
let unsubscribeStudentProfile;
let unsubscribeStudentExerciseHistory;
let unsubscribeAllMaterials;
let unsubscribeScheduledTasks;
let unsubscribeDailyExercise;
let unsubscribeMotivationMessage;

function setupFirestoreListeners(studentUid, studentClassId) {
  if (unsubscribeStudentProfile) unsubscribeStudentProfile();
  if (unsubscribeStudentExerciseHistory) unsubscribeStudentExerciseHistory();
  if (unsubscribeAllMaterials) unsubscribeAllMaterials();
  if (unsubscribeScheduledTasks) unsubscribeScheduledTasks();
  if (unsubscribeDailyExercise) unsubscribeDailyExercise();
  if (unsubscribeMotivationMessage) unsubscribeMotivationMessage();

  // Listener for student profile data
  const studentDocRef = doc(db, "users", studentUid);
  unsubscribeStudentProfile = onSnapshot(
    studentDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        studentData = { ...docSnap.data(), uid: docSnap.id };
        if (currentMainStudentView === "pengaturan") {
          renderPengaturanView(studentData);
        }
        if (currentMainStudentView === "dashboard") {
          renderDashboardView(
            studentData,
            studentExerciseHistory,
            dailyExerciseForStudent,
            motivationMessage
          );
        }
      } else {
        console.log("No student data found for current user!");
        studentData = null;
        handleLogout();
      }
    },
    (error) => {
      console.error("Error fetching student data:", error);
      showMessage("error", "Gagal memuat data profil siswa.");
    }
  );

  // Listener for student's exercise history
  const historyQuery = query(
    collection(db, "student_exercise_history"),
    where("studentId", "==", studentUid)
  );
  unsubscribeStudentExerciseHistory = onSnapshot(
    historyQuery,
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
      if (currentMainStudentView === "dashboard") {
        renderDashboardView(
          studentData,
          studentExerciseHistory,
          dailyExerciseForStudent,
          motivationMessage
        );
      }
    },
    (error) => {
      console.error("Error fetching student exercise history:", error);
      showMessage("error", "Gagal memuat riwayat latihan Anda.");
    }
  );

  // Listener for all materials
  unsubscribeAllMaterials = onSnapshot(
    collection(db, "materials"),
    (snapshot) => {
      allMaterials = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (currentMainStudentView === "materi") {
        renderMateriView(allMaterials);
      }
    },
    (error) => {
      console.error("Error fetching materials:", error);
      showMessage("error", "Gagal memuat daftar materi.");
    }
  );

  // Listener for scheduled tasks
  const todayDate = new Date().toISOString().slice(0, 10);
  const scheduledTasksQuery = query(
    collection(db, "scheduled_tasks"),
    where("scheduleDate", ">=", todayDate)
  );
  unsubscribeScheduledTasks = onSnapshot(
    scheduledTasksQuery,
    async (snapshot) => {
      allScheduledTasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      allScheduledTasks.sort((a, b) => {
        const dateA = a.scheduleTime
          ? new Date(`${a.scheduleDate}T${a.scheduleTime}`)
          : new Date(a.scheduleDate);
        const dateB = b.scheduleTime
          ? new Date(`${b.scheduleDate}T${b.scheduleTime}`)
          : new Date(b.scheduleDate);
        return dateA - dateB;
      });

      const today = new Date().toISOString().slice(0, 10);
      const todaysTask = allScheduledTasks.find(
        (task) => task.scheduleDate === today
      );

      if (todaysTask) {
        if (todaysTask.contentType === "soal") {
          const exerciseDoc = await getDoc(
            doc(db, "daily_ai_exercises", todaysTask.contentId)
          );
          if (exerciseDoc.exists()) {
            dailyExerciseForStudent = {
              id: exerciseDoc.id,
              ...exerciseDoc.data(),
            };
          } else {
            dailyExerciseForStudent = null;
          }
        } else if (todaysTask.contentType === "materi") {
          const materialDoc = await getDoc(
            doc(db, "materials", todaysTask.contentId)
          );
          if (materialDoc.exists()) {
            dailyExerciseForStudent = {
              id: materialDoc.id,
              ...materialDoc.data(),
              isMaterial: true,
            };
          } else {
            dailyExerciseForStudent = null;
          }
        }
      } else {
        dailyExerciseForStudent = null;
      }

      if (currentMainStudentView === "dashboard") {
        renderDashboardView(
          studentData,
          studentExerciseHistory,
          dailyExerciseForStudent,
          motivationMessage
        );
      }
      if (currentMainStudentView === "jadwal-tugas") {
        renderJadwalTugasView(allScheduledTasks, allMaterials, []);
      }
      if (currentMainStudentView === "soal-harian") {
        if (dailyExerciseForStudent) {
          renderSoalHarianView(dailyExerciseForStudent, studentData.uid);
        } else {
          renderSoalHarianView(null, studentData.uid);
        }
      }
    },
    (error) => {
      console.error("Error fetching scheduled tasks:", error);
      showMessage("error", "Gagal memuat jadwal tugas.");
    }
  );

  // Listener for student's motivation message
  const motivationDocRef = doc(db, "student_motivation_messages", studentUid);
  unsubscribeMotivationMessage = onSnapshot(
    motivationDocRef,
    (docSnap) => {
      if (docSnap.exists() && docSnap.data().message) {
        motivationMessage = docSnap.data().message;
      } else {
        motivationMessage =
          "Belajar adalah investasi terbaik untuk masa depanmu.";
      }
      if (currentMainStudentView === "dashboard") {
        renderDashboardView(
          studentData,
          studentExerciseHistory,
          dailyExerciseForStudent,
          motivationMessage
        );
      }
    },
    (error) => {
      console.error("Error fetching motivation message:", error);
      motivationMessage =
        "Belajar adalah investasi terbaik untuk masa depanmu.";
      if (currentMainStudentView === "dashboard") {
        renderDashboardView(
          studentData,
          studentExerciseHistory,
          dailyExerciseForStudent,
          motivationMessage
        );
      }
    }
  );
}

// --- Fungsi Pengganti Tampilan (Tab) ---
function switchView(viewName) {
  currentMainStudentView = viewName;

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

  switch (currentMainStudentView) {
    case "dashboard":
      renderDashboardView(
        studentData,
        studentExerciseHistory,
        dailyExerciseForStudent,
        motivationMessage
      );
      break;
    case "soal-harian":
      if (dailyExerciseForStudent !== null) {
        renderSoalHarianView(dailyExerciseForStudent, studentData.uid);
      } else {
        showMessage("info", "Memuat soal harian...");
      }
      break;
    case "materi":
      renderMateriView(allMaterials);
      break;
    case "jadwal-tugas":
      renderJadwalTugasView(allScheduledTasks, allMaterials, []);
      break;
    case "pengaturan":
      renderPengaturanView(studentData);
      break;
    default:
      renderDashboardView(
        studentData,
        studentExerciseHistory,
        dailyExerciseForStudent,
        motivationMessage
      );
  }
}

// --- Fungsi-fungsi Rendering UI ---

function renderPengaturanView(studentData) {
  const pengaturanViewElement = document.getElementById("pengaturanView");
  if (!pengaturanViewElement) return;

  if (studentData) {
    document.getElementById("studentName").value = studentData.name || "";
    document.getElementById("studentUsername").value =
      studentData.username || "";
    document.getElementById("studentClass").value = studentData.classId || "";
  }

  const passwordChangeForm = document.getElementById("passwordChangeForm");
  if (passwordChangeForm) {
    passwordChangeForm.removeEventListener("submit", handleChangePassword);
    passwordChangeForm.addEventListener("submit", handleChangePassword);
  }
}

async function handleLogout() {
  showMessage("info", "Sedang logout...");
  try {
    localStorage.removeItem("currentStudentId");
    showMessage("success", "Berhasil logout.");
    window.location.href = "login.html";
  } catch (error) {
    console.error("Logout error:", error);
    showMessage("error", "Gagal logout: " + error.message);
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  clearAllInlineErrors(e.target);

  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmNewPassword = document
    .getElementById("confirmNewPassword")
    .value.trim();

  let isValid = true;
  if (!newPassword || newPassword.length < 6) {
    displayInlineError("newPassword", "Password minimal 6 karakter.");
    isValid = false;
  }
  if (newPassword !== confirmNewPassword) {
    displayInlineError(
      "confirmNewPassword",
      "Konfirmasi password tidak cocok."
    );
    isValid = false;
  }

  if (!isValid) {
    showMessage("error", "Mohon perbaiki kesalahan pada formulir.");
    return;
  }

  showMessage("loading", "Mengubah kata sandi...");

  try {
    const hashedPassword = await hashString(newPassword);

    const studentDocRef = doc(db, "users", studentData.uid);
    await updateDoc(studentDocRef, {
      passwordHash: hashedPassword,
      lastPasswordChange: serverTimestamp(),
    });

    showMessage("success", "Kata sandi berhasil diubah!");
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmNewPassword").value = "";
  } catch (error) {
    console.error("Error changing password:", error);
    showMessage("error", `Gagal mengubah kata sandi: ${error.message}`);
  }
}

// Inisialisasi aplikasi ketika DOM sudah sepenuhnya dimuat
document.addEventListener("DOMContentLoaded", initializeApp);

// Ekspor variabel dan fungsi yang mungkin dibutuhkan oleh modul lain
export {
  studentData,
  currentMainStudentView,
  studentExerciseHistory,
  allMaterials,
  allScheduledTasks,
  dailyExerciseForStudent,
  switchView,
  showMessage,
};

function displayInlineError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    let errorElement = element.nextElementSibling;
    if (!errorElement || !errorElement.classList.contains("text-red-500")) {
      errorElement = document.createElement("p");
      errorElement.classList.add(
        "mt-1",
        "text-red-500",
        "text-xs",
        "italic",
        "inline-error-message"
      );
      element.parentNode.insertBefore(errorElement, element.nextSibling);
    }
    errorElement.innerText = message;
  }
}
