// js/setting.js
// Modul ini akan berisi logika untuk mengelola profil guru dan logout.

import {
  auth,
  signOut,
  db,
  doc,
  updateDoc,
  serverTimestamp,
} from "./firebase.js";
import {
  showMessage,
  hashString,
  displayInlineError,
  clearInlineError,
  clearAllInlineErrors,
} from "./utils.js";
// Import teacherData from app.js as needed
// It's imported directly in the functions that need it to avoid circular dependencies
// and ensure they get the most up-to-date references from app.js's global scope.

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
  handleLogout,
  handleUpdateProfile,
  handleChangePassword,
  setupSettingListeners,
};
