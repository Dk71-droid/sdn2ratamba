// js/combined.js
// Ini adalah file JavaScript gabungan yang berisi logika dari jadwal.js, materi.js, soal.js, setting.js, dan utils.js.

import {
  db,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs,
  addDoc,
  getDoc,
  auth,
  signOut,
  updateDoc,
} from "./firebase.js";
import {
  renderModals,
  showConfirmationModal,
  renderSoalView,
  teacherData,
  switchView,
} from "./app.js";
import { GEMINI_API_KEY, GEMINI_API_URL } from "./api.js";

// --- Global State Variables for Materi Module (dari materi.js) ---
export let allGeneratedMaterials = [];
export let currentGeneratedLesson = null;
let materialSubject = "";
let materialTopic = "";
let selectedLearningModel = "Eksplorasi Konsep & Diskusi Esai";
let materialSubTopics = "";
export let loadingMaterialGeneration = false;
export let loadingSubTopicSuggestions = false;
export let materialGenerationError = null;
export let subTopicSuggestionError = null;
export let allGeneratedExercises = [];
export let allScheduledTasks = [];

// --- Fungsi Pembantu Umum (dari utils.js) ---
const showMessage = (type, text, titleOverride = null) => {
  const globalMessage = document.getElementById("globalMessage");
  const messageTitle = document.getElementById("messageTitle");
  const messageText = document.getElementById("messageText");
  const messageCloseBtn = document.getElementById("messageCloseBtn");

  if (!globalMessage || !messageTitle || !messageText || !messageCloseBtn) {
    console.error("Global message elements not found.");
    return;
  }

  // Reset classes
  globalMessage.classList.remove(
    "hidden",
    "bg-blue-100",
    "border-blue-500",
    "text-blue-700",
    "bg-green-100",
    "border-green-500",
    "text-green-700",
    "bg-red-100",
    "border-red-500",
    "text-red-700",
    "bg-gray-100",
    "border-gray-500",
    "text-gray-700"
  );

  let bgColor, borderColor, textColor, title;
  let duration = 3000; // Default duration

  switch (type) {
    case "loading":
      bgColor = "bg-blue-100";
      borderColor = "border-blue-500";
      textColor = "text-blue-700";
      title = titleOverride || "Memuat...";
      duration = 0; // Tidak otomatis hilang
      break;
    case "success":
      bgColor = "bg-green-100";
      borderColor = "border-green-500";
      textColor = "text-green-700";
      title = titleOverride || "Berhasil!";
      break;
    case "error":
      bgColor = "bg-red-100";
      borderColor = "border-red-500";
      textColor = "text-red-700";
      title = titleOverride || "Error!";
      break;
    case "info":
    default:
      bgColor = "bg-gray-100";
      borderColor = "border-gray-500";
      textColor = "text-gray-700";
      title = titleOverride || "Informasi";
      break;
  }

  // Setel kelas dan teks
  globalMessage.classList.add(
    bgColor,
    borderColor,
    textColor,
    "border-l-4",
    "p-4",
    "rounded",
    "shadow-lg",
    "fixed",
    "bottom-4",
    "right-4",
    "z-50"
  );
  globalMessage.classList.remove("hidden");
  messageTitle.innerText = title;
  messageText.innerText = text;

  // Sembunyikan pesan setelah durasi tertentu jika bukan "loading"
  if (duration > 0) {
    setTimeout(() => {
      globalMessage.classList.add("hidden");
    }, duration);
  }

  // Tambahkan listener untuk tombol close
  messageCloseBtn.onclick = () => {
    globalMessage.classList.add("hidden");
  };
};

/**
 * Menampilkan pesan error inline untuk input form.
 * @param {string} elementId - ID elemen input.
 * @param {string} message - Pesan error untuk ditampilkan.
 */
const displayInlineError = (elementId, message) => {
  const errorElement = document.getElementById(`${elementId}-error`);
  if (errorElement) {
    errorElement.innerText = message;
    errorElement.classList.remove("hidden");
  }
};

/**
 * Menghapus pesan error inline untuk input form.
 * @param {string} elementId - ID elemen input.
 */
const clearInlineError = (elementId) => {
  const errorElement = document.getElementById(`${elementId}-error`);
  if (errorElement) {
    errorElement.innerText = "";
    errorElement.classList.add("hidden");
  }
};

/**
 * Menghapus semua pesan error inline dalam sebuah container.
 * @param {HTMLElement} containerElement - Elemen container (misalnya, form).
 */
const clearAllInlineErrors = (containerElement) => {
  containerElement.querySelectorAll(".input-error-message").forEach((el) => {
    el.innerText = "";
    el.classList.add("hidden");
  });
};

async function hashString(str) {
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hexHash;
}

// --- Fungsi Penjadwalan (dari jadwal.js) ---

/**
 * Merender tampilan penjadwalan tugas.
 * @param {Array} scheduledTasks - Array objek tugas terjadwal.
 * @param {Array} generatedExercises - Array objek soal yang digenerate.
 * @param {Array} generatedMaterials - Array objek materi yang digenerate.
 */
export function renderJadwalView(
  scheduledTasks,
  generatedExercises,
  generatedMaterials
) {
  const penjadwalanViewElement = document.getElementById("penjadwalanView");
  if (!penjadwalanViewElement) return;

  penjadwalanViewElement.innerHTML = `
    <div class="card mb-8">
      <h2 class="card-header">Jadwalkan Tugas Pembelajaran</h2>
      <p class="text-gray-600 mb-4">
        Jadwalkan materi atau soal untuk dikerjakan siswa pada tanggal dan waktu tertentu.
      </p>
      <form id="scheduleTaskForm" class="space-y-4">
        <div>
          <label for="taskTypeSelect" class="block text-sm font-medium text-gray-700">Tipe Tugas</label>
          <select
            id="taskTypeSelect"
            name="taskType"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Pilih Tipe Tugas</option>
            <option value="material">Materi</option>
            <option value="exercise">Soal</option>
          </select>
          <p id="taskTypeSelect-error" class="input-error-message hidden"></p>
        </div>
        <div id="taskContentContainer" class="hidden">
          <label for="taskContentSelect" class="block text-sm font-medium text-gray-700">Pilih Konten</label>
          <select
            id="taskContentSelect"
            name="taskContent"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Pilih Konten</option>
            <!-- Opsi akan diisi oleh JavaScript -->
          </select>
          <p id="taskContentSelect-error" class="input-error-message hidden"></p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="scheduleDate" class="block text-sm font-medium text-gray-700">Tanggal</label>
            <input
              type="date"
              id="scheduleDate"
              name="scheduleDate"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
            <p id="scheduleDate-error" class="input-error-message hidden"></p>
          </div>
          <div>
            <label for="scheduleTime" class="block text-sm font-medium text-gray-700">Waktu</label>
            <input
              type="time"
              id="scheduleTime"
              name="scheduleTime"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
            <p id="scheduleTime-error" class="input-error-message hidden"></p>
          </div>
        </div>
        <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition duration-300 ease-in-out">
          <i class="fas fa-calendar-plus mr-2"></i> Jadwalkan Tugas
        </button>
      </form>
    </div>

    <div class="card mt-8">
      <h2 class="card-header">Daftar Tugas Terjadwal</h2>
      <div id="scheduledTasksListContainer">
        ${
          scheduledTasks.length === 0
            ? '<p class="text-gray-600 py-4">Belum ada tugas yang terjadwal.</p>'
            : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="scheduledTasksGrid">
                ${scheduledTasks
                  .map(
                    (task) => `
                  <div class="scheduled-task-card card p-4 flex flex-col justify-between" data-task-id="${
                    task.id
                  }">
                    <div>
                      <span class="inline-block text-sm font-semibold rounded-full px-3 py-1 ${
                        task.type === "material"
                          ? "bg-blue-200 text-blue-800"
                          : "bg-purple-200 text-purple-800"
                      }">
                        ${task.type === "material" ? "Materi" : "Soal"}
                      </span>
                      <h3 class="font-bold text-lg mt-2">${
                        task.contentTitle
                      }</h3>
                      <p class="text-sm text-gray-500">
                        ${task.contentSummary || ""}
                      </p>
                      <div class="mt-4 text-sm text-gray-700">
                        <p><i class="fas fa-calendar-alt mr-2"></i> ${
                          task.scheduleDate
                        }</p>
                        <p><i class="fas fa-clock mr-2"></i> ${
                          task.scheduleTime
                        }</p>
                      </div>
                    </div>
                    <div class="mt-4 flex space-x-2 justify-end">
                      <button class="delete-task-btn bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition duration-300 ease-in-out" data-task-id="${
                        task.id
                      }" title="Hapus Tugas">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                `
                  )
                  .join("")}
              </div>`
        }
      </div>
    </div>
  `;

  // Listener untuk perubahan tipe tugas
  document.getElementById("taskTypeSelect").addEventListener("change", (e) => {
    const taskType = e.target.value;
    const taskContentContainer = document.getElementById(
      "taskContentContainer"
    );
    const taskContentSelect = document.getElementById("taskContentSelect");

    // Bersihkan opsi yang ada
    taskContentSelect.innerHTML = '<option value="">Pilih Konten</option>';

    if (taskType) {
      taskContentContainer.classList.remove("hidden");
      const dataToUse =
        taskType === "material" ? allGeneratedMaterials : allGeneratedExercises;

      dataToUse.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        option.innerText = item.title;
        taskContentSelect.appendChild(option);
      });
    } else {
      taskContentContainer.classList.add("hidden");
    }
  });

  // Listener untuk form penjadwalan
  document
    .getElementById("scheduleTaskForm")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      handleScheduleTask();
    });

  // Listener untuk tombol hapus
  document.querySelectorAll(".delete-task-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const taskId = e.currentTarget.dataset.taskId;
      showConfirmationModal(
        "Hapus Tugas Terjadwal",
        "Apakah Anda yakin ingin menghapus tugas terjadwal ini?",
        () => handleDeleteScheduledTask(taskId)
      );
    });
  });
}

/**
 * Menangani penjadwalan tugas baru ke Firestore.
 */
async function handleScheduleTask() {
  const form = document.getElementById("scheduleTaskForm");
  const taskType = form.elements.taskType.value;
  const taskContentId = form.elements.taskContent.value;
  const scheduleDate = form.elements.scheduleDate.value;
  const scheduleTime = form.elements.scheduleTime.value;

  clearAllInlineErrors(form);

  if (!taskType) {
    displayInlineError("taskTypeSelect", "Tipe tugas harus dipilih.");
    return;
  }
  if (!taskContentId) {
    displayInlineError("taskContentSelect", "Konten harus dipilih.");
    return;
  }
  if (!scheduleDate) {
    displayInlineError("scheduleDate", "Tanggal harus diisi.");
    return;
  }
  if (!scheduleTime) {
    displayInlineError("scheduleTime", "Waktu harus diisi.");
    return;
  }

  // Mendapatkan detail konten
  const contentData =
    taskType === "material"
      ? allGeneratedMaterials.find((m) => m.id === taskContentId)
      : allGeneratedExercises.find((e) => e.id === taskContentId);

  if (!contentData) {
    showMessage("error", "Konten yang dipilih tidak ditemukan.");
    return;
  }

  showMessage("loading", "Menjadwalkan tugas...");
  try {
    const newScheduledTask = {
      type: taskType,
      contentId: taskContentId,
      contentTitle: contentData.title,
      contentSummary: contentData.summary || contentData.readingText,
      scheduleDate: scheduleDate,
      scheduleTime: scheduleTime,
      teacherId: teacherData.uid,
      timestamp: serverTimestamp(),
    };

    // Buat ID unik untuk tugas terjadwal
    const newDocRef = doc(collection(db, "scheduled_tasks"));
    await setDoc(newDocRef, newScheduledTask);

    showMessage("success", "Tugas berhasil dijadwalkan!");
    // Reset form
    document.getElementById("taskTypeSelect").value = "";
    document.getElementById("taskContentSelect").innerHTML =
      '<option value="">Pilih Konten</option>';
    document.getElementById("taskContentContainer").classList.add("hidden");
    document.getElementById("scheduleDate").value = new Date()
      .toISOString()
      .slice(0, 10); // Reset to today
    document.getElementById("scheduleTime").value = "";
  } catch (error) {
    console.error("Error scheduling task:", error);
    showMessage("error", `Gagal menjadwalkan tugas: ${error.message}`);
  }
}

/**
 * Menangani penghapusan tugas terjadwal.
 * @param {string} taskId - ID tugas terjadwal yang akan dihapus.
 */
async function handleDeleteScheduledTask(taskId) {
  showMessage("loading", "Menghapus jadwal tugas...");
  try {
    await deleteDoc(doc(db, "scheduled_tasks", taskId));
    showMessage("success", "Jadwal tugas berhasil dihapus!");
  } catch (error) {
    console.error("Error deleting scheduled task:", error);
    showMessage("error", `Gagal menghapus jadwal tugas: ${error.message}`);
  } finally {
    renderModals({ showConfirmModal: false }); // Tutup modal konfirmasi
  }
}

// --- Fungsi Materi (dari materi.js) ---

// Define available learning models (matching App.jsx)
export const learningModels = [
  {
    value: "Eksplorasi Konsep & Diskusi Esai",
    label: "1. Eksplorasi Konsep & Diskusi Esai",
  },
  {
    value: "Petualangan Cerita & Narasi",
    label: "2. Petualangan Cerita & Narasi",
  },
];

/**
 * Memperbarui status loading dan error untuk generate materi.
 * @param {boolean} loading - Status loading.
 * @param {string|null} error - Pesan error atau null.
 */
function updateMaterialGenerationStatus(loading, error = null) {
  loadingMaterialGeneration = loading;
  materialGenerationError = error;
  renderModals({ showGenerateMaterialModal: true }); // Perbarui modal
}

/**
 * Memperbarui status loading dan error untuk saran sub-topik.
 * @param {boolean} loading - Status loading.
 * @param {string|null} error - Pesan error atau null.
 */
function updateSubTopicSuggestionStatus(loading, error = null) {
  loadingSubTopicSuggestions = loading;
  subTopicSuggestionError = error;
  renderModals({ showGenerateMaterialModal: true }); // Perbarui modal
}

/**
 * Mengambil nilai dari input form UI materi (dari modal).
 */
export function getFormValues() {
  return {
    subject:
      document.getElementById("materialSubjectModal")?.value.trim() || "",
    topic: document.getElementById("materialTopicModal")?.value.trim() || "",
    learningModel:
      document.getElementById("learningModelSelectModal")?.value ||
      "Eksplorasi Konsep & Diskusi Esai",
    subTopics:
      document.getElementById("materialSubTopicsModal")?.value.trim() || "",
  };
}

/**
 * Mengatur nilai input form UI materi (di modal).
 */
export function setFormValues(subject, topic, learningModel, subTopics) {
  const subjectInput = document.getElementById("materialSubjectModal");
  const topicInput = document.getElementById("materialTopicModal");
  const modelSelect = document.getElementById("learningModelSelectModal");
  const subTopicsTextarea = document.getElementById("materialSubTopicsModal");

  if (subjectInput) subjectInput.value = subject;
  if (topicInput) topicInput.value = topic;
  if (modelSelect) modelSelect.value = learningModel;
  if (subTopicsTextarea) subTopicsTextarea.value = subTopics;

  materialSubject = subject;
  materialTopic = topic;
  selectedLearningModel = learningModel;
  materialSubTopics = subTopics;
}

/**
 * Memperbarui disabled state tombol dan input form (di modal).
 */
export function updateFormDisabledState() {
  const subjectInput = document.getElementById("materialSubjectModal");
  const topicInput = document.getElementById("materialTopicModal");
  const modelSelect = document.getElementById("learningModelSelectModal");
  const subTopicsTextarea = document.getElementById("materialSubTopicsModal");
  const generateSubTopicsBtn = document.getElementById(
    "generateSubTopicsBtnModal"
  );
  const generateMaterialBtn = document.getElementById(
    "generateMaterialBtnModal"
  );
  const isDisabled = loadingMaterialGeneration || loadingSubTopicSuggestions;

  if (subjectInput) subjectInput.disabled = isDisabled;
  if (topicInput) topicInput.disabled = isDisabled;
  if (modelSelect) modelSelect.disabled = isDisabled;
  if (subTopicsTextarea) subTopicsTextarea.disabled = isDisabled;

  if (generateSubTopicsBtn)
    generateSubTopicsBtn.disabled =
      isDisabled || materialSubject.length === 0 || materialTopic.length === 0;
  if (generateMaterialBtn) {
    generateMaterialBtn.disabled =
      isDisabled ||
      materialSubject.length === 0 ||
      materialTopic.length === 0 ||
      materialSubTopics.length === 0;
  }
}

/**
 * Menangani pembuatan materi dari form modal.
 */
export async function handleGenerateMaterial() {
  // Ambil nilai dari form
  const { subject, topic, learningModel, subTopics } = getFormValues();
  const form = document.getElementById("generateMaterialForm");
  clearAllInlineErrors(form);

  // Validasi input
  if (!subject) {
    displayInlineError("materialSubjectModal", "Mata pelajaran harus diisi.");
    return;
  }
  if (!topic) {
    displayInlineError("materialTopicModal", "Topik harus diisi.");
    return;
  }
  if (!subTopics) {
    displayInlineError("materialSubTopicsModal", "Sub-topik harus diisi.");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    showMessage("error", "Anda harus login untuk membuat materi.");
    return;
  }

  // Persiapan prompt API
  const prompt = `
    Sebagai seorang ahli kurikulum untuk pendidikan dasar, buatlah materi pembelajaran tentang topik berikut dalam format JSON.
    Tujuan dari materi ini adalah untuk mengajar mata pelajaran "${subject}" dengan topik utama "${topic}" dan sub-topik berikut: ${subTopics}.
    Materi ini akan disajikan kepada guru untuk digunakan di kelas, dan harus sesuai dengan model pembelajaran "${learningModel}".
    Format respons harus berupa JSON dengan skema berikut:
    {
      "title": "Judul Materi",
      "summary": "Ringkasan singkat tentang materi",
      "learningModel": "Model Pembelajaran yang digunakan",
      "subject": "Mata pelajaran",
      "topic": "Topik",
      "content": [
        {
          "heading": "Judul Bagian",
          "body": "Isi detail bagian, bisa berupa paragraf, narasi cerita, atau poin-poin penjelasan."
        },
        ...
      ]
    }
    Pastikan respons hanya berisi objek JSON yang valid dan tidak ada teks tambahan di luar objek JSON.
  `;

  updateMaterialGenerationStatus(true);
  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            summary: { type: "STRING" },
            learningModel: { type: "STRING" },
            subject: { type: "STRING" },
            topic: { type: "STRING" },
            content: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  heading: { type: "STRING" },
                  body: { type: "STRING" },
                },
              },
            },
          },
          propertyOrdering: [
            "title",
            "summary",
            "learningModel",
            "subject",
            "topic",
            "content",
          ],
        },
      },
    };

    const apiKey = GEMINI_API_KEY;
    const apiUrl = `${GEMINI_API_URL}?key=${apiKey}`;
    const response = await fetchWithExponentialBackoff(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (jsonText) {
      const generatedMaterial = JSON.parse(jsonText);
      const newMaterialDoc = {
        title: generatedMaterial.title,
        summary: generatedMaterial.summary,
        learningModel: generatedMaterial.learningModel,
        subject: generatedMaterial.subject,
        topic: generatedMaterial.topic,
        content: generatedMaterial.content,
        generatedBy: user.uid,
        generatedByName: teacherData?.name || user.displayName || "Unknown",
        timestamp: serverTimestamp(),
      };

      const docRef = doc(collection(db, "generated_materials"));
      await setDoc(docRef, newMaterialDoc);

      currentGeneratedLesson = { id: docRef.id, ...newMaterialDoc };
      showMessage("success", "Materi berhasil dibuat dan disimpan!");
      renderModals({ showGenerateMaterialModal: false });
      switchView("materiView");
    } else {
      throw new Error("Respons API tidak valid atau tidak ada kandidat.");
    }
  } catch (error) {
    console.error("Error generating material:", error);
    showMessage("error", `Gagal membuat materi: ${error.message}`);
  } finally {
    updateMaterialGenerationStatus(false);
  }
}

/**
 * Menangani pembuatan saran sub-topik.
 */
export async function handleSuggestSubTopics() {
  const { subject, topic, learningModel } = getFormValues();
  const form = document.getElementById("generateMaterialForm");
  clearAllInlineErrors(form);

  if (!subject) {
    displayInlineError("materialSubjectModal", "Mata pelajaran harus diisi.");
    return;
  }
  if (!topic) {
    displayInlineError("materialTopicModal", "Topik harus diisi.");
    return;
  }

  updateSubTopicSuggestionStatus(true);
  try {
    const prompt = `
      Sebutkan 3 sub-topik yang relevan untuk mata pelajaran "${subject}" dengan topik "${topic}" untuk model pembelajaran "${learningModel}".
      Berikan respons dalam format JSON Array of Strings.
      Contoh: ["Sub-topik 1", "Sub-topik 2", "Sub-topik 3"]
      Pastikan respons hanya berisi JSON yang valid dan tidak ada teks tambahan.
    `;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "STRING",
          },
        },
      },
    };

    const apiKey = GEMINI_API_KEY;
    const apiUrl = `${GEMINI_API_URL}?key=${apiKey}`;
    const response = await fetchWithExponentialBackoff(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (jsonText) {
      const suggestions = JSON.parse(jsonText);
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        setFormValues(
          subject,
          topic,
          learningModel,
          suggestions.map((s) => `- ${s}`).join("\n")
        );
      } else {
        throw new Error("Respons API tidak valid atau tidak ada kandidat.");
      }
    } else {
      throw new Error("Respons API tidak valid atau tidak ada kandidat.");
    }
  } catch (error) {
    console.error("Error suggesting sub-topics:", error);
    showMessage("error", `Gagal mendapatkan saran sub-topik: ${error.message}`);
  } finally {
    updateSubTopicSuggestionStatus(false);
  }
}

// --- Fungsi Soal (dari soal.js) ---

// Fungsi untuk mengimplementasikan exponential backoff untuk panggilan API
async function fetchWithExponentialBackoff(
  url,
  options,
  retries = 3,
  delay = 1000
) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        // Jika respons tidak OK, lempar error untuk memicu retry
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (i < retries - 1) {
        // Logika retry: tunggu sebentar sebelum mencoba lagi
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Eksponensial backoff
      } else {
        // Jika retry habis, lempar error asli
        throw error;
      }
    }
  }
}

/**
 * Menangani pembuatan soal harian dengan AI.
 * @param {string} targetDate - Tanggal target dalam format YYYY-MM-DD.
 * @param {string} exerciseType - Tipe soal ('literasi' atau 'numerasi').
 * @param {string} subject - Mata pelajaran.
 * @param {string} gradeLevel - Tingkat kelas.
 */
export async function generateDailyAIExercise(
  targetDate,
  exerciseType,
  subject,
  gradeLevel
) {
  showMessage("loading", "Menggenerate soal AI harian...");
  try {
    const promptLiterasi = `
      Sebagai seorang ahli kurikulum untuk pendidikan dasar, buatlah satu set soal literasi untuk tanggal ${targetDate} dengan tema yang menarik untuk siswa kelas ${gradeLevel} dalam mata pelajaran ${subject}.
      Soal harus terdiri dari satu teks bacaan (readingText) dan 5 pertanyaan (questions) yang menguji pemahaman, interpretasi, dan evaluasi.
      Setiap pertanyaan harus memiliki format: "questionText", "options" (array dengan 4 opsi), dan "correctAnswer" (indeks dari opsi yang benar, dimulai dari 0).
      Respons harus dalam format JSON dengan skema berikut:
      {
        "readingText": "Teks bacaan yang menarik...",
        "questions": [
          {
            "questionText": "Pertanyaan pertama...",
            "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
            "correctAnswer": 0
          },
          ... (hingga 5 pertanyaan)
        ]
      }
      Pastikan respons hanya berisi objek JSON yang valid dan tidak ada teks tambahan di luar objek JSON.
    `;

    const promptNumerasi = `
      Sebagai seorang ahli kurikulum untuk pendidikan dasar, buatlah satu set soal numerasi untuk tanggal ${targetDate} dengan skenario yang menarik untuk siswa kelas ${gradeLevel} dalam mata pelajaran ${subject}.
      Soal harus terdiri dari satu teks pengantar (readingText) yang memberikan konteks, dan 5 pertanyaan (questions) yang menguji pemahaman matematis, penalaran, dan pemecahan masalah.
      Setiap pertanyaan harus memiliki format: "questionText", "options" (array dengan 4 opsi), dan "correctAnswer" (indeks dari opsi yang benar, dimulai dari 0).
      Respons harus dalam format JSON dengan skema berikut:
      {
        "readingText": "Skenario numerasi yang menarik...",
        "questions": [
          {
            "questionText": "Pertanyaan pertama...",
            "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
            "correctAnswer": 0
          },
          ... (hingga 5 pertanyaan)
        ]
      }
      Pastikan respons hanya berisi objek JSON yang valid dan tidak ada teks tambahan di luar objek JSON.
    `;

    const prompt =
      exerciseType === "literasi" ? promptLiterasi : promptNumerasi;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            readingText: { type: "STRING" },
            questions: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  questionText: { type: "STRING" },
                  options: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                  },
                  correctAnswer: { type: "NUMBER" },
                },
              },
            },
          },
          propertyOrdering: ["readingText", "questions"],
        },
      },
    };

    const apiKey = GEMINI_API_KEY;
    const apiUrl = `${GEMINI_API_URL}?key=${apiKey}`;
    const response = await fetchWithExponentialBackoff(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (jsonText) {
      const { readingText, questions } = JSON.parse(jsonText);

      // Cek duplikasi soal untuk tanggal yang sama
      const existingDocRef = doc(db, "daily_ai_exercises", targetDate);
      const existingDoc = await getDoc(existingDocRef);

      if (existingDoc.exists()) {
        throw new Error(
          "Soal untuk tanggal ini sudah ada. Hapus terlebih dahulu jika ingin membuat yang baru."
        );
      }

      // Simpan soal ke Firestore. Gunakan setDoc dengan tanggal sebagai ID untuk menimpa jika sudah ada.
      await setDoc(doc(db, "daily_ai_exercises", targetDate), {
        date: targetDate,
        type: exerciseType,
        rawContent: jsonText, // Simpan respons JSON mentah untuk referensi
        readingText: readingText,
        questions: questions,
        generatedBy: teacherData?.uid || "unknown",
        generatedByName: teacherData?.name || "Unknown Teacher",
        timestamp: serverTimestamp(),
      });

      showMessage(
        "success",
        `Soal ${exerciseType} untuk ${targetDate} berhasil digenerate dan disimpan!`
      );
      renderSoalView(); // Perbarui tampilan soal setelah generate
      return true;
    } else {
      throw new Error("Respons API tidak valid atau tidak ada kandidat.");
    }
  } catch (error) {
    console.error("Error generating and saving daily exercise:", error);
    showMessage("error", `Gagal generate soal AI: ${error.message}`);
    return false;
  }
}

// --- Fungsi Pengaturan (dari setting.js) ---

/**
 * Mengelola proses logout pengguna.
 */
async function handleLogout() {
  showMessage("info", "Sedang logout...");
  try {
    await signOut(auth);
    // Redirection akan ditangani oleh onAuthStateChanged di app.js
    showMessage("success", "Berhasil logout.");
  } catch (error) {
    console.error("Logout error:", error);
    showMessage("error", "Gagal logout: " + error.message);
  }
}

/**
 * Mengelola pembaruan profil guru.
 * @param {Event} e - Event submit formulir.
 */
async function handleUpdateProfile(e) {
  e.preventDefault(); // Mencegah reload halaman
  clearAllInlineErrors(e.target); // Clear all previous errors

  showMessage("loading", "Memperbarui profil...");

  const name = document.getElementById("teacherName").value.trim();
  const nip = document.getElementById("teacherNip").value.trim();
  const classesTaughtString = document
    .getElementById("teacherClassesTaught")
    .value.trim();
  const classesTaught = classesTaughtString
    ? classesTaughtString.split(",").map((cls) => cls.trim())
    : [];

  let isValid = true;

  if (!name) {
    displayInlineError("teacherName", "Nama tidak boleh kosong.");
    isValid = false;
  }

  if (!isValid) {
    showMessage("error", "Mohon perbaiki kesalahan pada formulir.");
    return;
  }

  try {
    if (!auth.currentUser) {
      showMessage("error", "Pengguna tidak terautentikasi.");
      return;
    }

    const teacherDocRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(teacherDocRef, {
      name: name,
      nip: nip,
      classesTaught: classesTaught,
      lastUpdated: serverTimestamp(),
    });

    showMessage("success", "Profil berhasil diperbarui!");
    // renderPengaturanView akan dipicu oleh onSnapshot di app.js
  } catch (error) {
    console.error("Error updating profile:", error);
    showMessage("error", `Gagal memperbarui profil: ${error.message}`);
  }
}

/**
 * Mengelola perubahan kata sandi guru.
 * @param {Event} e - Event submit formulir.
 */
async function handleChangePassword(e) {
  e.preventDefault(); // Mencegah reload halaman
  clearAllInlineErrors(e.target); // Clear all previous errors

  showMessage("loading", "Mengubah kata sandi...");

  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmNewPassword = document
    .getElementById("confirmNewPassword")
    .value.trim();

  let isValid = true;

  if (!newPassword) {
    displayInlineError("newPassword", "Kata sandi baru tidak boleh kosong.");
    isValid = false;
  } else if (newPassword.length < 6) {
    displayInlineError("newPassword", "Kata sandi minimal 6 karakter.");
    isValid = false;
  }

  if (!confirmNewPassword) {
    displayInlineError(
      "confirmNewPassword",
      "Konfirmasi kata sandi tidak boleh kosong."
    );
    isValid = false;
  } else if (newPassword !== confirmNewPassword) {
    displayInlineError(
      "confirmNewPassword",
      "Kata sandi baru dan konfirmasi tidak cocok."
    );
    isValid = false;
  }

  if (!isValid) {
    showMessage("error", "Mohon perbaiki kesalahan pada formulir.");
    return;
  }

  try {
    if (!auth.currentUser) {
      showMessage("error", "Pengguna tidak terautentikasi.");
      return;
    }

    const hashedPassword = await hashString(newPassword);
    const teacherDocRef = doc(db, "users", auth.currentUser.uid);

    await updateDoc(teacherDocRef, {
      passwordHash: hashedPassword,
      lastPasswordChange: serverTimestamp(),
    });

    showMessage("success", "Kata sandi berhasil diubah!");
    // Clear password fields
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmNewPassword").value = "";
  } catch (error) {
    console.error("Error changing password:", error);
    showMessage("error", `Gagal mengubah kata sandi: ${error.message}`);
  }
}

/**
 * Menyiapkan event listener untuk elemen-elemen di tampilan pengaturan.
 * Fungsi ini harus dipanggil setelah elemen-elemen DOM dirender.
 */
function setupSettingListeners() {
  // Listener untuk tombol logout mobile (di header)
  const logoutButtonMobile = document.getElementById("logoutButton");
  if (logoutButtonMobile) {
    logoutButtonMobile.addEventListener("click", handleLogout);
  }

  // Listener untuk tombol logout desktop (di bagian pengaturan)
  const logoutButtonDesktop = document.getElementById("logoutButtonDesktop");
  if (logoutButtonDesktop) {
    logoutButtonDesktop.addEventListener("click", handleLogout);
  }

  // Listener untuk form edit profil
  const profileEditForm = document.getElementById("profileEditForm");
  if (profileEditForm) {
    profileEditForm.addEventListener("submit", handleUpdateProfile);
  }

  // Listener untuk form ubah kata sandi
  const passwordChangeForm = document.getElementById("passwordChangeForm");
  if (passwordChangeForm) {
    passwordChangeForm.addEventListener("submit", handleChangePassword);
  }
}

export {
  showMessage,
  displayInlineError,
  clearInlineError,
  clearAllInlineErrors,
  hashString,
  renderJadwalView,
  handleScheduleTask,
  handleDeleteScheduledTask,
  learningModels,
  getFormValues,
  setFormValues,
  updateFormDisabledState,
  handleGenerateMaterial,
  handleSuggestSubTopics,
  generateDailyAIExercise,
  fetchWithExponentialBackoff,
  handleLogout,
  handleUpdateProfile,
  handleChangePassword,
  setupSettingListeners,
  allGeneratedMaterials,
  currentGeneratedLesson,
  loadingMaterialGeneration,
  loadingSubTopicSuggestions,
  materialGenerationError,
  subTopicSuggestionError,
  allGeneratedExercises,
  allScheduledTasks,
};
