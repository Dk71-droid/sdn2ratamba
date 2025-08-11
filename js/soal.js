// js/soal.js
// Modul ini akan berisi logika untuk menggenerate dan mengelola soal literasi dan numerasi.
// Didesain agar modular dan tidak mengganggu fungsionalitas lain seperti dashboard.

import {
  db,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
} from "./firebase.js";
import { showMessage } from "./utils.js";
import {
  renderSoalView,
  teacherData,
  renderModals,
  switchView,
} from "./app.js"; // Import dari app.js
import { GEMINI_API_URL } from "./api.js";

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
        await new Promise((res) => setTimeout(res, delay * Math.pow(2, i)));
      } else {
        // Jika sudah mencapai batas retry, lempar error
        throw error;
      }
    }
  }
}

/**
 * Menentukan tipe soal harian (Literasi atau Numerasi) berdasarkan tanggal.
 * Ini adalah helper untuk tampilan admin aplikasi AI.
 * @param {string} dateString - Tanggal dalam format YYYY-MM-DD.
 * @returns {string} 'Literasi' atau 'Numerasi'.
 */
function getDailyExerciseTypeForAI(dateString) {
  const date = new Date(dateString);
  return date.getDate() % 2 === 0 ? "Literasi" : "Numerasi";
}

/**
 * Menggenerate dan menyimpan soal harian (Literasi atau Numerasi) menggunakan Gemini API.
 * Dapat dipicu secara manual oleh guru atau otomatis saat login.
 * @param {string} targetDate - Tanggal untuk soal yang akan digenerate (YYYY-MM-DD).
 * @param {string} exerciseType - Tipe soal yang akan digenerate ('Literasi' atau 'Numerasi').
 * @param {boolean} [isAutoGenerate=false] - True jika dipicu secara otomatis saat login.
 * @returns {Promise<boolean>} True jika berhasil generate/skip, false jika gagal atau dibatalkan.
 */
async function generateAndSaveDailyExercise(
  targetDate,
  exerciseType,
  isAutoGenerate = false
) {
  const messagePrefix = isAutoGenerate
    ? "Otomatis menggenerate"
    : "Sedang menggenerate";
  showMessage(
    "loading",
    `${messagePrefix} soal AI ${exerciseType} untuk ${targetDate}...`
  );

  const docRef = doc(db, "daily_ai_exercises", targetDate);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    if (isAutoGenerate) {
      showMessage(
        "info",
        `Soal ${
          docSnap.data().type
        } untuk ${targetDate} sudah ada. Tidak perlu menggenerate otomatis.`
      );
      return true; // Berhasil karena soal sudah ada
    } else {
      // Tampilkan konfirmasi untuk menimpa soal yang sudah ada
      const confirmOverwrite = await new Promise((resolve) => {
        // Gunakan renderModals dari app.js untuk menampilkan modal konfirmasi
        renderModals({
          showConfirmModal: true,
          confirmModalMessage: `Soal ${
            docSnap.data().type
          } untuk ${targetDate} sudah ada. Apakah Anda yakin ingin menimpa soal ini dengan soal ${exerciseType} baru?`,
          confirmModalAction: () => resolve(true),
          onCancel: () => resolve(false), // Tambahkan callback onCancel
        });
      });

      if (!confirmOverwrite) {
        showMessage("info", "Generate soal dibatalkan.");
        renderModals({ showConfirmModal: false }); // Sembunyikan modal
        return false; // Dibatalkan
      }
      renderModals({ showConfirmModal: false }); // Sembunyikan modal setelah konfirmasi
    }
  }

  let prompt = "";
  let responseSchema = {};

  if (exerciseType === "Literasi") {
    prompt = `Buatlah 1 bacaan pendek yang cocok untuk siswa SD kelas 5 (sekitar 150-200 kata) terdiri dari 3 paragraf. Gunakan bahasa yang sederhana dan mudah dipahami. Tema bacaan bisa berupa cerita fiksi, pengetahuan umum, atau deskripsi tentang sesuatu yang menarik bagi anak-anak.
              Setelah bacaan, buat 1 soal terbuka yang memantik pemikiran kritis dan meningkatkan pemahaman literasi siswa.
              Sertakan juga di akhir soal, "Minimal Kata Jawaban: [jumlah angka, misal 20]".

              Format respons harus JSON seperti ini:
              {
                "readingText": "Isi bacaan paragraf 1\\nIsi bacaan paragraf 2\\nIsi bacaan paragraf 3",
                "questions": [
                  {
                    "question": "Pertanyaan...",
                    "minWords": 20
                  }
                ]
              }
              Pastikan 'minWords' adalah angka integer.
              `;
    responseSchema = {
      type: "OBJECT",
      properties: {
        readingText: { type: "STRING" },
        questions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              question: { type: "STRING" },
              minWords: { type: "NUMBER" },
            },
            required: ["question", "minWords"],
          },
          minItems: 1,
          maxItems: 1,
        },
      },
      required: ["readingText", "questions"],
    };
  } else {
    // Numerasi: Minta soal dan jawaban akhir
    prompt = `Buatlah 1 soal cerita matematika untuk siswa SD kelas 3-4. Soal melibatkan operasi dasar (penjumlahan, pengurangan, perkalian, pembagian) dan sederhana. Setelah soal, berikan jawaban akhirnya dan penjelasan langkah-langkahnya.
              
              Format respons harus JSON seperti ini:
              {
                "questions": [
                  { "question": "Soal cerita..." }
                ],
                "answer": {
                  "finalAnswer": "Jawaban akhirnya (hanya angka atau teks final)",
                  "explanation": "Penjelasan langkah-langkah pengerjaan soal."
                }
              }
              `;
    responseSchema = {
      type: "OBJECT",
      properties: {
        questions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              question: { type: "STRING" },
            },
            required: ["question"],
          },
          minItems: 1,
          maxItems: 1,
        },
        answer: {
          type: "OBJECT",
          properties: {
            finalAnswer: { type: "STRING" },
            explanation: { type: "STRING" },
          },
          required: ["finalAnswer", "explanation"],
        },
      },
      required: ["questions", "answer"],
    };
  }

  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    };

    const response = await fetchWithExponentialBackoff(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0
    ) {
      const jsonText = result.candidates[0].content.parts[0].text;
      const parsedExercise = JSON.parse(jsonText);

      // Pastikan struktur data sesuai dengan schema yang diharapkan
      const readingText = parsedExercise.readingText || "";
      const questions = parsedExercise.questions || [];
      const answer = parsedExercise.answer || null; // Dapatkan jawaban akhir

      // Simpan soal ke Firestore. Gunakan setDoc dengan tanggal sebagai ID untuk menimpa jika sudah ada.
      await setDoc(doc(db, "daily_ai_exercises", targetDate), {
        date: targetDate,
        type: exerciseType,
        rawContent: jsonText, // Simpan respons JSON mentah untuk referensi
        readingText: readingText,
        questions: questions,
        answer: answer, // Simpan jawaban akhir untuk soal numerasi
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

// Fungsi generateFutureExercises dihapus
// /**
//  * Menggenerate soal untuk beberapa hari ke depan.
//  * @param {number} daysToGenerate - Jumlah hari untuk menggenerate soal (dimulai dari besok).
//  */
// async function generateFutureExercises(daysToGenerate) {
//   // ... (logic for future exercises - now removed)
// }

export { generateAndSaveDailyExercise, getDailyExerciseTypeForAI };
