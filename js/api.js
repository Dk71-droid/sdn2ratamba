// Konfigurasi Kunci API dan URL untuk layanan eksternal

// Ambil kunci API dari Environment Variables (Vercel)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Pastikan kunci API tersedia
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY tidak ditemukan di Environment Variables");
}

// URL dasar untuk Gemini API
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

export { GEMINI_API_KEY, GEMINI_API_URL };
