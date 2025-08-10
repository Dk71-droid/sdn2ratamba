// soal_siswa.js (Auto-correct Numeracy)
// Modul ini menangani tampilan dan logika untuk siswa mengerjakan soal harian.

import { db, doc, setDoc, serverTimestamp, getDoc } from "./firebase.js";
import {
  showMessage,
  clearAllInlineErrors,
  displayInlineError,
} from "./utils.js";
import { studentData, switchView } from "./app_siswa.js"; // PERBAIKAN: Mengimpor switchView, bukan renderDashboardView
import { GEMINI_API_URL } from "./api.js";

// Variabel konfigurasi yang disediakan oleh lingkungan Canvas
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

// Fungsi untuk menangani percobaan ulang dengan exponential backoff
async function fetchWithBackoff(url, options, retries = 3, delay = 1000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
    console.log("Fetch successful.");
  } catch (error) {
    if (retries > 0) {
      console.warn(`Fetch failed, retrying in ${delay}ms...`);
      await new Promise((res) => setTimeout(res, delay));
      return fetchWithBackoff(url, options, retries - 1, delay * 2);
    } else {
      console.error(`Fetch failed after ${3} retries.`);
      throw error;
    }
  }
}

/**
 * Merender tampilan hasil setelah siswa mengirim jawaban.
 * @param {object} exerciseData - Data soal yang dikerjakan.
 * @param {object} submissionResult - Hasil dari pengiriman jawaban, bisa dari AI atau koreksi otomatis.
 */
function renderSubmissionResult(exerciseData, submissionResult) {
  const dailyExerciseContent = document.getElementById("dailyExerciseContent");
  if (!dailyExerciseContent) return;

  const combinedFeedback =
    submissionResult.combined_feedback ||
    "Tidak ada umpan balik yang tersedia.";

  dailyExerciseContent.innerHTML = `
    <div class="text-center py-8">
      <h3 class="text-xl font-bold text-green-700 mb-4">Halo ${
        studentData.name
      }, Anda Telah Menyelesaikan Latihan Ini Hari Ini!</h3>
      <p class="text-gray-700 mb-2">Jenis Latihan: <strong>${
        exerciseData.type
      }</strong></p>
      <p class="text-gray-700 mb-4">Tanggal Pengerjaan: <strong>${
        exerciseData.date
      }</strong></p>
      ${
        submissionResult.score !== undefined && submissionResult.score !== null
          ? `<p class="text-gray-700 mb-4">Skor Anda: <strong>${submissionResult.score}</strong></p>`
          : `<p class="text-gray-700 mb-4">Skor sedang dalam tinjauan guru.</p>`
      }
      <div class="bg-blue-50 p-4 rounded-lg text-left mt-4">
        <h4 class="font-semibold text-blue-800 mb-2">Umpan Balik:</h4>
        <p class="text-gray-800">${combinedFeedback.replace(/\n/g, "<br>")}</p>
      </div>
      <button id="backToDashboardBtn" class="btn-primary mt-6">Kembali ke Dashboard</button>
    </div>
  `;
  document
    .getElementById("backToDashboardBtn")
    ?.addEventListener("click", () => {
      switchView("dashboard"); // PERBAIKAN: Memanggil switchView dari app_siswa.js
    });
}

export async function renderSoalHarianView(dailyExercise, studentUid) {
  const dailyExerciseContent = document.getElementById("dailyExerciseContent");
  if (!dailyExerciseContent) return;

  if (!dailyExercise) {
    dailyExerciseContent.innerHTML = `
      <div class="text-center p-8">
        <h3 class="text-xl font-bold text-gray-700 mb-4">Tidak ada soal harian untuk hari ini.</h3>
        <p class="text-gray-500">Silakan cek kembali jadwal Anda atau kerjakan materi lain.</p>
        <button id="backToDashboardBtn" class="btn-primary mt-6">Kembali ke Dashboard</button>
      </div>
    `;
    document
      .getElementById("backToDashboardBtn")
      ?.addEventListener("click", () => {
        switchView("dashboard");
      });
    return;
  }

  const todayDate = new Date().toISOString().slice(0, 10);
  const historyDocRef = doc(
    db,
    "student_exercise_history",
    `${studentUid}_${dailyExercise.id}_${todayDate}`
  );
  const historySnap = await getDoc(historyDocRef);

  if (historySnap.exists()) {
    const historyData = historySnap.data();
    renderSubmissionResult(dailyExercise, {
      score: historyData.score,
      combined_feedback: historyData.combinedFeedback,
    });
    return;
  }

  let html = `
    <h3 class="text-xl font-bold text-blue-700 mb-4">Soal Latihan ${dailyExercise.type}</h3>
    <p class="text-gray-600 mb-6">Tanggal: ${dailyExercise.date}</p>
    <form id="exerciseForm" class="space-y-4">
  `;

  dailyExercise.questions.forEach((q, i) => {
    html += `
      <div class="form-group">
        <label for="question${i}" class="block text-sm font-medium text-gray-700 mb-1">
          Soal ${i + 1}: ${q.question}
          ${
            q.minWords
              ? `<span class="text-xs text-gray-500">(Min. ${q.minWords} kata)</span>`
              : ""
          }
        </label>
        <textarea id="question${i}" class="w-full p-2 border border-gray-300 rounded-md" rows="4" required></textarea>
        <div id="question${i}-error" class="input-error-message hidden"></div>
      </div>
    `;
  });

  html += `<button type="submit" class="btn-primary w-full">Kirim Jawaban</button></form>`;

  dailyExerciseContent.innerHTML = html;

  document
    .getElementById("exerciseForm")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAllInlineErrors(e.target);
      await handleSubmitExercise(dailyExercise, studentUid);
    });
}

async function handleSubmitExercise(exerciseData, studentUid) {
  showMessage("loading", "Mengirim jawaban dan memproses...");

  const answers = [];
  let isValid = true;

  for (let i = 0; i < exerciseData.questions.length; i++) {
    const el = document.getElementById(`question${i}`);
    const val = el?.value.trim() ?? "";
    if (!val) {
      displayInlineError(`question${i}`, "Jawaban tidak boleh kosong.");
      isValid = false;
    } else if (exerciseData.questions[i].minWords) {
      const count = val.split(/\s+/).filter((w) => w.length).length;
      if (count < exerciseData.questions[i].minWords) {
        displayInlineError(
          `question${i}`,
          `Jawaban minimal ${exerciseData.questions[i].minWords} kata.`
        );
        isValid = false;
      }
    }
    answers.push({ question: exerciseData.questions[i].question, answer: val });
  }

  if (!isValid) return showMessage("error", "Mohon perbaiki jawaban Anda.");

  let submissionResult = {};

  try {
    if (exerciseData.type === "Numerasi" && exerciseData.answer) {
      // Logic untuk soal Numerasi: auto-correct menggunakan jawaban yang sudah disimpan.
      const studentAnswer = answers[0].answer.trim();
      const correctAnswer = exerciseData.answer.finalAnswer.trim();
      const explanation = exerciseData.answer.explanation;

      // Koreksi mutlak: 100 jika benar, 0 jika salah.
      const isCorrect =
        studentAnswer.toLowerCase() === correctAnswer.toLowerCase();
      submissionResult.score = isCorrect ? 100 : 0;
      submissionResult.combined_feedback = isCorrect
        ? `Kerja bagus, ${studentData.name}! Jawabanmu benar. Skor: 100.
           ${explanation}`
        : `Halo ${studentData.name}, jawabanmu masih kurang tepat.
           Jawaban yang benar adalah: ${correctAnswer}.
           ${explanation}`;
    } else {
      // Logic untuk soal Literasi: kirim ke AI untuk penilaian.
      const prompt = `Evaluasi jawaban siswa ${
        studentData.name
      } untuk soal berikut. Beri skor 0-100.
      Berikan umpan balik yang singkat dan langsung, menggabungkan motivasi dan koreksi.
      
      Data Latihan:
      ${
        exerciseData.readingText
          ? `Bacaan: ${exerciseData.readingText}\n\n`
          : ""
      }
      Soal: ${answers[0].question}
      Jawaban: ${answers[0].answer}
      
      Format JSON:
      {
        "score": (nilai dari 0-100),
        "combined_feedback": "(Umpan balik yang singkat dan langsung, mencakup nama siswa, koreksi, dan motivasi)."
      }`;

      const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              score: { type: "NUMBER" },
              combined_feedback: { type: "STRING" },
            },
          },
        },
      };

      const response = await fetchWithBackoff(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      const aiText = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      if (!aiText) {
        console.warn("Respons AI kosong. Menggunakan fallback.");
        submissionResult = {
          score: null,
          combined_feedback: `Halo ${studentData.name}, jawabanmu sedang ditinjau oleh guru. Tetap semangat ya!`,
        };
      } else {
        try {
          submissionResult = JSON.parse(aiText);
        } catch (err) {
          console.warn("Respons AI bukan JSON valid:\n", aiText);
          submissionResult = {
            score: null,
            combined_feedback: `Maaf ${studentData.name}, saran tidak tersedia karena ada masalah. Coba lagi nanti ya!`,
          };
        }
      }
    }

    // Tampilkan hasil secara instan ke pengguna sebelum menyimpan ke Firestore
    renderSubmissionResult(exerciseData, submissionResult);
    showMessage("success", "Jawaban Anda berhasil dikirim!");

    // Simpan data ke Firestore di latar belakang
    const historyDocId = `${studentUid}_${exerciseData.id}_${new Date()
      .toISOString()
      .slice(0, 10)}`;
    await setDoc(doc(db, "student_exercise_history", historyDocId), {
      studentId: studentUid,
      exerciseId: exerciseData.id,
      exerciseDate: exerciseData.date,
      submissionDate: new Date().toISOString().slice(0, 10),
      exerciseType: exerciseData.type,
      answers,
      score: submissionResult.score ?? null,
      combinedFeedback:
        submissionResult.combined_feedback ??
        "Tidak ada umpan balik yang tersedia.",
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error submitting exercise:", err);
    showMessage("error", `Gagal mengirim jawaban: ${err.message}`);
  }
}
