// js/materi_interaktif.js

import { showMessage } from "../utils.js";
import { db, doc, setDoc, serverTimestamp, getDoc } from "../firebase.js";
import { studentData } from "../app_siswa.js";
import { GEMINI_API_URL } from "../api.js"; // NEW: Import from api.js

/**
 * Menangani pengiriman jawaban diskusi dan evaluasi AI.
 * @param {string} materialId - ID materi.
 * @param {number} sectionIndex - Indeks bagian materi.
 * @param {string} studentAnswer - Jawaban siswa.
 * @param {string} discussionQuestion - Pertanyaan diskusi.
 * @param {string} readingText - Teks bacaan terkait bagian ini (untuk konteks AI).
 * @param {HTMLElement} submitButton - Tombol "Simpan Jawaban".
 * @param {HTMLElement} answerTextarea - Area teks jawaban siswa.
 * @param {HTMLElement} feedbackContainer - Kontainer untuk menampilkan feedback AI.
 */
export async function handleDiscussionSubmit(
  materialId,
  sectionIndex,
  studentAnswer,
  discussionQuestion,
  readingText,
  submitButton,
  answerTextarea,
  feedbackContainer
) {
  if (!studentAnswer.trim()) {
    showMessage("error", "Jawaban diskusi tidak boleh kosong.");
    return;
  }

  if (!studentData?.uid) {
    showMessage(
      "error",
      "Data siswa tidak ditemukan. Silakan coba login ulang."
    );
    return;
  }

  // Tampilkan loading
  submitButton.innerText = "Mengirim...";
  submitButton.disabled = true;
  submitButton.classList.remove("bg-yellow-600", "hover:bg-yellow-700");
  submitButton.classList.add("bg-gray-400", "cursor-not-allowed");

  try {
    // Prompt untuk AI Gemini
    const prompt = `
            Anda adalah seorang mentor AI yang ramah, sabar, dan sangat suportif untuk siswa SD.
            Tugas Anda adalah mengevaluasi jawaban siswa terhadap sebuah pertanyaan diskusi berdasarkan teks bacaan yang diberikan.
            Berikan feedback yang positif dan membangun.
            Jika ada hal yang bisa ditingkatkan dari jawaban siswa, sebutkan dengan bahasa yang mudah dimengerti anak SD.
            Berikan juga contoh jawaban yang lebih lengkap atau ideal, tapi tetap sederhana.
            Berikan skor dari 1 hingga 5.

            PENTING: Jika jawaban siswa memberikan informasi yang benar dan relevan melebihi ekspektasi (misalnya, diminta 2 contoh tapi siswa memberi 3 contoh yang benar), berikan skor penuh (5/5) dan pujian atas inisiatifnya. Fokus pada kebenaran dan relevansi, bukan hanya kuantitas minimal yang diminta.

            ---
            Teks Bacaan Terkait:
            "${readingText}"

            Pertanyaan Diskusi:
            "${discussionQuestion}"

            Jawaban Siswa:
            "${studentAnswer}"

            Berikan respons Anda dalam format JSON berikut:
            {
              "feedback": "Feedback positif dan semangat untuk siswa...",
              "things_to_improve": "Hal yang bisa ditingkatkan dari jawabanmu...",
              "ideal_answer_example": "Contoh jawaban yang lebih lengkap atau ide yang bagus...",
              "score": [1-5]
            }
        `;

    const response = await fetch(GEMINI_API_URL, {
      // Use GEMINI_API_URL from api.js
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json", // Meminta respons dalam format JSON
        },
      }),
    });

    const result = await response.json();
    let aiFeedback = "Gagal mendapatkan feedback dari AI.";
    let thingsToImprove = "Tidak ada hal yang perlu ditingkatkan.";
    let idealAnswerExample = "Tidak ada contoh jawaban ideal.";
    let score = null;

    // Pastikan respons valid dan parse JSON
    if (
      result.candidates &&
      result.candidates[0] &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts[0].text
    ) {
      try {
        const aiResponseText =
          result.candidates[0].content.parts[0].text.replace(
            /```json\n|\n```/g,
            ""
          ); // Hapus markdown code block jika ada
        const jsonResponse = JSON.parse(aiResponseText);
        aiFeedback = jsonResponse.feedback || aiFeedback;
        thingsToImprove = jsonResponse.things_to_improve || thingsToImprove;
        idealAnswerExample =
          jsonResponse.ideal_answer_example || idealAnswerExample;
        score = jsonResponse.score !== undefined ? jsonResponse.score : score;
      } catch (jsonError) {
        console.error("Error parsing AI response JSON:", jsonError);
        aiFeedback = "Gagal memproses feedback AI. Format respons tidak valid.";
        // Fallback to raw text if JSON parsing fails
        if (result.candidates[0].content.parts[0].text) {
          aiFeedback += ` Respons mentah: ${result.candidates[0].content.parts[0].text.substring(
            0,
            100
          )}...`;
        }
      }
    } else if (result.error) {
      console.error("AI API returned an error:", result.error);
      aiFeedback = `Error dari AI: ${
        result.error.message || "Terjadi kesalahan tidak dikenal."
      }`;
    } else {
      console.warn("Invalid AI response structure:", result);
      aiFeedback =
        "Gagal mendapatkan feedback dari AI. Struktur respons tidak terduga.";
    }

    // Simpan jawaban dan feedback ke Firestore
    const submissionId = `${materialId}_${sectionIndex}_${studentData.uid}`;
    const submissionRef = doc(
      db,
      "student_discussion_submissions",
      submissionId
    );

    await setDoc(submissionRef, {
      materialId: materialId,
      sectionIndex: sectionIndex,
      studentId: studentData.uid,
      studentName: studentData.name,
      question: discussionQuestion,
      answer: studentAnswer,
      aiFeedback: aiFeedback,
      thingsToImprove: thingsToImprove, // Simpan detail yang bisa ditingkatkan
      idealAnswerExample: idealAnswerExample, // Simpan contoh jawaban ideal
      score: score,
      timestamp: serverTimestamp(),
    });

    // Tampilkan feedback di UI
    feedbackContainer.innerHTML = `
            <div class="mt-4 p-4 rounded-xl ${
              score >= 3
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }">
                <h5 class="font-bold text-lg ${
                  score >= 3 ? "text-green-800" : "text-red-800"
                }">Feedback dari AI:</h5>
                <p class="text-gray-700 text-sm mt-2">${aiFeedback}</p>
                ${
                  score !== null
                    ? `<p class="text-sm font-semibold ${
                        score >= 3 ? "text-green-700" : "text-red-700"
                      } mt-2">Skor: ${score}/5</p>`
                    : ""
                }
                <div class="mt-3 pt-3 border-t border-gray-200">
                    <h5 class="font-bold text-gray-800">Hal yang Bisa Ditingkatkan:</h5>
                    <p class="text-gray-700 text-sm mt-1">${thingsToImprove}</p>
                    <h5 class="font-bold text-gray-800 mt-3">Contoh Jawaban Ideal:</h5>
                    <p class="text-gray-700 text-sm mt-1">${idealAnswerExample}</p>
                </div>
            </div>
        `;

    showMessage("success", "Jawaban Anda berhasil dikirim dan dievaluasi!");
    answerTextarea.disabled = true; // Kunci textarea setelah dikirim
  } catch (error) {
    console.error("Error submitting discussion answer:", error);
    showMessage("error", `Gagal mengirim jawaban: ${error.message}`);
  } finally {
    submitButton.innerText = "Simpan Jawaban";
    submitButton.disabled = false;
    submitButton.classList.remove("bg-gray-400", "cursor-not-allowed");
    submitButton.classList.add("bg-yellow-600", "hover:bg-yellow-700");
  }
}

/**
 * Menangani pengiriman jawaban kuis dan validasi.
 * @param {string} materialId - ID materi.
 * @param {number} sectionIndex - Indeks bagian materi.
 * @param {string} selectedOption - Opsi yang dipilih siswa.
 * @param {string} correctAnswer - Jawaban yang benar.
 * @param {HTMLElement} quizForm - Formulir kuis.
 * @param {HTMLElement} submitButton - Tombol "Kirim Jawaban".
 */
export async function handleQuizSubmit(
  materialId,
  sectionIndex,
  selectedOption,
  correctAnswer,
  quizForm,
  submitButton
) {
  if (!selectedOption) {
    showMessage("error", "Pilih salah satu jawaban terlebih dahulu.");
    return;
  }

  if (!studentData?.uid) {
    showMessage(
      "error",
      "Data siswa tidak ditemukan. Silakan coba login ulang."
    );
    return;
  }

  // Dapatkan semua input radio
  const radioInputs = quizForm.querySelectorAll('input[type="radio"]');

  // Tentukan apakah jawaban benar (gunakan trim untuk perbandingan yang lebih kuat)
  const isCorrect = selectedOption.trim() === correctAnswer.trim();
  const feedbackMessage = isCorrect
    ? "Jawaban Anda benar! 🎉"
    : "Jawaban Anda salah. Jawaban yang benar adalah: " + correctAnswer + ".";

  // Hapus feedback sebelumnya jika ada
  const existingFeedback = quizForm.querySelector(".quiz-feedback-message");
  if (existingFeedback) {
    existingFeedback.remove();
  }

  // Tampilkan feedback di UI
  const feedbackElement = document.createElement("p");
  feedbackElement.className = `quiz-feedback-message text-sm font-semibold mt-2 ${
    isCorrect ? "text-green-600" : "text-red-600"
  }`;
  feedbackElement.innerText = feedbackMessage;
  quizForm.appendChild(feedbackElement);

  // Tandai jawaban yang benar dan salah
  radioInputs.forEach((input) => {
    input.disabled = true; // Nonaktifkan semua radio button setelah submit
    const parentLabel = input.closest("label");
    parentLabel.classList.remove(
      "bg-blue-100",
      "border-blue-200",
      "hover:bg-blue-100"
    ); // Hapus hover/default style
    if (input.value.trim() === correctAnswer.trim()) {
      parentLabel.classList.add(
        "bg-green-100",
        "border-green-400",
        "font-bold"
      );
    } else if (input.checked && !isCorrect) {
      parentLabel.classList.add("bg-red-100", "border-red-400", "line-through");
    }
  });

  submitButton.disabled = true;
  submitButton.innerText = "Jawaban Terkirim";
  submitButton.classList.remove("bg-blue-600", "hover:bg-blue-700");
  submitButton.classList.add("bg-gray-400", "cursor-not-allowed");

  showMessage(isCorrect ? "success" : "warning", feedbackMessage);

  // Simpan hasil kuis ke Firestore
  const submissionRef = doc(
    db,
    "student_quiz_submissions",
    `${materialId}_${sectionIndex}_${studentData.uid}`
  );
  await setDoc(
    submissionRef,
    {
      materialId: materialId,
      sectionIndex: sectionIndex,
      studentId: studentData.uid,
      studentName: studentData.name,
      question: quizForm.previousElementSibling.innerText, // Ambil teks pertanyaan dari elemen <p> sebelumnya
      selectedAnswer: selectedOption,
      correctAnswer: correctAnswer, // Simpan jawaban yang benar juga
      isCorrect: isCorrect,
      timestamp: serverTimestamp(),
    },
    { merge: true }
  );
}
