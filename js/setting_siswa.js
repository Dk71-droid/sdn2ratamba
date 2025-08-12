// js/setting_siswa.js
// Berisi fungsi-fungsi yang terkait dengan halaman pengaturan siswa.

import {
  showMessage,
  hashString,
  clearAllInlineErrors,
  displayInlineError,
} from "./utils.js";
import {
  db,
  doc,
  updateDoc,
  serverTimestamp,
  auth,
  signOut,
} from "./firebase.js";
import { studentData } from "./app_siswa.js";

/**
 * Merender konten tampilan pengaturan.
 * @param {Object} studentData Data siswa saat ini.
 */
export function renderPengaturanView(studentData) {
  const pengaturanViewElement = document.getElementById("pengaturanView");
  if (!pengaturanViewElement) return;

  if (studentData) {
    document.getElementById("studentName").value = studentData.name || "";
    document.getElementById("studentUsername").value =
      studentData.username || "";
    document.getElementById("studentClass").value = studentData.classId || "";
  }

  // Menambahkan event listener untuk formulir penggantian password
  const passwordChangeForm = document.getElementById("passwordChangeForm");
  if (passwordChangeForm) {
    // Hapus listener lama jika ada untuk mencegah duplikasi
    passwordChangeForm.removeEventListener("submit", handleChangePassword);
    passwordChangeForm.addEventListener("submit", handleChangePassword);
  }
}

/**
 * Mengelola proses logout siswa.
 */
export async function handleLogout() {
  showMessage("info", "Sedang logout...");
  try {
    await signOut(auth);
    localStorage.removeItem("currentStudentId");
    showMessage("success", "Berhasil logout.");
    window.location.href = "login.html";
  } catch (error) {
    console.error("Logout error:", error);
    showMessage("error", "Gagal logout: " + error.message);
  }
}

/**
 * Mengelola proses perubahan kata sandi siswa.
 */
export async function handleChangePassword(e) {
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
    // Hash the new password
    const hashedPassword = await hashString(newPassword);

    // Update the passwordHash in Firestore for the current student
    // Gunakan studentData.uid yang sudah dimuat dari onAuthStateChanged
    const studentDocRef = doc(db, "users", studentData.uid);
    await updateDoc(studentDocRef, {
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
