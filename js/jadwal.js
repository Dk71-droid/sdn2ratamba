// js/jadwal.js
// Modul ini akan berisi logika untuk mengatur penjadwalan tugas harian (materi dan soal).

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
  getDocs, // Diperlukan untuk memeriksa duplikasi
} from "./firebase.js";
import {
  showMessage,
  displayInlineError,
  clearInlineError,
  clearAllInlineErrors,
} from "./utils.js";
import { renderModals, showConfirmationModal } from "./app.js"; // Diperlukan untuk modal konfirmasi
import {
  teacherData,
  allGeneratedExercises,
  allGeneratedMaterials,
  allScheduledTasks, // Import data global dari app.js
} from "./app.js"; // Import variabel global dari app.js

// --- Fungsi Rendering UI Penjadwalan ---

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

  // Pastikan elemen-elemen form sudah ada di HTML (dari portalguru.html)
  const taskTypeSelect = document.getElementById("taskTypeSelect");
  const taskContentContainer = document.getElementById("taskContentContainer");
  const taskContentSelect = document.getElementById("taskContentSelect");
  const scheduleDateInput = document.getElementById("scheduleDate");
  const scheduleTimeInput = document.getElementById("scheduleTime");
  const scheduleTaskForm = document.getElementById("scheduleTaskForm");
  const scheduledTasksListContainer = document.getElementById(
    "scheduledTasksListContainer"
  );

  // Set tanggal default ke hari ini
  if (scheduleDateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0"); // Months start at 0!
    const dd = String(today.getDate()).padStart(2, "0");
    scheduleDateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // Event listener untuk perubahan tipe tugas
  if (taskTypeSelect) {
    // Hapus listener lama untuk mencegah duplikasi
    taskTypeSelect.removeEventListener("change", handleTaskTypeChange);
    taskTypeSelect.addEventListener("change", handleTaskTypeChange);
    // Panggil sekali saat tampilan dirender untuk mengisi dropdown awal jika sudah ada pilihan
    handleTaskTypeChange(); // Panggil ini untuk mengisi dropdown saat pertama kali dimuat
  }

  function handleTaskTypeChange() {
    const selectedType = taskTypeSelect.value;
    taskContentSelect.innerHTML = '<option value="">Pilih Konten</option>'; // Reset options
    taskContentContainer.classList.add("hidden"); // Sembunyikan secara default

    if (selectedType === "materi") {
      // Populate with materials
      allGeneratedMaterials.forEach((material) => {
        const option = document.createElement("option");
        option.value = material.id;
        option.innerText = material.title;
        taskContentSelect.appendChild(option);
      });
      taskContentContainer.classList.remove("hidden");
    } else if (selectedType === "soal") {
      // Populate with exercises
      allGeneratedExercises.forEach((exercise) => {
        const option = document.createElement("option");
        option.value = exercise.id;
        option.innerText = `Soal ${exercise.type} - ${exercise.date}`;
        taskContentSelect.appendChild(option);
      });
      taskContentContainer.classList.remove("hidden");
    }
    clearInlineError("taskTypeSelect");
    clearInlineError("taskContentSelect");
  }

  // Event listener untuk form submission
  if (scheduleTaskForm) {
    // Hapus listener lama untuk mencegah duplikasi
    scheduleTaskForm.removeEventListener("submit", handleSubmitScheduleTask);
    scheduleTaskForm.addEventListener("submit", handleSubmitScheduleTask);
  }

  async function handleSubmitScheduleTask(e) {
    e.preventDefault();
    clearAllInlineErrors(e.target);
    await handleScheduleTask(
      taskTypeSelect.value,
      taskContentSelect.value,
      scheduleDateInput.value,
      scheduleTimeInput.value
    );
  }

  // Render daftar tugas terjadwal
  renderScheduledTasksList(
    scheduledTasks,
    generatedExercises,
    generatedMaterials
  );
}

/**
 * Merender daftar tugas terjadwal ke dalam tabel.
 * @param {Array} scheduledTasks - Array objek tugas terjadwal.
 * @param {Array} generatedExercises - Array objek soal yang digenerate.
 * @param {Array} generatedMaterials - Array objek materi yang digenerate.
 */
function renderScheduledTasksList(
  scheduledTasks,
  generatedExercises,
  generatedMaterials
) {
  const container = document.getElementById("scheduledTasksListContainer");
  if (!container) return;

  if (scheduledTasks.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-500 mt-4">
        <p>Belum ada tugas yang dijadwalkan.</p>
      </div>
    `;
    return;
  }

  let tableHtml = `
    <table class="data-table">
        <thead>
            <tr>
                <th>Tipe</th>
                <th>Judul Konten</th>
                <th>Tanggal & Waktu</th>
                <th>Status</th>
                <th class="actions-col">Aksi</th>
            </tr>
        </thead>
        <tbody>
            ${scheduledTasks
              .map((task) => {
                let contentTitle = "Tidak Ditemukan";
                if (task.contentType === "materi") {
                  const material = generatedMaterials.find(
                    (m) => m.id === task.contentId
                  );
                  contentTitle = material ? material.title : contentTitle;
                } else if (task.contentType === "soal") {
                  const exercise = generatedExercises.find(
                    (e) => e.id === task.contentId
                  );
                  contentTitle = exercise
                    ? `Soal ${exercise.type} - ${exercise.date}`
                    : contentTitle;
                }

                const scheduledDateTime = task.scheduleTime
                  ? `${task.scheduleDate} Pukul ${task.scheduleTime}`
                  : task.scheduleDate;
                const now = new Date();
                const taskDateTime = task.scheduleTime
                  ? new Date(`${task.scheduleDate}T${task.scheduleTime}`)
                  : new Date(task.scheduleDate);
                const status = taskDateTime <= now ? "Aktif" : "Terjadwal";

                return `
                    <tr>
                        <td>${
                          task.contentType === "materi" ? "Materi" : "Soal"
                        }</td>
                        <td>${contentTitle}</td>
                        <td>${scheduledDateTime}</td>
                        <td>${status}</td>
                        <td class="flex space-x-2 actions-col">
                            <button class="text-red-500 hover:text-red-700 text-xs delete-scheduled-task-btn" data-task-id="${
                              task.id
                            }" title="Hapus Jadwal">
                                <i class="fas fa-trash-alt"></i> Hapus
                            </button>
                        </td>
                    </tr>
                `;
              })
              .join("")}
        </tbody>
    </table>
  `;

  container.innerHTML = tableHtml;

  // Attach event listeners for delete buttons
  document.querySelectorAll(".delete-scheduled-task-btn").forEach((button) => {
    // Hapus listener lama untuk mencegah duplikasi
    button.removeEventListener("click", handleDeleteButtonClick);
    button.addEventListener("click", handleDeleteButtonClick);
  });

  function handleDeleteButtonClick(e) {
    const taskId = e.currentTarget.dataset.taskId;
    showConfirmationModal(
      "Apakah Anda yakin ingin menghapus jadwal tugas ini?",
      () => handleDeleteScheduledTask(taskId)
    );
  }
}

// --- Fungsi Penanganan Logika Penjadwalan ---

/**
 * Menangani proses penjadwalan tugas baru.
 * @param {string} contentType - Tipe konten ('materi' atau 'soal').
 * @param {string} contentId - ID dari materi atau soal yang akan dijadwalkan.
 * @param {string} scheduleDate - Tanggal penjadwalan (YYYY-MM-DD).
 * @param {string} scheduleTime - Waktu penjadwalan (HH:MM, opsional).
 */
async function handleScheduleTask(
  contentType,
  contentId,
  scheduleDate,
  scheduleTime
) {
  let isValid = true;
  if (!contentType) {
    displayInlineError("taskTypeSelect", "Tipe tugas harus dipilih.");
    isValid = false;
  }
  if (!contentId) {
    displayInlineError("taskContentSelect", "Konten harus dipilih.");
    isValid = false;
  }
  if (!scheduleDate) {
    displayInlineError("scheduleDate", "Tanggal penugasan harus diisi.");
    isValid = false;
  }

  if (!isValid) {
    showMessage("error", "Mohon perbaiki kesalahan pada formulir.");
    return;
  }

  showMessage("loading", "Menjadwalkan tugas...");

  try {
    // Check for duplicate schedule for the same content on the same date
    const q = query(
      collection(db, "scheduled_tasks"),
      where("contentType", "==", contentType),
      where("contentId", "==", contentId),
      where("scheduleDate", "==", scheduleDate)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      displayInlineError(
        "scheduleDate",
        "Tugas ini sudah dijadwalkan untuk tanggal yang sama."
      );
      showMessage(
        "error",
        "Tugas ini sudah dijadwalkan untuk tanggal yang sama."
      );
      return;
    }

    const newScheduledTask = {
      contentType: contentType,
      contentId: contentId,
      scheduleDate: scheduleDate,
      scheduleTime: scheduleTime || null, // Simpan null jika tidak ada waktu
      scheduledBy: teacherData?.uid || "unknown",
      scheduledByName: teacherData?.name || "Unknown Teacher",
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(collection(db, "scheduled_tasks")), newScheduledTask);

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

// Tidak perlu setupJadwalListeners() di sini karena app.js akan memanggil renderJadwalView
// dan event listener untuk form akan di-setup di dalam renderJadwalView setiap kali dipanggil.
