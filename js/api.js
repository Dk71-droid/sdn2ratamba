// Konfigurasi Kunci API dan URL untuk layanan eksternal
// Kunci API Gemini sekarang disimpan di Cloudflare Worker untuk keamanan.

// URL dasar untuk Cloudflare Worker yang akan menjadi proxy untuk Gemini API
// Ganti dengan URL Worker Anda yang sebenarnya!
const GEMINI_API_URL = "gemini-api-worker.tutorku.workers.dev";

// Variabel GEMINI_API_KEY tidak lagi diekspor dari sini
// Karena sekarang dikelola secara rahasia di sisi server.
// const GEMINI_API_KEY = "YOUR_API_KEY_DI_SINI"; // Hapus baris ini

// Ekspor variabel agar bisa digunakan di modul lain
export { GEMINI_API_URL };
