// js/materi_diskusi.js
// Modul ini khusus untuk rendering model pembelajaran "Eksplorasi Konsep & Diskusi Esai"
// Logika interaktif untuk diskusi dan kuis kini ditangani langsung di sini.

import { showMessage } from "../utils.js";
import {
  getChapterProgress,
  saveChapterProgress,
  renderMateriView,
} from "../materi_siswa.js";
import {
  db,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "../firebase.js";
import { studentData } from "../app_siswa.js";
import { GEMINI_API_URL } from "../api.js";

/**
 * Mendapatkan semua data kiriman bab untuk materi tertentu dan siswa.
 * @param {string} materialId - ID materi saat ini.
 * @param {string} studentUid - UID siswa yang sedang login.
 * @returns {Promise<Array<Object>>} - Promise yang me-resolve dengan array data kiriman.
 */
async function getStudentSubmissionsForMaterial(materialId, studentUid) {
  if (!studentUid) {
    return [];
  }
  try {
    const q = query(
      collection(db, "student_chapter_submissions"),
      where("materialId", "==", materialId),
      where("studentUid", "==", studentUid)
    );
    const querySnapshot = await getDocs(q);
    const submissions = [];
    querySnapshot.forEach((doc) => {
      submissions.push(doc.data());
    });
    return submissions;
  } catch (error) {
    console.error("Gagal mengambil progres dari Firestore:", error);
    return [];
  }
}

/**
 * Merender tampilan detail materi dengan daftar bab.
 * @param {object} materialData - Objek materi yang dipilih.
 * @param {array} materials - Array semua materi (untuk navigasi kembali).
 */
export async function renderDiskusi(materialData, materials) {
  const materialDetailContent = document.getElementById(
    "materialDetailContent"
  );
  if (!materialDetailContent) return;

  const submissions = await getStudentSubmissionsForMaterial(
    materialData.id,
    studentData?.uid
  );
  const progress = submissions.length > 0 ? submissions.length : 0;

  let totalScore = 0;
  let submissionCount = 0;
  submissions.forEach((submission) => {
    if (typeof submission.combinedScore === "number") {
      totalScore += submission.combinedScore;
      submissionCount++;
    }
  });
  const averageScore =
    submissionCount > 0 ? Math.round(totalScore / submissionCount) : null;

  let chaptersListHtml = `
    <div class="mb-3">
      <button id="backToMaterialsListBtn" class="flex items-center text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200">
        <i class="fas fa-arrow-left mr-2"></i> Kembali ke Daftar Materi
      </button>
    </div>

    <h2 class="text-xl md:text-2xl font-extrabold text-blue-900 mb-6 text-center">
      ${materialData.title || "Judul Tidak Tersedia"}
    </h2>

    ${
      averageScore !== null
        ? `
    <div class="bg-blue-100 text-blue-900 rounded-xl p-4 md:p-6 mb-6 text-center shadow-md">
      <p class="text-sm font-semibold">Nilai Rata-Rata Kamu</p>
      <p class="text-4xl md:text-5xl font-extrabold mt-1">${averageScore}</p>
    </div>
    `
        : ""
    }

  `;

  chaptersListHtml += `
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg md:text-xl font-bold text-gray-800 flex-grow text-center">Daftar Bab</h3>
    </div>
    <div class="space-y-3">
  `;

  materialData.lessonData.sections.forEach((section, index) => {
    const isCompleted = index < progress;
    const isNextChapter = index === progress;
    const isLocked = index > progress;
    const chapterStatusText = isCompleted
      ? "Selesai"
      : isNextChapter
      ? "Saat Ini"
      : "Terkunci";
    const chapterStatusIcon = isCompleted ? "✅" : isNextChapter ? "▶️" : "🔒";

    chaptersListHtml += `
      <div class="card p-4 rounded-2xl shadow-md transition-all duration-300 ${
        isLocked
          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
          : "bg-white hover:bg-blue-50 cursor-pointer"
      } chapter-card" data-chapter-index="${index}" ${
      isLocked ? "disabled" : ""
    }>
        <div class="flex items-center justify-between">
          <div class="flex-grow flex items-center">
            <span class="text-xl mr-3">${chapterStatusIcon}</span>
            <h4 class="text-xs md:text-sm font-bold chapter-title">${
              section.title || "Bab Tanpa Judul"
            }</h4>
          </div>
          <span class="text-xs font-semibold text-white px-2 py-1 rounded-full ${
            isCompleted
              ? "bg-green-500"
              : isNextChapter
              ? "bg-blue-500"
              : "bg-gray-400"
          }">
            ${chapterStatusText}
          </span>
        </div>
      </div>
    `;
  });

  chaptersListHtml += `</div>`;
  materialDetailContent.innerHTML = chaptersListHtml;

  document
    .getElementById("backToMaterialsListBtn")
    .addEventListener("click", () => {
      renderMateriView(materials);
    });

  document.querySelectorAll(".chapter-card").forEach((card) => {
    if (!card.hasAttribute("disabled")) {
      card.addEventListener("click", () => {
        const chapterIndex = parseInt(card.dataset.chapterIndex);
        renderChapterContent(materialData, chapterIndex, materials);
      });
    }
  });

  const chapterTitleElements = document.querySelectorAll(".chapter-title");
  let currentChapterTitleFontSize = 14;

  chapterTitleElements.forEach(
    (el) => (el.style.fontSize = `${currentChapterTitleFontSize}px`)
  );
}

/**
 * Merender konten dari satu bab tunggal.
 * @param {object} materialData - Objek materi lengkap.
 * @param {number} chapterIndex - Indeks bab yang akan ditampilkan.
 * @param {array} materials - Array semua materi (untuk navigasi kembali).
 * @param {object|null} existingSubmissionData - Data pengiriman yang sudah ada (opsional).
 */
async function renderChapterContent(
  materialData,
  chapterIndex,
  materials,
  existingSubmissionData = null
) {
  const materialDetailContent = document.getElementById(
    "materialDetailContent"
  );
  const section = materialData.lessonData.sections[chapterIndex];

  if (!section) {
    materialDetailContent.innerHTML = `<p class="text-center text-gray-500 py-8">Bab tidak ditemukan.</p>`;
    return;
  }

  let submissionData = existingSubmissionData;
  if (!submissionData && studentData?.uid) {
    const submissionRef = doc(
      db,
      "student_chapter_submissions",
      `${materialData.id}_${chapterIndex}_${studentData.uid}`
    );
    try {
      const submissionDoc = await getDoc(submissionRef);
      if (submissionDoc.exists()) {
        submissionData = submissionDoc.data();
      }
    } catch (error) {
      console.error("Gagal mengambil data progres: ", error);
    }
  }

  const hasDiscussion = !!section.discussionQuestion;
  const hasQuiz = !!section.quizQuestion;

  let chapterHtml = `
    <div class="py-2 px-4 md:p-4 flex items-center justify-between transition-shadow duration-300">
      <button id="backToChapterListBtn" class="flex items-center text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200">
        <i class="fas fa-arrow-left mr-2"></i> Kembali ke Bab
      </button>
      <div class="flex items-center space-x-2">
        <button id="decreaseFontBtn" class="text-slate-500 hover:text-slate-700 transition duration-200 text-xl" title="Perkecil Font">
          <i class="fas fa-minus-circle"></i>
        </button>
        <button id="increaseFontBtn" class="text-slate-500 hover:text-slate-700 transition duration-200 text-xl" title="Perbesar Font">
          <i class="fas fa-plus-circle"></i>
        </button>
      </div>
    </div>
    <div class="overflow-y-auto pb-12 pt-2">
      <div class="p-4 sm:p-5 bg-white rounded-2xl shadow-lg border-t-4 border-sky-500">
        <div class="mb-4 text-center">
          <h3 class="text-xl md:text-2xl font-extrabold text-slate-800">
            ${section.title || "Bab Tanpa Judul"}
          </h3>
        </div>
  `;

  if (submissionData) {
    chapterHtml += `
      <div class="bg-blue-50 rounded-xl p-4 md:p-6 mb-6 text-center shadow-inner border-l-4 border-blue-500">
        <p class="text-xl md:text-2xl font-bold text-blue-800">Skor Anda:</p>
        <p class="text-5xl md:text-6xl font-extrabold text-blue-600">${submissionData.combinedScore}</p>
      </div>
    `;
  }

  chapterHtml += `
        <div id="explanationText" class="text-gray-800 leading-relaxed mb-6 text-left">
          ${
            section.explanation || "Penjelasan untuk bagian ini tidak tersedia."
          }
        </div>
      </div>
  `;

  if (hasDiscussion) {
    chapterHtml += `
      <div class="p-4 sm:p-5 bg-yellow-50 rounded-xl border-l-4 border-yellow-500 mt-6 shadow-md" id="discussionContainer">
        <h4 class="font-bold text-yellow-800 flex items-center mb-2">
          <i class="fas fa-lightbulb text-xl mr-2"></i> Diskusi
        </h4>
        <p class="text-yellow-700 italic text-sm mb-3">${
          section.discussionQuestion
        }</p>
        ${
          submissionData
            ? `
          <div class="mb-4">
            <p class="font-semibold text-yellow-800">Jawaban Anda:</p>
            <p class="p-2 text-sm bg-yellow-100 rounded-md whitespace-pre-wrap">${
              submissionData.studentDiscussionAnswer
            }</p>
          </div>
          <div>
            <p class="font-semibold text-yellow-800">Kunci Jawaban:</p>
            <p class="p-2 text-sm bg-yellow-100 rounded-md whitespace-pre-wrap">${
              submissionData.discussionExampleAnswer ||
              "Kunci jawaban tidak tersedia."
            }</p>
          </div>
          ${
            submissionData.discussionFeedback
              ? `
            <div class="mt-4">
              <p class="font-semibold text-yellow-800">Umpan Balik AI:</p>
              <p class="p-2 text-sm bg-yellow-100 rounded-md whitespace-pre-wrap">${submissionData.discussionFeedback}</p>
            </div>
          `
              : ""
          }
        `
            : `
          <textarea id="discussion-answer-${chapterIndex}" class="w-full p-2 rounded-md border border-yellow-300 text-gray-700 text-sm" rows="3" placeholder="Tulis jawabanmu di sini..."></textarea>
          <div id="discussion-feedback-${chapterIndex}" class="mt-3 text-sm"></div>
        `
        }
      </div>
    `;
  }

  if (hasQuiz) {
    chapterHtml += `
      <div class="p-4 sm:p-5 bg-green-50 rounded-xl border-l-4 border-green-500 mt-6 shadow-md" id="quizContainer">
        <h4 class="font-bold text-green-800 flex items-center mb-2">
          <i class="fas fa-question-circle text-xl mr-2"></i> Kuis
        </h4>
        <p class="text-green-700 font-medium text-sm mb-3">${
          section.quizQuestion
        }</p>
        <form id="quiz-form-${chapterIndex}" class="flex flex-col space-y-2">
          ${section.quizOptions
            .map((option, optIndex) => {
              const isCorrect =
                option.trim() === section.quizCorrectAnswer.trim();
              const isStudentAnswer =
                submissionData &&
                option.trim() === submissionData.studentQuizAnswer.trim();
              let optionClass = "";
              let optionIcon = "";
              if (submissionData) {
                if (isCorrect) {
                  optionClass = "bg-green-100 border-green-400 font-bold";
                  optionIcon = `<i class="fas fa-check-circle text-green-600 ml-auto"></i>`;
                } else if (isStudentAnswer) {
                  optionClass = "bg-red-100 border-red-400 line-through";
                  optionIcon = `<i class="fas fa-times-circle text-red-600 ml-auto"></i>`;
                } else {
                  optionClass = "bg-gray-100 border-gray-300 text-gray-500";
                }
              } else {
                optionClass = "bg-white hover:bg-green-100";
              }

              return `
                <label class="flex items-center cursor-pointer p-2 rounded-md transition duration-200 border ${optionClass}">
                  <input type="radio" name="quiz-q-${chapterIndex}" value="${option}" class="mr-2" ${
                submissionData ? "disabled" : ""
              } ${isStudentAnswer ? "checked" : ""} />
                  <span class="text-slate-700">${String.fromCharCode(
                    65 + optIndex
                  )}. ${option}</span>
                  ${optionIcon}
                </label>
              `;
            })
            .join("")}
        </form>
        <div id="quiz-feedback-${chapterIndex}" class="mt-3 text-sm"></div>
        ${
          submissionData
            ? `
          <div class="mt-4">
            <p class="font-semibold text-green-800">Jawaban yang Benar:</p>
            <p class="p-2 text-sm bg-green-100 rounded-md whitespace-pre-wrap">${
              submissionData.quizCorrectAnswer ||
              "Jawaban benar tidak tersedia."
            }</p>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  chapterHtml += `
    <div class="mt-6 text-right">
  `;

  if (submissionData) {
    chapterHtml += `
      <button id="returnToChapterListBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition duration-300">
        <i class="fas fa-arrow-left mr-2"></i> Kembali ke Bab
      </button>
    `;
  } else if (hasDiscussion || hasQuiz) {
    chapterHtml += `
      <button id="submitAllBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition duration-300">
        <i class="fas fa-paper-plane mr-2"></i> Kirim Jawaban
      </button>
    `;
  }

  chapterHtml += `
    </div>
  </div>`;

  materialDetailContent.innerHTML = chapterHtml;

  let feedbackModal = document.getElementById("feedbackModal");
  let modalContentContainer = document.getElementById("modalContentContainer");
  let modalContent = document.getElementById("modalContent");
  let closeModalBtn;

  if (!feedbackModal) {
    feedbackModal = document.createElement("div");
    feedbackModal.id = "feedbackModal";
    feedbackModal.className =
      "fixed inset-0 z-[100] flex items-center justify-center bg-gray-900 bg-opacity-50 hidden transition-opacity duration-300";
    feedbackModal.innerHTML = `
      <div id="modalContentContainer" class="bg-white rounded-2xl shadow-xl w-11/12 md:w-3/4 lg:w-1/2 p-6 m-4 transform scale-95 transition-transform duration-300 max-h-screen overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-2xl font-bold text-blue-700">Hasil Evaluasi</h3>
          <button id="closeModalBtn" class="text-gray-500 hover:text-gray-800 transition-colors duration-200 text-3xl leading-none">
            &times;
          </button>
        </div>
        <div id="modalContent" class="space-y-4">
          <!-- Konten umpan balik akan dimuat di sini -->
        </div>
      </div>
    `;
    document.body.appendChild(feedbackModal);

    modalContentContainer = document.getElementById("modalContentContainer");
    modalContent = document.getElementById("modalContent");
    closeModalBtn = document.getElementById("closeModalBtn");
  } else {
    closeModalBtn = document.getElementById("closeModalBtn");
  }

  const closeAndContinue = () => {
    feedbackModal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  };

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeAndContinue);
  }

  feedbackModal.addEventListener("click", (e) => {
    if (e.target === feedbackModal || e.target === modalContentContainer) {
      closeAndContinue();
    }
  });

  document
    .getElementById("backToChapterListBtn")
    .addEventListener("click", () => {
      renderDiskusi(materialData, materials);
    });

  const returnToChapterListBtn = document.getElementById(
    "returnToChapterListBtn"
  );
  if (returnToChapterListBtn) {
    returnToChapterListBtn.addEventListener("click", () => {
      renderDiskusi(materialData, materials);
    });
  }

  const submitAllBtn = document.getElementById("submitAllBtn");
  if (submitAllBtn) {
    submitAllBtn.addEventListener("click", async () => {
      let allSubmitted = true;
      submitAllBtn.disabled = true;
      submitAllBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Mengirim...`;
      submitAllBtn.classList.add("bg-gray-400", "cursor-not-allowed");
      submitAllBtn.classList.remove("bg-blue-600", "hover:bg-blue-700");

      let discussionAnswer, selectedQuizOption;

      if (hasDiscussion) {
        const answerTextarea = document.getElementById(
          `discussion-answer-${chapterIndex}`
        );
        discussionAnswer = answerTextarea.value;
        if (!discussionAnswer.trim()) {
          showMessage("error", "Jawaban diskusi tidak boleh kosong.");
          allSubmitted = false;
        }
      }

      if (hasQuiz) {
        const quizForm = document.getElementById(`quiz-form-${chapterIndex}`);
        const selectedOptionInput = quizForm.querySelector(
          `input[name="quiz-q-${chapterIndex}"]:checked`
        );
        selectedQuizOption = selectedOptionInput?.value;
        if (!selectedQuizOption) {
          showMessage("error", "Pilih salah satu jawaban kuis.");
          allSubmitted = false;
        }
      }

      if (!studentData?.uid) {
        showMessage(
          "error",
          "Data siswa tidak ditemukan. Silakan coba login ulang."
        );
        allSubmitted = false;
      }

      if (allSubmitted) {
        try {
          const quizCorrectAnswer = section.quizCorrectAnswer;
          const isQuizCorrect =
            selectedQuizOption && quizCorrectAnswer
              ? selectedQuizOption.trim() === quizCorrectAnswer.trim()
              : false;

          const quizScore = isQuizCorrect ? 100 : 0;

          let discussionScore = 0;
          let discussionFeedback = "";
          const discussionExampleAnswer = section.discussionExampleAnswer;

          if (hasDiscussion) {
            const prompt = `
Berdasarkan materi penjelasan berikut: '${
              section.explanation
            }', dan pertanyaan diskusi ini: '${
              section.discussionQuestion
            }', serta kunci jawaban berikut: '${
              discussionExampleAnswer || "Tidak tersedia"
            }',

Nilailah jawaban siswa berikut: '${discussionAnswer}'.
Tugasmu adalah memberikan skor dan umpan balik yang ramah, sederhana, dan mudah dimengerti oleh siswa SD. Umpan balik harus mencakup alasan mengapa skor tersebut diberikan dan saran perbaikan dalam satu paragraf yang mengalir.

Aturan penilaian:
- Jika jawaban siswa tidak nyambung sama sekali atau salah, berikanlah skor 0.
- Jika jawaban siswa "so-so" (kurang lengkap tapi ada benarnya), berikan skor antara 20 sampai 95.
- Jika jawaban siswa sudah relevan dan benar, meskipun tidak terlalu lengkap, berikanlah skor 100.

Contoh format output:
{
  "score": 75,
  "feedback": "Jawabanmu sudah cukup bagus! Kamu sudah mengerti sebagian, karena kamu menyebutkan tentang [...]. Namun, kamu bisa membuatnya lebih lengkap dengan [...]. Coba baca lagi penjelasan materinya ya!"
}
`;

            let chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: prompt }] });
            const payload = {
              contents: chatHistory,
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: "OBJECT",
                  properties: {
                    score: { type: "NUMBER" },
                    feedback: { type: "STRING" },
                  },
                  propertyOrdering: ["score", "feedback"],
                },
              },
            };
            const apiKey = "";
            const apiUrl = GEMINI_API_URL;

            const MAX_RETRIES = 3;
            const INITIAL_DELAY = 1000;

            let response;
            for (let i = 0; i < MAX_RETRIES; i++) {
              try {
                response = await fetch(apiUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });

                if (response.ok) {
                  break;
                } else if (response.status === 429) {
                  const delay = INITIAL_DELAY * Math.pow(2, i);
                  console.log(`Rate limit exceeded. Retrying in ${delay}ms...`);
                  await new Promise((resolve) => setTimeout(resolve, delay));
                } else {
                  throw new Error(`API returned status ${response.status}`);
                }
              } catch (error) {
                if (i === MAX_RETRIES - 1) {
                  throw error;
                }
              }
            }
            if (!response.ok) {
              throw new Error("API failed after multiple retries.");
            }

            const result = await response.json();
            if (
              result.candidates &&
              result.candidates.length > 0 &&
              result.candidates[0].content &&
              result.candidates[0].content.parts &&
              result.candidates[0].content.parts.length > 0
            ) {
              const jsonResponse = result.candidates[0].content.parts[0].text;
              const parsedResponse = JSON.parse(jsonResponse);
              discussionScore = parsedResponse.score || 0;
              discussionFeedback = parsedResponse.feedback || "";
            }
          }

          let totalScore = quizScore + discussionScore;
          let totalItems = 0;
          if (hasDiscussion) totalItems++;
          if (hasQuiz) totalItems++;
          const combinedScore =
            totalItems > 0 ? Math.round(totalScore / totalItems) : 0;

          const submissionData = {
            materialId: materialData.id,
            chapterIndex: chapterIndex,
            studentUid: studentData.uid,
            discussionQuestion: section.discussionQuestion || null,
            studentDiscussionAnswer: discussionAnswer || null,
            discussionExampleAnswer: discussionExampleAnswer || null,
            quizQuestion: section.quizQuestion || null,
            studentQuizAnswer: selectedQuizOption || null,
            quizCorrectAnswer: quizCorrectAnswer || null,
            isQuizCorrect: isQuizCorrect,
            discussionScore: discussionScore,
            discussionFeedback: discussionFeedback,
            combinedScore: combinedScore,
            timestamp: serverTimestamp(),
          };

          const submissionRef = doc(
            db,
            "student_chapter_submissions",
            `${materialData.id}_${chapterIndex}_${studentData.uid}`
          );
          await setDoc(submissionRef, submissionData, { merge: true });

          modalContent.innerHTML = `
            <div class="text-center mb-6">
              <p class="text-xl font-bold text-slate-800">Skor Total</p>
              <p class="text-7xl font-extrabold text-blue-600 mt-2 mb-4">${combinedScore}</p>
            </div>

            <div class="border-t border-gray-200 pt-4">
              <h4 class="text-lg font-bold text-slate-800 mb-2">Detail Skor</h4>
              <div class="grid grid-cols-2 gap-4 text-center">
                ${
                  hasDiscussion
                    ? `<div>
                      <p class="text-sm font-semibold text-yellow-700">Skor Diskusi</p>
                      <p class="text-2xl font-bold text-yellow-600">${discussionScore}</p>
                    </div>`
                    : ""
                }
                ${
                  hasQuiz
                    ? `<div>
                      <p class="text-sm font-semibold text-green-700">Skor Kuis</p>
                      <p class="text-2xl font-bold text-green-600">${quizScore}</p>
                    </div>`
                    : ""
                }
              </div>
            </div>

            ${
              discussionFeedback
                ? `
              <div class="border-t border-gray-200 pt-4 mt-4">
                <h4 class="text-lg font-bold text-slate-800 mb-2 flex items-center"><i class="fas fa-comment-dots mr-2 text-yellow-500"></i> Umpan Balik AI</h4>
                <p class="text-gray-700 text-sm whitespace-pre-wrap">${discussionFeedback}</p>
              </div>
            `
                : ""
            }

            <div class="mt-6 flex justify-end">
                <button id="modalContinueBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition duration-300">
                    <i class="fas fa-check mr-2"></i> Lanjutkan
                </button>
            </div>
          `;

          feedbackModal.classList.remove("hidden");
          document.body.classList.add("overflow-hidden");

          document
            .getElementById("modalContinueBtn")
            .addEventListener("click", () => {
              closeAndContinue();
              renderChapterContent(
                materialData,
                chapterIndex,
                materials,
                submissionData
              );
            });

          showMessage("success", "Semua jawaban berhasil dikirim!");
        } catch (error) {
          console.error("Error submitting combined answers:", error);
          showMessage(
            "error",
            "Terjadi kesalahan saat mengirim jawaban. Coba lagi."
          );
          submitAllBtn.disabled = false;
          submitAllBtn.innerHTML = `<i class="fas fa-paper-plane mr-2"></i> Kirim Jawaban`;
          submitAllBtn.classList.remove("bg-gray-400", "cursor-not-allowed");
          submitAllBtn.classList.add("bg-blue-600", "hover:bg-blue-700");
          if (!feedbackModal.classList.contains("hidden")) {
            feedbackModal.classList.add("hidden");
            document.body.classList.remove("overflow-hidden");
          }
        }
      } else {
        submitAllBtn.disabled = false;
        submitAllBtn.innerHTML = `<i class="fas fa-paper-plane mr-2"></i> Kirim Jawaban`;
        submitAllBtn.classList.remove("bg-gray-400", "cursor-not-allowed");
        submitAllBtn.classList.add("bg-blue-600", "hover:bg-blue-700");
      }
    });
  }

  const explanationTextElement = document.getElementById("explanationText");
  const increaseFontBtn = document.getElementById("increaseFontBtn");
  const decreaseFontBtn = document.getElementById("decreaseFontBtn");
  let currentFontSize = 16;
  const minFontSize = 14;
  const maxFontSize = 24;

  if (explanationTextElement && increaseFontBtn && decreaseFontBtn) {
    explanationTextElement.style.fontSize = `${currentFontSize}px`;

    increaseFontBtn.addEventListener("click", () => {
      if (currentFontSize < maxFontSize) {
        currentFontSize += 2;
        explanationTextElement.style.fontSize = `${currentFontSize}px`;
      }
    });

    decreaseFontBtn.addEventListener("click", () => {
      if (currentFontSize > minFontSize) {
        currentFontSize -= 2;
        explanationTextElement.style.fontSize = `${currentFontSize}px`;
      }
    });
  }
}

/**
 * Mendapatkan ringkasan progres dan nilai siswa untuk materi tertentu.
 * Ini adalah fungsi baru yang dibuat untuk mengekspor data progres.
 * @param {string} materialId - ID materi saat ini.
 * @param {string} studentUid - UID siswa yang sedang login.
 * @returns {Promise<Object>} - Promise yang me-resolve dengan ringkasan progres.
 * Contoh: {
 * "averageScore": 85,
 * "chapterScores": [
 * { "chapterIndex": 0, "score": 90 },
 * { "chapterIndex": 1, "score": 80 }
 * ],
 * "completedChapters": 2,
 * "totalChapters": 5
 * }
 */
export async function getMaterialProgressSummary(materialId, studentUid) {
  if (!studentUid) {
    return null;
  }

  // Gunakan fungsi internal yang sudah ada untuk mengambil data
  const submissions = await getStudentSubmissionsForMaterial(
    materialId,
    studentUid
  );
  const chapterScores = [];
  let totalScore = 0;
  let submissionCount = 0;

  submissions.forEach((submission) => {
    if (typeof submission.combinedScore === "number") {
      chapterScores.push({
        chapterIndex: submission.chapterIndex,
        score: submission.combinedScore,
      });
      totalScore += submission.combinedScore;
      submissionCount++;
    }
  });

  const averageScore =
    submissionCount > 0 ? Math.round(totalScore / submissionCount) : null;
  const completedChapters = submissions.length;

  return {
    averageScore,
    chapterScores,
    completedChapters,
  };
}
