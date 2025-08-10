// js/dashboard.js

import {
  db,
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  query,
  where,
  getDocs,
} from "./firebase.js";
import { showMessage } from "./utils.js";
// Import renderModals, handleDeleteStudent, handleEditStudent, allStudents from app.js
// These are imported directly in the functions that need them to avoid circular dependencies
// and ensure they get the most up-to-date references from app.js's global scope.

/**
 * Renders the student list table in the management view.
 * @param {Array} students - Array of student objects.
 * @param {Function} handleDeleteStudentCallback - Callback function to handle student deletion.
 * @param {Function} handleEditStudentCallback - Callback function to handle student editing (opens modal).
 */
function renderStudentTable(
  students,
  handleDeleteStudentCallback,
  handleEditStudentCallback
) {
  const studentListTableContainer = document.getElementById(
    "studentListTableContainer"
  );
  if (!studentListTableContainer) return;

  let studentTableHtml = `
    <table class="data-table">
        <thead>
            <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>NISN</th>
                <th>Kelas</th>
                <th class="actions-col">Aksi</th> <!-- Kolom Aksi ditambahkan kembali -->
            </tr>
        </thead>
        <tbody>
            ${students
              .map(
                (student) => `
                    <tr>
                        <td>${student.name}</td>
                        <td>${student.username || "N/A"}</td>
                        <td>${student.studentId || "N/A"}</td>
                        <td>${student.classId || "N/A"}</td>
                        <td class="flex space-x-2 actions-col"> <!-- Tombol aksi di kolom terpisah -->
                            <button class="text-orange-500 hover:text-orange-700 text-xs edit-student-btn" data-student-id="${
                              student.id
                            }" title="Edit Siswa">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="text-red-500 hover:text-red-700 text-xs delete-student-btn" data-student-id="${
                              student.id
                            }" title="Hapus Siswa">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `
              )
              .join("")}
            ${
              students.length === 0
                ? `<tr><td colspan="5" class="text-center text-gray-500">Belum ada siswa terdaftar.</td></tr>`
                : ""
            }
        </tbody>
    </table>
  `;

  studentListTableContainer.innerHTML = studentTableHtml;

  // Attach event listeners for edit and delete buttons
  document.querySelectorAll(".edit-student-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const studentId = e.currentTarget.dataset.studentId;
      const studentToEdit = students.find((s) => s.id === studentId);
      if (studentToEdit) {
        handleEditStudentCallback(studentToEdit); // Call the callback from app.js
      } else {
        showMessage("error", "Siswa tidak ditemukan untuk diedit.");
      }
    });
  });

  document.querySelectorAll(".delete-student-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const studentId = e.currentTarget.dataset.studentId;
      const studentName =
        students.find((s) => s.id === studentId)?.name || "siswa ini";
      // Import renderModals from app.js here to avoid circular dependency at top level
      import("./app.js").then(({ renderModals }) => {
        renderModals({
          showConfirmModal: true,
          confirmModalMessage: `Apakah Anda yakin ingin menghapus siswa ${studentName} dan semua riwayat latihannya?`,
          confirmModalAction: () => handleDeleteStudentCallback(studentId),
        });
      });
    });
  });
}

/**
 * Sets up Firestore listeners for student data.
 * @param {Function} studentsUpdatedCallback - Callback function to be called when student data is updated.
 */
function setupDashboardListeners(studentsUpdatedCallback) {
  const studentsQuery = query(
    collection(db, "users"),
    where("role", "==", "student")
  );
  return onSnapshot(
    studentsQuery,
    (snapshot) => {
      const students = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      studentsUpdatedCallback(students);
    },
    (error) => {
      console.error("Error fetching students:", error);
      showMessage("error", "Gagal memuat daftar siswa.");
    }
  );
}

/**
 * Shows a modal displaying the full list of students.
 * This is triggered by clicking the "Total Students" card on the dashboard.
 * @param {Array} students - The array of all student objects.
 */
function showStudentListModal(students) {
  const studentListModalContent = `
    <div id="fullStudentListModal" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[1000] modal-overlay">
        <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-cyan-700">Daftar Lengkap Siswa</h3>
                <button id="closeFullStudentListModal" class="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
            </div>
            <div class="overflow-x-auto">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nama</th>
                            <th>Username</th>
                            <th>NISN</th>
                            <th>Kelas</th>
                            <th class="actions-col">Aksi</th> <!-- Kolom Aksi ditambahkan kembali -->
                        </tr>
                    </thead>
                    <tbody>
                        ${students
                          .map(
                            (student) => `
                            <tr>
                                <td>${student.name}</td>
                                <td>${student.username || "N/A"}</td>
                                <td>${student.studentId || "N/A"}</td>
                                <td>${student.classId || "N/A"}</td>
                                <td class="flex space-x-2 actions-col"> <!-- Tombol aksi di kolom terpisah -->
                                    <button class="text-orange-500 hover:text-orange-700 text-xs edit-student-btn" data-student-id="${
                                      student.id
                                    }" title="Edit Siswa">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="text-red-500 hover:text-red-700 text-xs delete-student-btn" data-student-id="${
                                      student.id
                                    }" title="Hapus Siswa">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </td>
                            </tr>
                        `
                          )
                          .join("")}
                        ${
                          students.length === 0
                            ? `<tr><td colspan="5" class="text-center text-gray-500">Belum ada siswa terdaftar.</td></tr>`
                            : ""
                        }
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  `;
  document.getElementById("modal-container").innerHTML =
    studentListModalContent;

  document
    .getElementById("closeFullStudentListModal")
    ?.addEventListener("click", () => {
      document.getElementById("fullStudentListModal").remove();
    });
}

export { setupDashboardListeners, showStudentListModal, renderStudentTable };
