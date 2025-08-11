// js/materi.js

// Import modul-modul yang dibutuhkan dari firebase.js dan utils.js
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
  auth, // Import auth untuk mendapatkan UID guru
} from "./firebase.js";
import { showMessage } from "./utils.js";
import { renderModals } from "./app.js"; // Diperlukan untuk menampilkan modal
import { GEMINI_API_URL } from "./api.js"; // NEW: Import from api.js

// --- Global State Variables for Materi Module ---
export let allGeneratedMaterials = []; // Array untuk menyimpan semua materi yang digenerate guru
export let currentGeneratedLesson = null; // Materi yang sedang ditampilkan (setelah generate)

// State untuk formulir pembuatan materi (akan digunakan di modal)
let materialSubject = "";
let materialTopic = "";
let selectedLearningModel = "Eksplorasi Konsep & Diskusi Esai"; // Default model
let materialSubTopics = ""; // Untuk input sub-topik

// State untuk loading dan error (akan digunakan di modal)
export let loadingMaterialGeneration = false;
export let loadingSubTopicSuggestions = false;
export let materialGenerationError = null;
export let subTopicSuggestionError = null;

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

// --- Fungsi Pembantu UI (diperbarui untuk modal) ---

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
 * Fungsi untuk mengimplementasikan exponential backoff untuk panggilan API.
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
        const errorBody = await response.text();
        console.error(`API Error Response Body: ${errorBody}`);
        throw new Error(
          `HTTP error! status: ${response.status} - ${
            response.statusText || "Unknown Error"
          }`
        );
      }
      return await response.json();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error; // Re-throw error if max retries reached
      }
    }
  }
}

// --- Fungsi Generate Materi ---

/**
 * Menghasilkan saran sub-topik menggunakan AI (Gemini).
 */
export async function generateFokusPembahasanSuggestions() {
  const { subject, topic, learningModel } = getFormValues();

  if (!subject || !topic) {
    showMessage(
      "error",
      "Mata Pelajaran dan Topik harus diisi untuk mendapatkan saran sub-topik."
    );
    return;
  }

  updateSubTopicSuggestionStatus(true);
  showMessage("loading", "Mencari saran sub-topik dari AI...");

  let aiPrompt;
  let responseSchema;

  switch (learningModel) {
    case "Eksplorasi Konsep & Diskusi Esai":
      aiPrompt = `Sebagai AI yang membantu guru membuat materi pembelajaran interaktif untuk anak kelas 5 SD berdasarkan Kurikulum Merdeka, berikan daftar fokus pembahasan (sub-topik) yang komprehensif dan detail untuk Mata Pelajaran "${subject}" dan Topik "${topic}". 
              Sertakan semua aspek penting dari topik tersebut, seperti definisi, manfaat, tahapan/proses, jenis-jenis, cara menjaga/melestarikan, atau contoh-contoh relevan lainnya. Pastikan saran-saran ini relevan dengan Kurikulum Merdeka untuk jenjang SD.
              Sajikan dalam format JSON:
              {
                "suggestions": ["Saran 1", "Saran 2", "Saran 3", "Saran 4", "Saran 5", "Saran 6", "Saran 7", "Saran 8", "Saran 9"]
              }
              Contoh untuk topik "Siklus Air" pada mata pelajaran "IPAS":
              [
                  "Apa Itu Siklus Air?",
                  "Manfaat Siklus Air bagi Kehidupan",
                  "Tahapan Siklus Air Secara Umum",
                  "Evaporasi (Penguapan Air)",
                  "Transpirasi (Penguapan dari Tumbuhan)",
                  "Kondensasi (Pembentukan Awan)",
                  "Presipitasi (Hujan)",
                  "Infiltrasi dan Aliran Permukaan (Air Masuk Tanah dan Mengalir)",
                  "Cara Menjaga Ketersediaan Air Bersih"
              ]
              Pastikan semua saran dalam Bahasa Indonesia, jelas, dan relevan untuk anak SD. Berikan setidaknya 5-10 saran jika memungkinkan, dan pastikan setiap saran adalah sub-topik yang bisa dijelaskan secara mendalam. PASTIKAN SELURUH RESPON HANYA BERUPA OBJEK JSON YANG VALID, TANPA TEKS TAMBAHAN APAPUN DI LUAR OBJEK JSON. Gunakan gaya bahasa yang sangat alami, ceria, dan menarik, dengan kosakata sederhana dan kalimat pendek yang mudah dicerna oleh anak kelas 5 SD. Hindari kalimat kaku atau terlalu formal.`;
      responseSchema = {
        type: "OBJECT",
        properties: {
          suggestions: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
        },
        required: ["suggestions"],
      };
      break;
    case "Petualangan Cerita & Narasi":
      aiPrompt = `Sebagai AI yang membantu guru membuat materi pembelajaran berbentuk cerita untuk anak kelas 5 SD, berikan daftar fokus pembahasan (sub-topik) yang berorientasi pada elemen narasi untuk Mata Pelajaran "${subject}" dan Topik "${topic}".
              Saran harus berupa bagian-bagian penting dari sebuah cerita.
              Sajikan dalam format JSON:
              {
                "suggestions": ["Saran 1", "Saran 2", "Saran 3"]
              }
              Contoh untuk topik "Persahabatan" pada mata pelajaran "Bahasa Indonesia":
              [
                  "Awal Mula Petualangan: Bagaimana Cerita Dimulai?",
                  "Konflik atau Tantangan: Masalah Apa yang Dihadapi?",
                  "Penyelesaian Masalah: Bagaimana Konflik Terselesaikan?",
                  "Pesan Moral: Apa Pelajaran dari Cerita Ini?"
              ]
              Pastikan semua saran dalam Bahasa Indonesia, jelas, dan relevan untuk anak SD. Berikan setidaknya 4-8 saran jika memungkinkan. PASTIKAN SELURUH RESPON HANYA BERUPA OBJEK JSON YANG VALID, TANPA TEKS TAMBAHAN APAPUN DI LUAR OBJEK JSON.`;
      responseSchema = {
        type: "OBJECT",
        properties: {
          suggestions: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
        },
        required: ["suggestions"],
      };
      break;
    default:
      // Fallback
      aiPrompt = `Berikan daftar fokus pembahasan (sub-topik) untuk Mata Pelajaran "${subject}" dan Topik "${topic}" yang relevan untuk anak kelas 5 SD. Sajikan dalam format JSON: {"suggestions": ["Saran 1", "Saran 2"]}`;
      responseSchema = {
        type: "OBJECT",
        properties: {
          suggestions: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
        },
        required: ["suggestions"],
      };
  }

  const chatHistory = [{ role: "user", parts: [{ text: aiPrompt }] }];
  const payload = {
    contents: chatHistory,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  };

  try {
    const result = await fetchWithExponentialBackoff(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0
    ) {
      const rawContent = result.candidates[0].content.parts[0].text;
      try {
        const cleanedContent = rawContent
          .replace(/```json\n|\n```/g, "")
          .trim();
        const parsedJson = JSON.parse(cleanedContent);

        if (parsedJson.suggestions && Array.isArray(parsedJson.suggestions)) {
          materialSubTopics = parsedJson.suggestions
            .map((s, i) => `${i + 1}. ${s}`)
            .join("\n");
          setFormValues(
            materialSubject,
            materialTopic,
            selectedLearningModel,
            materialSubTopics
          );
          showMessage("success", "Saran sub-topik berhasil digenerate!");
        } else {
          throw new Error("Format saran AI tidak valid.");
        }
      } catch (parseError) {
        console.error(
          "JSON parsing error for suggestions:",
          parseError,
          "Raw content:",
          rawContent
        );
        showMessage(
          "error",
          "Gagal memproses respons AI untuk saran. Format JSON tidak valid."
        );
      }
    } else {
      showMessage(
        "error",
        "Tidak ada saran yang dihasilkan oleh AI. Coba lagi."
      );
    }
  } catch (error) {
    console.error("Error generating sub-topic suggestions:", error);
    showMessage(
      "error",
      `Gagal menggenerate saran sub-topik: ${error.message}`
    );
  } finally {
    updateSubTopicSuggestionStatus(false);
  }
}

/**
 * Menghasilkan materi pembelajaran utama menggunakan AI (Gemini) dan menyimpannya ke Firestore.
 */
export async function generateMaterial() {
  const { subject, topic, learningModel, subTopics } = getFormValues();

  if (!subject || !topic || !subTopics) {
    showMessage(
      "error",
      "Mata Pelajaran, Topik, dan Fokus Pembahasan (Sub-topik) harus diisi."
    );
    return;
  }

  updateMaterialGenerationStatus(true);
  showMessage(
    "loading",
    "Sedang membuat materi pembelajaran dengan AI... Mohon tunggu!"
  );

  const subTopicsArray = subTopics
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim());

  const subTopicsPromptList = subTopicsArray
    .map((sub, index) => `- ${sub}`)
    .join("\n");

  let prompt;
  let responseSchema;

  // Prompt dan skema respons sesuai dengan yang ada di App.jsx
  switch (learningModel) {
    case "Eksplorasi Konsep & Diskusi Esai":
      prompt = `Buatkan materi pembelajaran interaktif untuk anak kelas 5 SD tentang Mata Pelajaran "${subject}" dan Topik "${topic}". 
                Pastikan materinya komprehensif dan mencakup poin-poin penting yang relevan dengan topik tersebut.
                Fokus pembahasan tambahan: ${subTopics}.
                Penjelasan ('explanation') untuk setiap bagian HARUS PANJANG, DETAIL, dan KOMPREHENSIF. Gunakan GAYA BAHASA yang SANGAT ALAMI, CERIA, MENARIK, dan MUDAH DIPAHAMI oleh anak kelas 5 SD. Gunakan kosakata sederhana, kalimat pendek dan langsung, serta hindari kalimat kaku atau terlalu formal. Sertakan analogi atau contoh konkret jika relevan, dan pastikan penjelasan cukup kaya informasi untuk sub-topik tersebut. Pastikan seluruh materi dan penjelasannya relevan dengan Kurikulum Merdeka untuk jenjang SD.

                Berikut adalah daftar FOKUS PEMBAHASAN UTAMA (SUB-TOPIK) yang HARUS menjadi JUDUL untuk SETIAP BAGIAN (section) dalam materi. Anda HARUS membuat SATU BAGIAN (section) untuk SETIAP poin dalam daftar ini, dan gunakan teks poin tersebut sebagai JUDUL ('title') untuk bagiannya. Pastikan jumlah sections yang Anda hasilkan SAMA PERSIS dengan jumlah poin di daftar ini:
                ${subTopicsPromptList}

                Untuk setiap BAGIAN (section) yang dibuat berdasarkan daftar di atas, sertakan:
                - ID unik untuk bagian tersebut (misalnya "bagian1", "bagian2", dst., sesuai urutan).
                - Judul bagian yang diambil LANGSUNG dari poin FOKUS PEMBAHASAN UTAMA di atas.
                - Emoji yang relevan (gunakan *satu* karakter emoji populer seperti ☀️, 🌳, ☁️, 🌧️, 🌱, 🌊, dst.). PASTIKAN EMOJI INI DIAPIT OLEH TANDA KUTIP GANDA (misal: "☀️").
                - Penjelasan ('explanation') yang lebih panjang, detail, dan mudah dipahami anak kelas 5 SD. Penjelasan ini harus berupa teks yang informatif dan relevan dengan bagian tersebut, BUKAN HANYA EMOJI ATAU TEKS YANG TIDAK BERKAITAN. Pastikan penjelasan ini mencakup inti dari sub-topik dengan cukup mendalam.
                - Satu pertanyaan diskusi "Ayo Berpikir & Berbagi!" ('discussionQuestion') yang memancing pemikiran kritis sederhana (untuk anak kelas 5 SD, pertanyaan esai singkat), dan contoh jawaban ideal ('discussionExampleAnswer') yang juga sederhana dan mudah dipahami. Pertanyaan dan contoh jawaban harus berupa teks, bukan hanya emoji.
                - **Satu pertanyaan kuis pilihan ganda dengan 3 opsi dan 1 jawaban benar. Pertanyaan kuis ('quizQuestion') dan opsi-opsinya ('quizOptions') HARUS SECARA LANGSUNG RELEVAN dengan PENJELASAN ('explanation') yang ada di bagian (section) tersebut. JANGAN PERNAH menanyakan topik yang belum dibahas di dalam penjelasan bagian tersebut atau topik dari bagian lain.** Pertanyaan dan opsi harus berupa teks, bukan hanya emoji.
                
                Setelah semua bagian (sections) selesai, sertakan juga:
                - Satu bagian "Tantangan Utama" dengan 3 pertanyaan pilihan ganda yang menguji pemahaman keseluruhan.
                - Dua ide "Proyek Kreatifmu!" dengan deskripsi dan tujuan singkat.
                
                Sajikan semua dalam format JSON sesuai skema berikut. PASTIKAN SELURUH RESPON HANYA BERUPA OBJEK JSON YANG VALID, TANPA TEKS TAMBAHAN APAPUN DI LUAR OBJEK JSON.
                {
                  "title": "Judul Utama Pelajaran",
                  "introduction": "Pengantar singkat tentang topik.",
                  "sections": [
                    {
                      "id": "sectionId",
                      "title": "Judul Bagian",
                      "emoji": "☀️",
                      "explanation": "Penjelasan sederhana.",
                      "discussionQuestion": "Pertanyaan diskusi.",
                      "discussionExampleAnswer": "Contoh jawaban diskusi.",
                      "quizQuestion": "Pertanyaan kuis.",
                      "quizOptions": ["Pilihan A", "Pilihan B", "Pilihan C"],
                      "quizCorrectAnswer": "Pilihan B"
                    }
                  ],
                  "challengeQuiz": {
                    "title": "Tantangan Utama",
                    "description": "Deskripsi tantangan.",
                    "questions": [
                      {
                        "questionText": "Pertanyaan 1",
                        "options": ["A", "B", "C"],
                        "correctAnswer": "B"
                      }
                    ]
                  },
                  "creativeProjects": [
                    {
                      "title": "Judul Proyek 1",
                      "description": "Deskripsi proyek.",
                      "purpose": "Tujuan proyek."
                    }
                  ]
                }
                Pastikan semua teks dalam Bahasa Indonesia. Jangan pernah mengisi 'explanation', 'discussionQuestion', 'quizQuestion', 'quizOptions', atau 'discussionExampleAnswer' hanya dengan emoji atau teks yang tidak relevan dengan penjelasan.`;

      responseSchema = {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          introduction: { type: "STRING" },
          sections: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                title: { type: "STRING" },
                emoji: { type: "STRING" },
                explanation: { type: "STRING" },
                discussionQuestion: { type: "STRING" },
                discussionExampleAnswer: { type: "STRING" },
                quizQuestion: { type: "STRING" },
                quizOptions: { type: "ARRAY", items: { type: "STRING" } },
                quizCorrectAnswer: { type: "STRING" },
              },
              required: [
                "id",
                "title",
                "emoji",
                "explanation",
                "discussionQuestion",
                "discussionExampleAnswer",
                "quizQuestion",
                "quizOptions",
                "quizCorrectAnswer",
              ],
            },
          },
          challengeQuiz: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              description: { type: "STRING" },
              questions: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    questionText: { type: "STRING" },
                    options: { type: "ARRAY", items: { type: "STRING" } },
                    correctAnswer: { type: "STRING" },
                  },
                  required: ["questionText", "options", "correctAnswer"],
                },
              },
            },
            required: ["title", "description", "questions"],
          },
          creativeProjects: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                description: { type: "STRING" },
                purpose: { type: "STRING" },
              },
              required: ["title", "description", "purpose"],
            },
          },
        },
        required: [
          "title",
          "introduction",
          "sections",
          "challengeQuiz",
          "creativeProjects",
        ],
      };
      break;

    case "Petualangan Cerita & Narasi":
      prompt = `Buatkan materi pembelajaran berbentuk cerita petualangan/narasi untuk anak kelas 5 SD tentang Mata Pelajaran "${subject}" dan Topik "${topic}".
                Gunakan GAYA BAHASA yang SANGAT ALAMI, CERIA, MENARIK, dan MUDAH DIPAHAMI oleh anak kelas 5 SD. Gunakan kosakata sederhana, kalimat pendek dan langsung, serta hindari kalimat kaku atau terlalu formal. Pastikan seluruh materi dan penjelasannya relevan dengan Kurikulum Merdeka untuk jenjang SD.
                Fokus pembahasan tambahan: ${subTopics}.

                Sertakan:
                - 'storyTitle': Judul cerita yang menarik.
                - 'introduction': Pengantar cerita yang singkat dan memancing rasa ingin tahu.
                - 'plot': Array objek yang mewakili bab-bab atau tahapan plot cerita, masing-masing dengan 'chapterTitle' dan 'chapterContent' yang detail dan panjang naratifnya.
                - 'moralLesson': Pesan moral atau pelajaran yang bisa diambil dari cerita.
                - 'storyAssessment': Objek yang berisi aktivitas penilaian khusus cerita:
                    - 'comprehensionQuestions': Array objek pertanyaan pemahaman uraian singkat. Setiap objek memiliki 'id', 'questionText', dan 'correctAnswer' (contoh jawaban ideal).
                    - 'matchingActivities': Array objek aktivitas menjodohkan. Setiap objek memiliki 'id', 'instructions', dan 'pairs' (array objek dengan 'term' dan 'match').
                - 'creativeProjects': Array string berisi 2-3 ide kreatif untuk siswa (misalnya, "Apa yang akan kamu lakukan jika menjadi [karakter]?").

                Sajikan semua dalam format JSON sesuai skema berikut. PASTIKAN SELURUH RESPON HANYA BERUPA OBJEK JSON YANG VALID, TANPA TEKS TAMBAHAN APAPUN DI LUAR OBJEK JSON.
                {
                  "storyTitle": "Judul Cerita",
                  "introduction": "Pengantar cerita.",
                  "plot": [
                    {"chapterTitle": "Bab 1", "chapterContent": "Narasi panjang bab 1."},
                    {"chapterTitle": "Bab 2", "chapterContent": "Narasi panjang bab 2."}
                  ],
                  "moralLesson": "Pesan moral.",
                  "storyAssessment": {
                    "comprehensionQuestions": [
                      {"id": "cq1", "questionText": "Pertanyaan pemahaman 1?", "correctAnswer": "Jawaban singkat 1."},
                      {"id": "cq2", "questionText": "Pertanyaan pemahaman 2?", "correctAnswer": "Jawaban singkat 2."}
                    ],
                    "matchingActivities": [
                      {
                        "id": "ma1",
                        "instructions": "Jodohkan karakter dengan ciri-cirinya.",
                        "pairs": [
                          {"term": "Karakter A", "match": "Ciri A"},
                          {"term": "Karakter B", "match": "Ciri B"}
                        ]
                      }
                    ]
                  },
                  "creativeProjects": ["Ide kreatif 1", "Ide kreatif 2"]
                }`;
      responseSchema = {
        type: "OBJECT",
        properties: {
          storyTitle: { type: "STRING" },
          introduction: { type: "STRING" },
          plot: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                chapterTitle: { type: "STRING" },
                chapterContent: { type: "STRING" },
              },
              required: ["chapterTitle", "chapterContent"],
            },
          },
          moralLesson: { type: "STRING" },
          storyAssessment: {
            type: "OBJECT",
            properties: {
              comprehensionQuestions: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    questionText: { type: "STRING" },
                    correctAnswer: { type: "STRING" },
                  },
                  required: ["id", "questionText", "correctAnswer"],
                },
              },
              matchingActivities: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    instructions: { type: "STRING" },
                    pairs: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          term: { type: "STRING" },
                          match: { type: "STRING" },
                        },
                        required: ["term", "match"],
                      },
                    },
                  },
                  required: ["id", "instructions", "pairs"],
                },
              },
            },
            required: ["comprehensionQuestions", "matchingActivities"],
          },
          creativeProjects: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: [
          "storyTitle",
          "introduction",
          "plot",
          "moralLesson",
          "storyAssessment",
          "creativeProjects",
        ],
      };
      break;

    default: // Fallback to Eksplorasi Konsep schema if no specific model is matched
      prompt = `Buatkan materi pembelajaran interaktif untuk anak kelas 5 SD tentang Mata Pelajaran "${subject}" dan Topik "${topic}". 
                Pastikan materinya komprehensif dan mencakup poin-poin penting yang relevan dengan topik tersebut.
                Fokus pembahasan tambahan: ${subTopics}.
                Penjelasan ('explanation') untuk setiap bagian HARUS PANJANG, DETAIL, dan KOMPREHENSIF. Gunakan GAYA BAHASA yang SANGAT ALAMI, CERIA, MENARIK, dan MUDAH DIPAHAMI oleh anak kelas 5 SD. Gunakan kosakata sederhana, kalimat pendek dan langsung, serta hindari kalimat kaku atau terlalu formal. Sertakan analogi atau contoh konkret jika relevan, dan pastikan penjelasan cukup kaya informasi untuk sub-topik tersebut. Pastikan seluruh materi dan penjelasannya relevan dengan Kurikulum Merdeka untuk jenjang SD.

                Berikut adalah daftar FOKUS PEMBAHASAN UTAMA (SUB-TOPIK) yang HARUS menjadi JUDUL untuk SETIAP BAGIAN (section) dalam materi. Anda HARUS membuat SATU BAGIAN (section) untuk SETIAP poin dalam daftar ini, dan gunakan teks poin tersebut sebagai JUDUL ('title') untuk bagiannya. Pastikan jumlah sections yang Anda hasilkan SAMA PERSIS dengan jumlah poin di daftar ini:
                ${subTopicsPromptList}

                Untuk setiap BAGIAN (section) yang dibuat berdasarkan daftar di atas, sertakan:
                - ID unik untuk bagian tersebut (misalnya "bagian1", "bagian2", dst., sesuai urutan).
                - Judul bagian yang diambil LANGSUNG dari poin FOKUS PEMBAHASAN UTAMA di atas.
                - Emoji yang relevan (gunakan *satu* karakter emoji populer seperti ☀️, 🌳, ☁️, 🌧️, 🌱, 🌊, dst.). PASTIKAN EMOJI INI DIAPIT OLEH TANDA KUTIP GANDA (misal: "☀️").
                - Penjelasan ('explanation') yang lebih panjang, detail, dan mudah dipahami anak kelas 5 SD. Penjelasan ini harus berupa teks yang informatif dan relevan dengan bagian tersebut, BUKAN HANYA EMOJI ATAU TEKS YANG TIDAK BERKAITAN. Pastikan penjelasan ini mencakup inti dari sub-topik dengan cukup mendalam.
                - Satu pertanyaan diskusi "Ayo Berpikir & Berbagi!" ('discussionQuestion') yang memancing pemikiran kritis sederhana (untuk anak kelas 5 SD, pertanyaan esai singkat), dan contoh jawaban ideal ('discussionExampleAnswer') yang juga sederhana dan mudah dipahami. Pertanyaan dan contoh jawaban harus berupa teks, bukan hanya emoji.
                - **Satu pertanyaan kuis pilihan ganda dengan 3 opsi dan 1 jawaban benar. Pertanyaan kuis ('quizQuestion') dan opsi-opsinya ('quizOptions') HARUS SECARA LANGSUNG RELEVAN dengan PENJELASAN ('explanation') yang ada di bagian (section) tersebut. JANGAN PERNAH menanyakan topik yang belum dibahas di dalam penjelasan bagian tersebut atau topik dari bagian lain.** Pertanyaan dan opsi harus berupa teks, bukan hanya emoji.
                
                Setelah semua bagian (sections) selesai, sertakan juga:
                - Satu bagian "Tantangan Utama" dengan 3 pertanyaan pilihan ganda yang menguji pemahaman keseluruhan.
                - Dua ide "Proyek Kreatifmu!" dengan deskripsi dan tujuan singkat.
                
                Sajikan semua dalam format JSON sesuai skema berikut. PASTIKAN SELURUH RESPON HANYA BERUPA OBJEK JSON YANG VALID, TANPA TEKS TAMBAHAN APAPUN DI LUAR OBJEK JSON.
                {
                  "title": "Judul Utama Pelajaran",
                  "introduction": "Pengantar singkat tentang topik.",
                  "sections": [
                    {
                      "id": "sectionId",
                      "title": "Judul Bagian",
                      "emoji": "☀️",
                      "explanation": "Penjelasan sederhana.",
                      "discussionQuestion": "Pertanyaan diskusi.",
                      "discussionExampleAnswer": "Contoh jawaban diskusi.",
                      "quizQuestion": "Pertanyaan kuis.",
                      "quizOptions": ["Pilihan A", "Pilihan B", "Pilihan C"],
                      "quizCorrectAnswer": "Pilihan B"
                    }
                  ],
                  "challengeQuiz": {
                    "title": "Tantangan Utama",
                    "description": "Deskripsi tantangan.",
                    "questions": [
                      {
                        "questionText": "Pertanyaan 1",
                        "options": ["A", "B", "C"],
                        "correctAnswer": "B"
                      }
                    ]
                  },
                  "creativeProjects": [
                    {
                      "title": "Judul Proyek 1",
                      "description": "Deskripsi proyek.",
                      "purpose": "Tujuan proyek."
                    }
                  ]
                }
                Pastikan semua teks dalam Bahasa Indonesia. Jangan pernah mengisi 'explanation', 'discussionQuestion', 'quizQuestion', 'quizOptions', atau 'discussionExampleAnswer' hanya dengan emoji atau teks yang tidak relevan dengan penjelasan.`;

      responseSchema = {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          introduction: { type: "STRING" },
          sections: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                title: { type: "STRING" },
                emoji: { type: "STRING" },
                explanation: { type: "STRING" },
                discussionQuestion: { type: "STRING" },
                discussionExampleAnswer: { type: "STRING" },
                quizQuestion: { type: "STRING" },
                quizOptions: { type: "ARRAY", items: { type: "STRING" } },
                quizCorrectAnswer: { type: "STRING" },
              },
              required: [
                "id",
                "title",
                "emoji",
                "explanation",
                "discussionQuestion",
                "discussionExampleAnswer",
                "quizQuestion",
                "quizOptions",
                "quizCorrectAnswer",
              ],
            },
          },
          challengeQuiz: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              description: { type: "STRING" },
              questions: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    questionText: { type: "STRING" },
                    options: { type: "ARRAY", items: { type: "STRING" } },
                    correctAnswer: { type: "STRING" },
                  },
                  required: ["questionText", "options", "correctAnswer"],
                },
              },
            },
            required: ["title", "description", "questions"],
          },
          creativeProjects: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                description: { type: "STRING" },
                purpose: { type: "STRING" },
              },
              required: ["title", "description", "purpose"],
            },
          },
        },
        required: [
          "title",
          "introduction",
          "sections",
          "challengeQuiz",
          "creativeProjects",
        ],
      };
      break;
  }

  const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
  const payload = {
    contents: chatHistory,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  };

  try {
    const result = await fetchWithExponentialBackoff(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0
    ) {
      const rawContent = result.candidates[0].content.parts[0].text;
      try {
        const cleanedContent = rawContent
          .replace(/```json\n|\n```/g, "")
          .trim();
        const parsedJson = JSON.parse(cleanedContent);

        // Generate unique ID
        const uniqueId =
          Date.now().toString(36) + Math.random().toString(36).substring(2);

        const newMaterial = {
          id: uniqueId,
          title: parsedJson.title || parsedJson.storyTitle || "Materi Baru",
          subject: subject,
          topic: topic,
          learningModel: learningModel,
          lessonData: parsedJson,
          createdBy: auth.currentUser.uid,
          createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, "materials", newMaterial.id), newMaterial);

        currentGeneratedLesson = newMaterial; // Set materi yang baru dibuat untuk ditampilkan
        showMessage(
          "success",
          "Materi pembelajaran berhasil dibuat dan disimpan!"
        );

        // Tutup modal setelah berhasil generate dan simpan
        renderModals({ showGenerateMaterialModal: false });
        // Reset form fields after successful generation
        setFormValues("", "", "Eksplorasi Konsep & Diskusi Esai", "");
      } catch (parseError) {
        console.error(
          "JSON parsing error for lesson content:",
          parseError,
          "Raw content:",
          rawContent
        );
        showMessage(
          "error",
          "Gagal memproses respons AI untuk materi. Format JSON tidak valid."
        );
      }
    } else {
      showMessage(
        "error",
        "Tidak ada konten materi yang dihasilkan oleh AI. Coba lagi."
      );
    }
  } catch (error) {
    console.error("Error generating lesson content:", error);
    showMessage("error", `Gagal menggenerate materi: ${error.message}`);
  } finally {
    updateMaterialGenerationStatus(false);
  }
}

/**
 * Menghapus materi dari Firestore.
 * @param {string} materialId - ID materi yang akan dihapus.
 */
export async function deleteMaterial(materialId) {
  showMessage("loading", "Menghapus materi...");
  try {
    // Tampilkan konfirmasi menggunakan modal dari app.js
    renderModals({
      showConfirmModal: true,
      confirmModalMessage:
        "Apakah Anda yakin ingin menghapus materi ini? Aksi ini tidak dapat dibatalkan.",
      confirmModalAction: async () => {
        try {
          await deleteDoc(doc(db, "materials", materialId));
          showMessage("success", "Materi berhasil dihapus!");
          // Jika materi yang sedang dilihat dihapus, reset currentGeneratedLesson
          if (
            currentGeneratedLesson &&
            currentGeneratedLesson.id === materialId
          ) {
            currentGeneratedLesson = null;
          }
          renderMateriView(); // Re-render untuk memperbarui daftar
        } catch (error) {
          console.error("Error deleting material:", error);
          showMessage("error", `Gagal menghapus materi: ${error.message}`);
        }
      },
      onCancel: () => {
        showMessage("info", "Penghapusan materi dibatalkan.");
      },
    });
  } catch (error) {
    console.error("Error initiating delete material confirmation:", error);
    showMessage(
      "error",
      `Gagal menampilkan konfirmasi hapus: ${error.message}`
    );
  }
}

/**
 * Menampilkan detail materi dalam modal.
 * @param {string} materialId - ID materi yang akan dilihat.
 */
export function viewMaterial(materialId) {
  const materialToView = allGeneratedMaterials.find((m) => m.id === materialId);
  if (materialToView) {
    // Set currentGeneratedLesson untuk ditampilkan di bagian bawah tab materi
    currentGeneratedLesson = materialToView;
    // Panggil renderModals untuk menampilkan modal detail materi
    renderModals({
      showViewMaterialModal: true,
      viewMaterialData: materialToView,
    });
    showMessage("success", `Materi "${materialToView.title}" berhasil dimuat.`);
  } else {
    showMessage("error", "Materi tidak ditemukan.");
  }
}

/**
 * Merender daftar materi secara dinamis ke dalam materiView.
 * @param {Array} materials - Array objek materi untuk dirender.
 */
function renderMaterialsList(materials) {
  const container = document.getElementById("materialsListContainer");
  if (!container) return;

  // Clear previous content
  container.innerHTML = "";

  if (materials.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-500 mt-8">
        <p>Belum ada materi yang Anda buat.</p>
        <p>Klik tombol "Buat Materi Pembelajaran Baru" untuk memulai.</p>
      </div>
    `;
    return;
  }

  // Group materials by subject
  const materialsBySubject = materials.reduce((acc, material) => {
    const subject = material.subject || "Lainnya";
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push(material);
    return acc;
  }, {});

  for (const subject in materialsBySubject) {
    const subjectHtml = `
      <div class="mb-8">
        <h3 class="text-2xl font-bold text-blue-800 mb-4">${subject}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${materialsBySubject[subject]
            .map(
              (material) => `
            <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
              <div class="flex justify-between items-start mb-4">
                <h4 class="text-xl font-bold text-gray-800">${material.title}</h4>
                <div class="flex space-x-2">
                  <button class="text-red-500 hover:text-red-700 delete-material-btn" data-material-id="${material.id}" title="Hapus Materi">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                  <button class="text-blue-500 hover:text-blue-700 view-material-btn" data-material-id="${material.id}" title="Lihat Materi">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
              </div>
              <p class="text-sm text-gray-600">Topik: ${material.topic}</p>
              <p class="text-xs text-gray-500 mt-1">Model: ${material.learningModel}</p>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
    container.innerHTML += subjectHtml;
  }

  // Add event listeners for new buttons
  document.querySelectorAll(".delete-material-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const materialId = e.currentTarget.dataset.materialId;
      deleteMaterial(materialId);
    });
  });

  document.querySelectorAll(".view-material-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const materialId = e.currentTarget.dataset.materialId;
      viewMaterial(materialId);
    });
  });
}

/**
 * Merender konten pelajaran secara detail berdasarkan model pembelajaran.
 * @param {Object} lessonData - Objek data pelajaran dari AI.
 * @param {string} learningModel - Model pembelajaran yang digunakan.
 * @param {HTMLElement} targetElement - Elemen DOM tempat konten akan dirender.
 */
export function renderLessonContentDisplay(
  lessonData,
  learningModel,
  targetElement
) {
  let contentHtml = "";

  if (learningModel === "Eksplorasi Konsep & Diskusi Esai") {
    contentHtml += `<h3 class="text-2xl font-bold text-blue-800 mb-4">${lessonData.title}</h3>`;
    contentHtml += `<p class="text-gray-700 mb-6">${lessonData.introduction}</p>`;

    lessonData.sections.forEach((section) => {
      contentHtml += `
        <div class="bg-blue-50 p-4 rounded-lg mb-6 shadow-sm">
          <h4 class="text-xl font-semibold text-blue-700 mb-3 flex items-center">
            <span class="text-2xl mr-2">${section.emoji}</span> ${section.title}
          </h4>
          <p class="text-gray-700 mb-4">${section.explanation}</p>
          <div class="p-3 bg-blue-100 rounded-md mb-3">
            <p class="font-semibold text-blue-800">Ayo Berpikir & Berbagi!</p>
            <p class="text-gray-700">${section.discussionQuestion}</p>
            <p class="text-sm text-gray-600 italic mt-1">Contoh Jawaban: ${
              section.discussionExampleAnswer
            }</p>
          </div>
          <div class="p-3 bg-green-100 rounded-md">
            <p class="font-semibold text-green-800">Kuis Cepat!</p>
            <p class="text-gray-700">${section.quizQuestion}</p>
            <ul class="list-disc list-inside ml-4 text-gray-700">
              ${section.quizOptions
                .map((option) => `<li>${option}</li>`)
                .join("")}
            </ul>
            <p class="text-sm text-green-700 mt-2">Jawaban Benar: ${
              section.quizCorrectAnswer
            }</p>
          </div>
        </div>
      `;
    });

    contentHtml += `
      <div class="bg-purple-50 p-6 rounded-lg mb-6 shadow-md">
        <h3 class="text-2xl font-bold text-purple-800 mb-4">${
          lessonData.challengeQuiz.title
        }</h3>
        <p class="text-gray-700 mb-4">${
          lessonData.challengeQuiz.description
        }</p>
        ${lessonData.challengeQuiz.questions
          .map(
            (q, idx) => `
          <div class="mb-4">
            <p class="font-semibold text-purple-700">Soal ${idx + 1}: ${
              q.questionText
            }</p>
            <ul class="list-disc list-inside ml-4 text-gray-700">
              ${q.options.map((option) => `<li>${option}</li>`).join("")}
            </ul>
            <p class="text-sm text-purple-600 mt-1">Jawaban Benar: ${
              q.correctAnswer
            }</p>
          </div>
        `
          )
          .join("")}
      </div>
      <div class="bg-yellow-50 p-6 rounded-lg shadow-md">
        <h3 class="text-2xl font-bold text-yellow-800 mb-4">Proyek Kreatifmu!</h3>
        ${lessonData.creativeProjects
          .map(
            (project) => `
          <div class="mb-4">
            <h4 class="font-semibold text-yellow-700">${project.title}</h4>
            <p class="text-gray-700">${project.description}</p>
            <p class="text-sm text-gray-600 italic">Tujuan: ${project.purpose}</p>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  } else if (learningModel === "Petualangan Cerita & Narasi") {
    contentHtml += `<h3 class="text-2xl font-bold text-blue-800 mb-4">${lessonData.storyTitle}</h3>`;
    contentHtml += `<p class="text-gray-700 mb-6">${lessonData.introduction}</p>`;

    lessonData.plot.forEach((chapter, index) => {
      contentHtml += `
        <div class="bg-blue-50 p-4 rounded-lg mb-6 shadow-sm">
          <h4 class="text-xl font-semibold text-blue-700 mb-3">Bab ${
            index + 1
          }: ${chapter.chapterTitle}</h4>
          <p class="text-gray-700">${chapter.chapterContent}</p>
        </div>
      `;
    });

    contentHtml += `
      <div class="bg-green-50 p-6 rounded-lg mb-6 shadow-md">
        <h3 class="text-2xl font-bold text-green-800 mb-4">Pesan Moral Cerita</h3>
        <p class="text-gray-700">${lessonData.moralLesson}</p>
      </div>
      <div class="bg-purple-50 p-6 rounded-lg mb-6 shadow-md">
        <h3 class="text-2xl font-bold text-purple-800 mb-4">Penilaian Cerita</h3>
        <h4 class="font-semibold text-purple-700 mb-2">Pertanyaan Pemahaman:</h4>
        ${lessonData.storyAssessment.comprehensionQuestions
          .map(
            (q, idx) => `
          <div class="mb-4">
            <p class="font-semibold text-gray-700">Soal ${idx + 1}: ${
              q.questionText
            }</p>
            <p class="text-sm text-gray-600 italic">Contoh Jawaban: ${
              q.correctAnswer
            }</p>
          </div>
        `
          )
          .join("")}
        <h4 class="font-semibold text-purple-700 mt-4 mb-2">Aktivitas Menjodohkan:</h4>
        ${lessonData.storyAssessment.matchingActivities
          .map(
            (activity, idx) => `
          <div class="mb-4">
            <p class="font-semibold text-gray-700">Aktivitas ${idx + 1}: ${
              activity.instructions
            }</p>
            <ul class="list-disc list-inside ml-4 text-gray-700">
              ${activity.pairs
                .map((pair) => `<li>${pair.term} - ${pair.match}</li>`)
                .join("")}
            </ul>
          </div>
        `
          )
          .join("")}
      </div>
      <div class="bg-yellow-50 p-6 rounded-lg shadow-md">
        <h3 class="text-2xl font-bold text-yellow-800 mb-4">Proyek Kreatifmu!</h3>
        <ul class="list-disc list-inside ml-4 text-gray-700">
          ${lessonData.creativeProjects
            .map((project) => `<li>${project}</li>`)
            .join("")}
        </ul>
      </div>
    `;
  } else {
    contentHtml = `<p class="text-gray-600 py-4">Model pembelajaran tidak dikenal atau data tidak lengkap.</p>`;
  }

  targetElement.innerHTML = contentHtml;
}

/**
 * Mengatur event listener untuk elemen-elemen form pembuatan materi (di modal).
 */
export function setupMateriFormListenersModal() {
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
  const cancelGenerateMaterialBtn = document.getElementById(
    "cancelGenerateMaterialModal"
  );

  // Update state on input change
  subjectInput?.addEventListener("input", (e) => {
    materialSubject = e.target.value;
    updateFormDisabledState();
  });
  topicInput?.addEventListener("input", (e) => {
    materialTopic = e.target.value;
    updateFormDisabledState();
  });
  modelSelect?.addEventListener("change", (e) => {
    selectedLearningModel = e.target.value;
    updateFormDisabledState();
  });
  subTopicsTextarea?.addEventListener("input", (e) => {
    materialSubTopics = e.target.value;
    updateFormDisabledState();
  });

  generateSubTopicsBtn?.addEventListener(
    "click",
    generateFokusPembahasanSuggestions
  );
  generateMaterialBtn?.addEventListener("click", generateMaterial);
  cancelGenerateMaterialBtn?.addEventListener("click", () => {
    renderModals({ showGenerateMaterialModal: false });
    // Reset form fields when modal is cancelled
    setFormValues("", "", "Eksplorasi Konsep & Diskusi Esai", "");
  });

  // Initial state update for modal elements
  setFormValues(
    materialSubject,
    materialTopic,
    selectedLearningModel,
    materialSubTopics
  );
  updateFormDisabledState();
}

/**
 * Mengatur listener real-time untuk materi guru dari Firestore.
 */
let unsubscribeMaterials;
function listenForMaterials() {
  const user = auth.currentUser;
  if (!user) {
    document.getElementById("materialsListContainer").innerHTML = `
      <div class="text-center text-gray-500 mt-8">
        <p>Anda harus login untuk melihat materi.</p>
      </div>
    `;
    if (unsubscribeMaterials) unsubscribeMaterials(); // Pastikan unsubscribe jika user logout
    return;
  }

  if (unsubscribeMaterials) unsubscribeMaterials(); // Unsubscribe listener sebelumnya

  const materialsCol = collection(db, "materials");
  const q = query(materialsCol, where("createdBy", "==", user.uid));

  unsubscribeMaterials = onSnapshot(
    q,
    (querySnapshot) => {
      const materials = [];
      querySnapshot.forEach((doc) => {
        materials.push({ id: doc.id, ...doc.data() });
      });
      // Sort materials by creation date, newest first
      materials.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB - dateA;
      });
      allGeneratedMaterials = materials; // Simpan data ke state global
      renderMaterialsList(allGeneratedMaterials); // Render UI daftar materi
    },
    (error) => {
      console.error("Error fetching materials:", error);
      showMessage("error", `Gagal memuat daftar materi: ${error.message}`);
    }
  );
}

/**
 * Fungsi utama untuk menginisialisasi tampilan Materi.
 * Dipanggil dari app.js saat tab Materi diaktifkan.
 */
export function renderMateriView() {
  // Pastikan elemen-elemen UI sudah ada sebelum mencoba menginisialisasi
  const materiViewElement = document.getElementById("materiView");
  if (!materiViewElement) {
    console.error("materiView element not found!");
    return;
  }

  // Tambahkan padding responsif ke container utama materiView
  materiViewElement.classList.add(
    "max-w-screen-lg",
    "mx-auto",
    "px-4",
    "sm:px-6",
    "lg:px-8"
  );

  // Render the main button and list containers
  materiViewElement.innerHTML = `
    <div class="card mb-8">
      <h2 class="card-header">Kelola Materi Pembelajaran</h2>
      <p class="text-gray-600 mb-4">
        Buat materi baru atau lihat materi yang sudah Anda buat.
      </p>
      <button id="showGenerateMaterialModalBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition duration-300 ease-in-out">
        <i class="fas fa-plus-circle mr-2"></i> Buat Materi Pembelajaran Baru
      </button>
    </div>

    <div class="card mt-8">
      <h2 class="card-header">Daftar Materi Tersimpan</h2>
      <div id="materialsListContainer">
        <!-- Materi yang sudah ada akan dirender di sini oleh JavaScript -->
        <p class="text-gray-600 py-4">Memuat daftar materi...</p>
      </div>
    </div>
  `;

  // Add listener for the "Buat Materi Pembelajaran Baru" button
  document
    .getElementById("showGenerateMaterialModalBtn")
    ?.addEventListener("click", () => {
      // Reset form values when opening the modal for a new generation
      setFormValues("", "", "Eksplorasi Konsep & Diskusi Esai", "");
      renderModals({ showGenerateMaterialModal: true });
    });

  listenForMaterials(); // Start listening for materials from Firestore
}
