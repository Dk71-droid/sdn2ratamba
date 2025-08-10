// js/daily_exercise_manager.js
// Modul untuk mengelola logika generate soal latihan harian (Literasi/Numerasi)
// Modul ini dapat digunakan oleh sisi guru maupun sisi siswa untuk memastikan soal harian selalu tersedia.

import { db, doc, setDoc, serverTimestamp } from "./firebase.js";
import { showMessage } from "./utils.js"; // Digunakan untuk menampilkan pesan notifikasi
import { GEMINI_API_URL } from "./api.js"; // Mengimpor URL API Gemini dari file api.js

/**
 * Fungsi untuk mengimplementasikan exponential backoff untuk panggilan API.
 * Berguna untuk menangani potensi throttling atau masalah jaringan sementara.
 * @param {string} url - URL API yang akan dipanggil.
 * @param {Object} options - Opsi untuk fetch API (method, headers, body, dll.).
 * @param {number} retries - Jumlah percobaan ulang maksimum.
 * @param {number} delay - Penundaan awal dalam milidetik sebelum percobaan ulang.
 * @returns {Promise<Response>} Respons dari fetch API.
 * @throws {Error} Jika semua percobaan ulang gagal.
 */
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
        // Logika retry: tunggu sebentar sebelum mencoba lagi dengan penundaan eksponensial
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
 * Digunakan untuk memastikan variasi soal setiap hari.
 * @param {string} dateString - Tanggal dalam format YYYY-MM-DD.
 * @returns {string} 'Literasi' jika tanggal genap, 'Numerasi' jika tanggal ganjil.
 */
function getDailyExerciseTypeForAI(dateString) {
  const date = new Date(dateString);
  return date.getDate() % 2 === 0 ? "Literasi" : "Numerasi";
}

/**
 * Menggenerate dan menyimpan soal harian (Literasi atau Numerasi) menggunakan Gemini API.
 * Fungsi ini dapat dipanggil oleh guru atau siswa (secara otomatis di latar belakang).
 * @param {string} targetDate - Tanggal untuk soal yang akan digenerate (YYYY-MM-DD).
 * @param {string} exerciseType - Tipe soal yang akan digenerate ('Literasi' atau 'Numerasi').
 * @param {string} generatedByUid - UID pengguna yang menggenerate (guru/siswa/sistem).
 * @param {string} generatedByName - Nama pengguna yang menggenerate.
 * @returns {Promise<boolean>} True jika berhasil generate, false jika gagal.
 */
async function generateAndSaveDailyExercise(
  targetDate,
  exerciseType,
  generatedByUid = "system", // Default ke 'system' jika tidak disediakan
  generatedByName = "System AI" // Default ke 'System AI' jika tidak disediakan
) {
  let prompt = "";
  let responseSchema = {};

  if (exerciseType === "Literasi") {
    // Prompt untuk generate soal Literasi
    prompt = `Buatlah 1 bacaan pendek yang cocok untuk siswa SD kelas 5 (sekitar 150-200 kata) terdiri dari 3 paragraf. Gunakan bahasa yang sederhana dan mudah dipahami. Tema bacaan bisa berupa cerita fiksi, pengetahuan umum, atau deskripsi tentang sesuatu yang menarik bagi anak-anak.
              Setelah bacaan, buat 3 soal terbuka yang memantik pemikiran kritis dan meningkatkan pemahaman literasi siswa.
              - Soal 1: Mudah (pertanyaan langsung dari teks)
              - Soal 2: Sedang (membutuhkan sedikit penalaran atau inferensi)
              - Soal 3: Sulit (membutuhkan pemikiran mendalam, analisis, atau menghubungkan ide)
              Sertakan juga di akhir setiap setiap soal, "Minimal Kata Jawaban: [jumlah angka, misal 15]".

              Format respons harus JSON seperti ini:
              {
                "readingText": "Isi bacaan paragraf 1\\nIsi bacaan paragraf 2\\nIsi bacaan paragraf 3",
                "questions": [
                  {
                    "question": "Pertanyaan mudah...",
                    "minWords": 15
                  },
                  {
                    "question": "Pertanyaan sedang...",
                    "minWords": 20
                  },
                  {
                    "question": "Pertanyaan sulit...",
                    "minWords": 25
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
        },
      },
      required: ["readingText", "questions"],
    };
  } else {
    // Prompt untuk generate soal Numerasi
    prompt = `Buatlah 5 soal cerita matematika untuk siswa SD kelas 3-4. Soal melibatkan operasi dasar (penjumlahan, pengurangan, perkalian, pembagian) dan sederhana. Jangan berikan jawaban atau penjelasan.

              Format respons harus JSON seperti ini:
              {
                "questions": [
                  { "question": "Soal cerita 1..." },
                  { "question": "Soal cerita 2..." },
                  { "question": "Soal cerita 3..." },
                  { "question": "Soal cerita 4..." },
                  { "question": "Soal cerita 5..." }
                ]
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
        },
      },
      required: ["questions"],
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

      const readingText = parsedExercise.readingText || "";
      const questions = parsedExercise.questions || [];

      // Simpan soal ke Firestore. Gunakan setDoc dengan tanggal sebagai ID untuk menimpa jika sudah ada.
      await setDoc(doc(db, "daily_ai_exercises", targetDate), {
        date: targetDate,
        type: exerciseType,
        rawContent: jsonText, // Simpan respons JSON mentah untuk referensi
        readingText: readingText,
        questions: questions,
        generatedBy: generatedByUid, // Menggunakan UID yang disediakan
        generatedByName: generatedByName, // Menggunakan nama yang disediakan
        timestamp: serverTimestamp(),
      });

      // showMessage hanya dipanggil jika bukan auto-generate di latar belakang
      // atau jika ada di halaman yang relevan
      // showMessage(
      //   "success",
      //   `Soal ${exerciseType} untuk ${targetDate} berhasil digenerate dan disimpan!`
      // );
      return true;
    } else {
      throw new Error("Respons API tidak valid atau tidak ada kandidat.");
    }
  } catch (error) {
    console.error("Error generating and saving daily exercise:", error);
    // showMessage("error", `Gagal generate soal AI: ${error.message}`); // Hindari showMessage di latar belakang
    return false;
  }
}

export { generateAndSaveDailyExercise, getDailyExerciseTypeForAI };
