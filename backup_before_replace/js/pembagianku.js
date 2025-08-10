// js/pembagianku.js
// Logika dan data untuk Trik Cepat Pembagian yang diambil dari pembagian.html.
// File ini dirancang untuk menjadi modul yang mandiri dan dapat diimpor.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global Firebase variables
let app;
let db;
let auth;
let userId;

// Status dan data aplikasi
let highestCompletedLevel = 0;
let currentQuestions = [];
let currentQuestionIndex = 0;
let currentLevel = null;

// Timer variables
let timerInterval;
let timeRemaining;
const questionTimeLimit = 15; // Waktu batas untuk setiap soal (detik)

// Test specific variables
let testScore = 0;
const totalTestQuestions = 10;
let isTestLevel = false;
const testDurationSeconds = 120; // 2 menit untuk level tes
let testTimerInterval;

// Firebase Configuration (provided by Canvas environment)
const firebaseConfig =
  typeof __firebase_config !== "undefined" ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
const initialAuthToken =
  typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

// Data soal dan trik untuk setiap level
const allOriginalQuestions = {
  "A.1": [
    { q: "2 ÷ 2", a: "1", trik: "A.1" },
    { q: "4 ÷ 2", a: "2", trik: "A.1" },
    { q: "6 ÷ 2", a: "3", trik: "A.1" },
    { q: "8 ÷ 2", a: "4", trik: "A.1" },
  ],
  "A.2": [
    { q: "20 ÷ 2", a: "10", trik: "A.2" },
    { q: "40 ÷ 2", a: "20", trik: "A.2" },
    { q: "60 ÷ 2", a: "30", trik: "A.2" },
    { q: "80 ÷ 2", a: "40", trik: "A.2" },
    { q: "100 ÷ 2", a: "50", trik: "A.2" },
  ],
  "A.3": [
    { q: "24 ÷ 2", a: "12", trik: "A.3" },
    { q: "46 ÷ 2", a: "23", trik: "A.3" },
    { q: "68 ÷ 2", a: "34", trik: "A.3" },
    { q: "82 ÷ 2", a: "41", trik: "A.3" },
    { q: "26 ÷ 2", a: "13", trik: "A.3" },
  ],
  "A.4": [
    { q: "28 ÷ 2", a: "14", trik: "A.4" },
    { q: "42 ÷ 2", a: "21", trik: "A.4" },
    { q: "64 ÷ 2", a: "32", trik: "A.4" },
    { q: "86 ÷ 2", a: "43", trik: "A.4" },
    { q: "88 ÷ 2", a: "44", trik: "A.4" },
  ],
  "B.1": [
    { q: "25 ÷ 5", a: "5", trik: "B.1" },
    { q: "35 ÷ 5", a: "7", trik: "B.1" },
    { q: "45 ÷ 5", a: "9", trik: "B.1" },
    { q: "65 ÷ 5", a: "13", trik: "B.1" },
    { q: "75 ÷ 5", a: "15", trik: "B.1" },
  ],
  "B.2": [
    { q: "250 ÷ 5", a: "50", trik: "B.2" },
    { q: "350 ÷ 5", a: "70", trik: "B.2" },
    { q: "450 ÷ 5", a: "90", trik: "B.2" },
    { q: "650 ÷ 5", a: "130", trik: "B.2" },
    { q: "750 ÷ 5", a: "150", trik: "B.2" },
  ],
  "B.3": [
    { q: "25 ÷ 2.5", a: "10", trik: "B.3" },
    { q: "35 ÷ 2.5", a: "14", trik: "B.3" },
    { q: "45 ÷ 2.5", a: "18", trik: "B.3" },
    { q: "65 ÷ 2.5", a: "26", trik: "B.3" },
    { q: "75 ÷ 2.5", a: "30", trik: "B.3" },
  ],
  "C.1": [
    { q: "123 ÷ 3", a: "41", trik: "C.1" },
    { q: "456 ÷ 3", a: "152", trik: "C.1" },
    { q: "789 ÷ 3", a: "263", trik: "C.1" },
    { q: "987 ÷ 3", a: "329", trik: "C.1" },
    { q: "369 ÷ 3", a: "123", trik: "C.1" },
  ],
  "C.2": [
    { q: "246 ÷ 6", a: "41", trik: "C.2" },
    { q: "369 ÷ 9", a: "41", trik: "C.2" },
    { q: "4812 ÷ 12", a: "401", trik: "C.2" },
    { q: "6129 ÷ 9", a: "681", trik: "C.2" },
    { q: "12369 ÷ 3", a: "4123", trik: "C.2" },
  ],
  "C.3": [
    { q: "18 ÷ 9", a: "2", trik: "C.3" },
    { q: "27 ÷ 9", a: "3", trik: "C.3" },
    { q: "36 ÷ 9", a: "4", trik: "C.3" },
    { q: "45 ÷ 9", a: "5", trik: "C.3" },
    { q: "54 ÷ 9", a: "6", trik: "C.3" },
  ],
  Test: [
    { q: "24 ÷ 2", a: "12" },
    { q: "20 ÷ 2", a: "10" },
    { q: "25 ÷ 5", a: "5" },
    { q: "45 ÷ 5", a: "9" },
    { q: "123 ÷ 3", a: "41" },
    { q: "369 ÷ 9", a: "41" },
    { q: "27 ÷ 9", a: "3" },
    { q: "60 ÷ 2", a: "30" },
    { q: "75 ÷ 5", a: "15" },
    { q: "456 ÷ 3", a: "152" },
  ],
};

const allTricks = {
  "A.1": "Pembagian dengan 2 untuk angka genap satuan (2, 4, 6, 8)",
  "A.2": "Pembagian dengan 2 untuk angka genap puluhan (20, 40, 60, 80)",
  "A.3": "Pembagian dengan 2 untuk angka genap yang tidak beraturan",
  "A.4":
    "Pembagian dengan 2 untuk angka genap yang tidak beraturan dengan trik yang lebih kompleks",
  "B.1": "Pembagian dengan 5 untuk angka berakhiran 5",
  "B.2": "Pembagian dengan 5 untuk angka berakhiran 0",
  "B.3": "Pembagian dengan 2.5 dengan trik cepat",
  "C.1": "Pembagian dengan 3 untuk angka yang jumlah digitnya bisa dibagi 3",
  "C.2": "Pembagian dengan 6, 9, 12, dan 15",
  "C.3": "Trik Pembagian dengan 9",
};

const allLevelInstructions = {
  "A.1":
    "Pada level ini, kamu akan mempelajari trik pembagian dengan 2 untuk angka genap satuan. Caranya sangat mudah, cukup bagi angka tersebut dengan 2.",
  "A.2":
    "Level ini fokus pada pembagian angka puluhan yang genap dengan 2. Triknya, kamu hanya perlu membagi angka pertama dengan 2, lalu tambahkan angka 0 di belakangnya.",
  "A.3":
    "Di level ini, kamu akan menghadapi pembagian dengan 2 untuk angka genap yang tidak beraturan. Triknya adalah memisahkan angka puluhan dan satuan, lalu bagi masing-masing dengan 2, kemudian gabungkan hasilnya.",
  "A.4":
    "Level ini melanjutkan trik pembagian dengan 2 untuk angka genap yang lebih kompleks. Fokuslah pada setiap digit secara terpisah dan bagi dengan 2.",
  "B.1":
    "Untuk pembagian dengan 5 untuk angka yang berakhiran 5, triknya adalah kalikan angka tersebut dengan 2, lalu bagi dengan 10. Atau, cara termudah adalah tambahkan 5 ke angka tersebut, lalu bagi dengan 10.",
  "B.2":
    "Level ini tentang pembagian dengan 5 untuk angka yang berakhiran 0. Triknya, buang angka 0 di belakang, lalu kalikan dengan 2.",
  "B.3":
    "Untuk membagi dengan 2.5, triknya adalah kalikan angka yang dibagi dengan 4, lalu bagi dengan 10. Misalnya, 25 ÷ 2.5 sama dengan 25 x 4 = 100, lalu 100 ÷ 10 = 10.",
  "C.1":
    "Pembagian dengan 3 dapat dilakukan dengan menjumlahkan semua digit dari angka yang dibagi. Jika hasilnya bisa dibagi 3, maka angka tersebut juga bisa dibagi 3.",
  "C.2":
    "Trik pada level ini adalah untuk pembagian dengan 6, 9, 12, dan 15. Triknya hampir sama dengan trik pembagian dengan 3, di mana kamu hanya perlu menjumlahkan semua digitnya, lalu bagi dengan angka yang membagi itu.",
  "C.3":
    "Trik pembagian dengan 9: jumlahkan semua digit dari angka yang dibagi, jika hasilnya bisa dibagi 9, maka angka tersebut juga bisa dibagi 9. Trik ini juga dapat digunakan untuk menemukan sisa dari pembagian. Sebagai contoh, 123 ÷ 9, jumlahkan digitnya 1+2+3=6, jadi sisa pembagiannya adalah 6.",
  Test: "Ini adalah level tes yang menguji semua trik yang telah kamu pelajari. Kamu harus menjawab 10 soal dalam waktu 2 menit. Semoga berhasil!",
};

/**
 * Mengacak array di tempat (Fisher-Yates shuffle).
 * @param {Array} array - Array yang akan diacak.
 */
function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

/**
 * Mengambil data level terakhir yang diselesaikan dari Firestore.
 */
async function fetchHighestCompletedLevel() {
  if (!db || !userId) {
    console.error("Firestore or user not initialized.");
    return;
  }
  try {
    const userDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/division_tricks`,
      "progress"
    );
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      highestCompletedLevel = docSnap.data().level || 0;
    } else {
      highestCompletedLevel = 0;
      await setDoc(userDocRef, { level: 0 }, { merge: true });
    }
    console.log("Highest completed level fetched:", highestCompletedLevel);
  } catch (e) {
    console.error("Error fetching highest completed level:", e);
  }
}

/**
 * Menyimpan data level terakhir yang diselesaikan ke Firestore.
 * @param {number} level - Level tertinggi yang diselesaikan.
 */
async function saveHighestCompletedLevel(level) {
  if (!db || !userId) {
    console.error("Firestore or user not initialized.");
    return;
  }
  try {
    if (level > highestCompletedLevel) {
      const userDocRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/division_tricks`,
        "progress"
      );
      await setDoc(userDocRef, { level: level }, { merge: true });
      highestCompletedLevel = level;
      console.log("Highest completed level saved:", highestCompletedLevel);
    }
  } catch (e) {
    console.error("Error saving highest completed level:", e);
  }
}

/**
 * Menginisialisasi Firebase dan autentikasi.
 */
async function initializeFirebase() {
  try {
    if (Object.keys(firebaseConfig).length === 0) {
      console.error("Firebase config is missing.");
      throw new Error("Firebase config is missing.");
    }

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    if (initialAuthToken) {
      await signInWithCustomToken(auth, initialAuthToken);
    } else {
      await signInAnonymously(auth);
    }

    onAuthStateChanged(auth, (user) => {
      if (user) {
        userId = user.uid;
        fetchHighestCompletedLevel().then(() => {
          // Setelah level tertinggi diambil, panggil fungsi untuk merender
          // Tampilan utama. Fungsi ini perlu diimpor atau didefinisikan di file utama.
        });
      } else {
        userId = crypto.randomUUID();
        console.warn("User not authenticated, using anonymous ID.");
      }
    });
  } catch (error) {
    console.error("Error initializing Firebase or authenticating:", error);
    userId = crypto.randomUUID();
  }
}

/**
 * Merender UI utama untuk aplikasi pembagian.
 *
 * @param {HTMLElement} containerElement - Elemen DOM tempat UI akan dirender.
 * @param {Function} onSelectLevel - Callback untuk menangani pemilihan level.
 */
export function renderPembagiankuApp(containerElement, onSelectLevel) {
  if (!containerElement) {
    console.error("Pembagianku container element not found.");
    return;
  }

  containerElement.innerHTML = `
    <!-- Main Category & Level Selection Screen -->
    <div id="main-selection-screen" class="w-full text-center flex flex-col flex-grow pt-4">
      <h1 class="text-3xl font-bold text-blue-800 mb-6 flex-shrink-0">
        Pilih Level Trik Pembagian
      </h1>

      <!-- Overall Progress Summary -->
      <div id="overall-progress-summary" class="bg-indigo-100 text-indigo-800 font-semibold py-2 px-4 rounded-lg mb-4 mx-auto w-full max-w-xs">
        <!-- Progress text will be inserted here by JavaScript -->
      </div>

      <!-- Level Progress Visualizer (Minimalist Graph) -->
      <div id="level-progress-visualizer" class="flex justify-center items-center gap-2 mb-6 flex-wrap">
        <!-- Dots will be injected here by JavaScript -->
      </div>

      <!-- The flex-grow and overflow-y-auto on category-list should now work correctly -->
      <div id="category-and-level-list" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto flex-grow pb-8 min-h-0">
        <!-- Categories and Level buttons will be injected here by JavaScript -->
      </div>
    </div>

    <!-- Game Screen (Hidden by default) -->
    <div id="game-screen" class="hidden w-full flex flex-col flex-grow">
      <!-- Header Bar -->
      <div class="flex justify-between items-center p-2 mb-2 bg-white rounded-t-lg">
        <button
          id="pembagianku-back-button"
          class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-3 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-110"
        >
          &larr;
        </button>
        <h2 id="current-level-title" class="text-xl font-semibold text-blue-700"></h2>
        <!-- Timer Display -->
        <div id="timer-display" class="text-lg font-bold text-red-600"></div>
      </div>

      <!-- Instruction Hint for Level 5 -->
      <div
        id="level5-instruction-hint"
        class="hidden bg-blue-100 text-blue-800 font-semibold py-2 px-4 rounded-lg mb-4 mx-auto w-full max-w-xs text-center"
      >
        Fokuslah menghafal pola soal ini! Ini adalah dasar trik selanjutnya.
      </div>

      <!-- Progress Bar -->
      <div id="progress-container" class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
        <div id="progress-bar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
      </div>

      <!-- Main Content Area -->
      <div class="flex flex-col items-center justify-start px-2 min-h-0 overflow-y-auto">
        <!-- Trick Description Display -->
        <div id="trick-description-display" class="hidden w-full mb-1 mt-1">
          <p class="font-bold mb-1">Trik yang Digunakan:</p>
          <p id="current-trick-text"></p>
        </div>

        <!-- Card Container -->
        <div id="flash-card" class="flip-card mb-1">
          <div class="flip-card-inner">
            <div class="flip-card-front">
              <p class="text-5xl font-bold mb-2" id="question-text">?</p>
              <p id="card-feedback-message-front" class="card-feedback-message"></p>
            </div>
            <div class="flip-card-back">
              <p class="text-5xl font-bold mb-2" id="answer-text"></p>
              <p id="card-feedback-message-back" class="card-feedback-message"></p>
            </div>
          </div>
        </div>

        <!-- Score Display for Test Level -->
        <div
          id="test-score-display"
          class="hidden bg-blue-100 text-blue-800 font-bold py-2 px-4 rounded-lg shadow-md mb-4 w-full max-w-xs text-center"
        >
          Skor: <span id="current-score">0</span> /
          <span id="total-test-questions">0</span>
        </div>
      </div>

      <!-- Input Methods -->
      <div class="flex flex-col gap-3 w-full max-w-xs mx-auto px-2 pb-2 flex-shrink-0 mt-1">
        <input
          type="number"
          id="manual-input"
          placeholder="Ketik jawaban di sini..."
          class="p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg"
        />
      </div>
    </div>

    <!-- Hafalan Screen (Hidden by default) -->
    <div id="hafalan-screen" class="hidden w-full flex flex-col flex-grow items-center justify-center p-4 text-center">
      <h2 id="hafalan-title" class="text-3xl font-bold text-purple-700 mb-6"></h2>
      <div id="hafalan-trick-display" class="bg-purple-50 border-2 border-purple-300 text-purple-800 p-4 rounded-lg shadow-md max-w-md mx-auto mb-8">
        <p class="font-bold text-xl mb-2">Trik:</p>
        <p id="hafalan-trick-text" class="text-lg"></p>
      </div>
      <button id="hafalan-complete-button" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105">
        Saya Sudah Hafal!
      </button>
    </div>

    <!-- Instruction Modal (Hidden by default) -->
    <div id="instruction-modal" class="modal-backdrop hidden">
      <div class="modal-content">
        <button class="modal-close-button" id="modal-close-button">&times;</button>
        <h2 id="modal-title" class="text-2xl font-bold text-blue-700 mb-4"></h2>
        <div id="modal-instruction-text" class="text-gray-700 text-base leading-relaxed">
          <!-- Instruction content will be injected here -->
        </div>
      </div>
    </div>
  `;

  // --- UI Element References ---
  const mainSelectionScreen = containerElement.querySelector(
    "#main-selection-screen"
  );
  const gameScreen = containerElement.querySelector("#game-screen");
  const hafalanScreen = containerElement.querySelector("#hafalan-screen");
  const backArrowButton = containerElement.querySelector(
    "#pembagianku-back-button"
  );

  const questionText = containerElement.querySelector("#question-text");
  const answerText = containerElement.querySelector("#answer-text");
  const manualInput = containerElement.querySelector("#manual-input");

  const cardFrontFeedback = containerElement.querySelector(
    "#card-feedback-message-front"
  );
  const cardBackFeedback = containerElement.querySelector(
    "#card-feedback-message-back"
  );
  const flashCard = containerElement.querySelector("#flash-card");
  const progressBar = containerElement.querySelector("#progress-bar");
  const currentLevelTitle = containerElement.querySelector(
    "#current-level-title"
  );
  const timerDisplay = containerElement.querySelector("#timer-display");

  const level5InstructionHint = containerElement.querySelector(
    "#level5-instruction-hint"
  );
  const trickDescriptionDisplay = containerElement.querySelector(
    "#trick-description-display"
  );
  const currentTrickText = containerElement.querySelector(
    "#current-trick-text"
  );

  const hafalanTitle = containerElement.querySelector("#hafalan-title");
  const hafalanTrickText = containerElement.querySelector(
    "#hafalan-trick-text"
  );
  const hafalanCompleteButton = containerElement.querySelector(
    "#hafalan-complete-button"
  );

  const overallProgressSummary = containerElement.querySelector(
    "#overall-progress-summary"
  );
  const levelProgressVisualizer = containerElement.querySelector(
    "#level-progress-visualizer"
  );
  const categoryAndLevelList = containerElement.querySelector(
    "#category-and-level-list"
  );

  const instructionModal = containerElement.querySelector("#instruction-modal");
  const modalCloseButton = containerElement.querySelector(
    "#modal-close-button"
  );
  const modalTitle = containerElement.querySelector("#modal-title");
  const modalInstructionText = containerElement.querySelector(
    "#modal-instruction-text"
  );

  const testScoreDisplay = containerElement.querySelector(
    "#test-score-display"
  );
  const currentScoreElement = containerElement.querySelector("#current-score");
  const totalTestQuestionsElement = containerElement.querySelector(
    "#total-test-questions"
  );

  /**
   * Menampilkan atau menyembunyikan elemen UI.
   * @param {HTMLElement} element - Elemen DOM.
   * @param {boolean} show - true untuk menampilkan, false untuk menyembunyikan.
   */
  const toggleVisibility = (element, show) => {
    if (element) {
      element.classList.toggle("hidden", !show);
    }
  };

  /**
   * Menampilkan pesan modal dengan judul dan teks.
   * @param {string} title - Judul modal.
   * @param {string} message - Teks pesan.
   */
  const showInstructionModal = (title, message) => {
    modalTitle.textContent = title;
    modalInstructionText.innerHTML = message;
    toggleVisibility(instructionModal, true);
  };

  /**
   * Menyembunyikan pesan modal.
   */
  const hideInstructionModal = () => {
    toggleVisibility(instructionModal, false);
  };

  /**
   * Merender tombol level dan visualizer.
   */
  const renderLevelButtons = () => {
    categoryAndLevelList.innerHTML = "";
    levelProgressVisualizer.innerHTML = "";
    let levelNumber = 0;

    const categories = {
      "Trik Pembagian dengan 2": ["A.1", "A.2", "A.3", "A.4"],
      "Trik Pembagian dengan 5": ["B.1", "B.2", "B.3"],
      "Trik Pembagian dengan 3 & 9": ["C.1", "C.2", "C.3"],
      "Tes Akhir": ["Test"],
    };

    let totalLevels = 0;
    for (const category in categories) {
      totalLevels += categories[category].length;
    }

    let completedLevelsCount = 0;

    for (const category in categories) {
      const categoryContainer = document.createElement("div");
      categoryContainer.className =
        "flex flex-col col-span-2 md:col-span-3 lg:col-span-4";
      categoryContainer.innerHTML = `<h3 class="text-xl font-bold text-gray-700 mb-2 mt-4 text-left col-span-full">${category}</h3>`;
      categoryAndLevelList.appendChild(categoryContainer);

      const levelButtonsContainer = document.createElement("div");
      levelButtonsContainer.className =
        "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";
      categoryAndLevelList.appendChild(levelButtonsContainer);

      categories[category].forEach((levelKey) => {
        levelNumber++;
        const isLevelTest = levelKey === "Test";
        const isLocked = levelNumber > highestCompletedLevel + 1;
        const isCompleted = levelNumber <= highestCompletedLevel;

        if (isCompleted && !isLevelTest) {
          completedLevelsCount++;
        }

        const levelButton = document.createElement("button");
        levelButton.className = `level-button text-white w-full ${
          isLocked
            ? "bg-slate-300 text-slate-600 cursor-not-allowed"
            : isCompleted
            ? "bg-emerald-500 text-white hover:bg-emerald-600"
            : "bg-indigo-500 hover:bg-indigo-600"
        }`;
        levelButton.disabled = isLocked;
        levelButton.setAttribute("data-level-key", levelKey);

        const levelTitle = isLevelTest ? "Tes Akhir" : `Level ${levelKey}`;
        levelButton.innerHTML = `
          <span>${levelTitle}</span>
          ${isLocked ? '<i class="fa-solid fa-lock ml-2"></i>' : ""}
        `;

        levelButton.addEventListener("click", () => {
          if (!isLocked) {
            onSelectLevel(levelKey);
          }
        });
        levelButtonsContainer.appendChild(levelButton);

        // Render progress visualizer dot
        const dot = document.createElement("div");
        dot.className = `w-4 h-4 rounded-full border-2 transition-colors duration-300 ${
          isCompleted
            ? "bg-emerald-500 border-emerald-500"
            : "bg-gray-300 border-gray-400"
        }`;
        levelProgressVisualizer.appendChild(dot);
      });
    }

    const totalPlayableLevels = levelNumber - 1; // Kurangi 1 untuk level Test
    const progressPercentage =
      totalPlayableLevels > 0
        ? ((completedLevelsCount / totalPlayableLevels) * 100).toFixed(0)
        : 0;
    overallProgressSummary.textContent = `Progresmu: ${completedLevelsCount} / ${totalPlayableLevels} (${progressPercentage}%)`;
  };

  /**
   * Mengatur tampilan UI untuk layar permainan.
   */
  const showGameScreen = () => {
    toggleVisibility(mainSelectionScreen, false);
    toggleVisibility(gameScreen, true);
    toggleVisibility(hafalanScreen, false);
    manualInput.focus();
  };

  /**
   * Mengatur tampilan UI untuk layar hafalan.
   */
  const showHafalanScreen = () => {
    toggleVisibility(mainSelectionScreen, false);
    toggleVisibility(gameScreen, false);
    toggleVisibility(hafalanScreen, true);
  };

  /**
   * Mengatur tampilan UI untuk layar utama.
   */
  const showMainSelectionScreen = () => {
    toggleVisibility(mainSelectionScreen, true);
    toggleVisibility(gameScreen, false);
    toggleVisibility(hafalanScreen, false);
    renderLevelButtons();
  };

  /**
   * Memulai timer untuk soal atau tes.
   */
  const startTimer = () => {
    if (isTestLevel) {
      timeRemaining = testDurationSeconds;
      timerDisplay.classList.remove("hidden");
      testTimerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        if (timeRemaining <= 0) {
          clearInterval(testTimerInterval);
          finishTest();
        }
      }, 1000);
    } else {
      timeRemaining = questionTimeLimit;
      timerDisplay.classList.remove("hidden");
      timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        if (timeRemaining <= 0) {
          clearInterval(timerInterval);
          handleIncorrectAnswer();
        }
      }, 1000);
    }
  };

  /**
   * Memperbarui tampilan timer.
   */
  const updateTimerDisplay = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
    timerDisplay.textContent = formattedTime;
  };

  /**
   * Menghentikan semua timer.
   */
  const stopTimers = () => {
    clearInterval(timerInterval);
    clearInterval(testTimerInterval);
    timerDisplay.classList.add("hidden");
  };

  /**
   * Memuat dan memulai level yang dipilih.
   * @param {string} levelKey - Kunci level yang dipilih (misalnya "A.1").
   */
  const loadLevel = (levelKey) => {
    currentLevel = levelKey;
    isTestLevel = levelKey === "Test";
    currentQuestionIndex = 0;
    currentScoreElement.textContent = "0";

    currentQuestions = shuffle([...allOriginalQuestions[levelKey]]);
    if (isTestLevel) {
      testScore = 0;
      totalTestQuestionsElement.textContent = totalTestQuestions;
      currentQuestions = currentQuestions.slice(0, totalTestQuestions); // Ambil 10 soal acak
      showInstructionModal(
        "Instruksi Tes Akhir",
        "Kamu akan menjawab 10 soal acak dari semua trik yang sudah kamu pelajari. Waktu pengerjaanmu hanya 2 menit. Semoga berhasil!"
      );
      // Start the game after modal is closed
      modalCloseButton.addEventListener(
        "click",
        () => {
          startGame();
          modalCloseButton.removeEventListener("click", startGame);
        },
        { once: true }
      );
    } else {
      startGame();
    }
  };

  const startGame = () => {
    showGameScreen();
    currentLevelTitle.textContent = `Level ${currentLevel}`;

    toggleVisibility(
      level5InstructionHint,
      currentLevel === "A.4" || currentLevel === "B.3"
    );
    toggleVisibility(trickDescriptionDisplay, !isTestLevel);
    toggleVisibility(testScoreDisplay, isTestLevel);

    if (isTestLevel) {
      // Set the progress bar for the entire test
      progressBar.style.width = "0%";
      startTimer();
      showNextQuestion();
    } else {
      // Show instructions for non-test levels
      showInstructionModal(
        `Instruksi Level ${currentLevel}`,
        allLevelInstructions[currentLevel]
      );
      // After modal is closed, show hafalan screen
      modalCloseButton.addEventListener(
        "click",
        () => {
          showHafalanScreen();
          hafalanTitle.textContent = `Hafalan Trik Level ${currentLevel}`;
          hafalanTrickText.textContent = allTricks[currentLevel];
          hafalanCompleteButton.addEventListener(
            "click",
            () => {
              showGameScreen();
              manualInput.focus();
              startTimer();
              showNextQuestion();
            },
            { once: true }
          );
        },
        { once: true }
      );
    }
  };

  /**
   * Menampilkan soal berikutnya.
   */
  const showNextQuestion = () => {
    stopTimers();
    manualInput.value = "";
    manualInput.disabled = false;
    manualInput.focus();
    flashCard.classList.remove("flipped");
    toggleVisibility(cardFrontFeedback, false);
    toggleVisibility(cardBackFeedback, false);

    if (currentQuestionIndex < currentQuestions.length) {
      const question = currentQuestions[currentQuestionIndex];
      questionText.textContent = question.q;
      answerText.textContent = question.a;
      if (!isTestLevel) {
        currentTrickText.textContent = allTricks[question.trik];
      }

      if (!isTestLevel) {
        // Start individual question timer for non-test levels
        startTimer();
        // Update progress bar
        const progress = (currentQuestionIndex / currentQuestions.length) * 100;
        progressBar.style.width = `${progress}%`;
      }
    } else {
      // Level selesai
      stopTimers();
      handleLevelComplete();
    }
  };

  /**
   * Menangani jawaban yang benar.
   */
  const handleCorrectAnswer = () => {
    stopTimers();
    manualInput.disabled = true;
    flashCard.classList.add("flipped");
    const feedbackElement = flashCard.classList.contains("flipped")
      ? cardBackFeedback
      : cardFrontFeedback;
    feedbackElement.textContent = "Jawaban Benar!";
    feedbackElement.className = "card-feedback-message feedback-correct";
    toggleVisibility(feedbackElement, true);
    if (isTestLevel) {
      testScore++;
      currentScoreElement.textContent = testScore;
      // Langsung ke soal berikutnya tanpa menunggu flip card selesai
      setTimeout(showNextQuestion, 1000);
    } else {
      setTimeout(() => {
        currentQuestionIndex++;
        showNextQuestion();
      }, 1000);
    }
  };

  /**
   * Menangani jawaban yang salah.
   */
  const handleIncorrectAnswer = () => {
    stopTimers();
    manualInput.disabled = true;
    const feedbackElement = flashCard.classList.contains("flipped")
      ? cardBackFeedback
      : cardFrontFeedback;
    feedbackElement.textContent = "Salah!";
    feedbackElement.className = "card-feedback-message feedback-incorrect";
    toggleVisibility(feedbackElement, true);
    flashCard.classList.add("flipped");
    if (isTestLevel) {
      // Langsung ke soal berikutnya tanpa menunggu flip card selesai
      setTimeout(showNextQuestion, 1000);
    } else {
      setTimeout(() => {
        currentQuestionIndex++;
        showNextQuestion();
      }, 1000);
    }
  };

  /**
   * Memproses jawaban dari input.
   */
  const processAnswer = () => {
    const userAnswer = manualInput.value;
    if (userAnswer === "") return; // Jangan memproses jawaban kosong

    const correctAnswer = currentQuestions[currentQuestionIndex].a;
    if (userAnswer.trim() === correctAnswer) {
      handleCorrectAnswer();
    } else {
      handleIncorrectAnswer();
    }
  };

  /**
   * Menyelesaikan level tes.
   */
  const finishTest = () => {
    stopTimers();
    const finalScore = testScore;
    const passThreshold = totalTestQuestions * 0.7;
    let message = "";
    if (finalScore >= passThreshold) {
      saveHighestCompletedLevel(Object.keys(allOriginalQuestions).length - 1);
      message = `Selamat! Kamu lulus tes dengan skor ${finalScore}/${totalTestQuestions}.`;
    } else {
      message = `Sayang sekali, kamu belum lulus tes. Skor: ${finalScore}/${totalTestQuestions}. Coba lagi!`;
    }
    showInstructionModal("Hasil Tes", message);
    modalCloseButton.addEventListener("click", showMainSelectionScreen, {
      once: true,
    });
  };

  /**
   * Menangani penyelesaian level.
   */
  const handleLevelComplete = () => {
    if (isTestLevel) {
      finishTest();
      return;
    }

    const currentLevelKey = currentLevel;
    const levelKeys = Object.keys(allOriginalQuestions);
    const currentLevelIndex = levelKeys.indexOf(currentLevelKey);
    const nextLevelIndex = currentLevelIndex + 1;

    if (currentLevelIndex + 1 > highestCompletedLevel) {
      saveHighestCompletedLevel(currentLevelIndex + 1);
    }

    if (nextLevelIndex < levelKeys.length) {
      const nextLevelKey = levelKeys[nextLevelIndex];
      showInstructionModal(
        "Level Selesai!",
        `Selamat! Kamu telah menyelesaikan Level ${currentLevelKey}. Sekarang kamu bisa melanjutkan ke Level ${nextLevelKey}.`
      );
    } else {
      showInstructionModal(
        "Selamat!",
        "Kamu telah menyelesaikan semua level latihan. Sekarang waktunya mencoba Level Tes!"
      );
    }
    modalCloseButton.addEventListener("click", showMainSelectionScreen, {
      once: true,
    });
  };

  // --- Event Listeners ---
  manualInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !manualInput.disabled) {
      processAnswer();
    }
  });

  backArrowButton.addEventListener("click", () => {
    stopTimers();
    showMainSelectionScreen();
  });

  modalCloseButton.addEventListener("click", hideInstructionModal);

  // Initialize Firebase and then the app logic
  initializeFirebase().then(() => {
    showMainSelectionScreen();
  });
}

/**
 * Merender CSS yang diperlukan untuk aplikasi Pembagianku.
 * Fungsi ini dapat dipanggil dari file utama untuk memastikan gaya yang benar.
 */
export function renderPembagiankuCSS() {
  const style = document.createElement("style");
  style.textContent = `
    .flip-card {
      perspective: 1000px;
      width: 100%;
      max-width: 300px;
      height: 200px;
      margin: auto;
    }
    .flip-card-inner {
      position: relative;
      width: 100%;
      height: 100%;
      text-align: center;
      transition: transform 0.6s;
      transform-style: preserve-3d;
    }
    .flip-card.flipped .flip-card-inner {
      transform: rotateY(180deg);
    }
    .flip-card-front,
    .flip-card-back {
      position: absolute;
      width: 100%;
      height: 100%;
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      border-radius: 0.75rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
        0 4px 6px -2px rgba(0, 0, 0, 0.05);
      padding: 1rem;
    }
    .flip-card-front {
      background-color: #f0f9ff;
      color: #1e40af;
    }
    .flip-card-back {
      background-color: #dbeafe;
      color: #1e40af;
      transform: rotateY(180deg);
    }
    body {
      font-family: "Inter", sans-serif;
    }
    .card-feedback-message {
      font-size: 1.25rem;
      font-weight: bold;
      margin-top: 0.5rem;
      padding: 0.25rem 0.75rem;
      border-radius: 0.375rem;
      display: none;
    }
    .card-feedback-message.feedback-correct {
      background-color: #d1fae5;
      color: #065f46;
    }
    .card-feedback-message.feedback-incorrect {
      background-color: #fee2e2;
      color: #991b1b;
    }
    #trick-description-display {
      background-color: #fffbeb;
      border: 1px solid #fcd34d;
      color: #b45309;
      padding: 0.75rem;
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      text-align: center;
      width: 100%;
    }
    .level-button {
      background-color: #6366f1;
      font-weight: bold;
      padding: 1rem 1.5rem;
      border-radius: 0.75rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06);
      transition: background-color 0.2s, transform 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .level-button:hover:not(:disabled) {
      background-color: #4f46e5;
      transform: translateY(-2px);
    }
    .level-button:disabled {
      background-color: #cbd5e1;
      color: #64748b;
      cursor: not-allowed;
      box-shadow: none;
    }
    .level-button.locked svg {
      fill: #64748b;
    }
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .modal-content {
      background-color: #fff;
      padding: 1.5rem;
      border-radius: 0.75rem;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
      max-width: 90%;
      max-height: 90%;
      overflow-y: auto;
      position: relative;
    }
    .modal-close-button {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #666;
    }
  `;
  document.head.appendChild(style);
}
