// api/gemini.js
// Ini adalah serverless function yang akan berjalan di Vercel.

// Mengimpor library Google Generative AI.
// Pastikan library ini sudah terdaftar di 'dependencies' pada package.json.
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inisialisasi Gemini API.
// Kunci API diambil dari environment variable Vercel (process.env.GEMINI_API_KEY).
// Kunci ini TIDAK akan terekspos di kode frontend.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Pilih model Gemini yang akan digunakan.
// Sesuaikan dengan model yang kamu gunakan di aplikasi frontend sebelumnya (misal: "gemini-2.0-flash").
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Ini adalah fungsi handler utama untuk serverless function.
// Vercel secara otomatis akan memanggil fungsi ini saat endpoint diakses.
module.exports = async (req, res) => {
  // Mengatur header CORS (Cross-Origin Resource Sharing).
  // Ini penting agar frontend (yang mungkin berada di domain berbeda) bisa mengakses fungsi ini.
  // Untuk keamanan lebih, ganti '*' dengan domain spesifik frontend-mu (misal: 'https://namaprojekmu.vercel.app').
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); // Metode HTTP yang diizinkan
  res.setHeader("Access-Control-Allow-Headers", "Content-Type"); // Header yang diizinkan

  // Menangani permintaan 'OPTIONS' (preflight request) yang dikirim browser sebelum permintaan POST/GET sebenarnya.
  if (req.method === "OPTIONS") {
    res.status(200).end(); // Kirim respons 200 OK untuk preflight
    return;
  }

  // Memastikan metode permintaan adalah POST.
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ error: "Metode Tidak Diizinkan. Hanya POST yang diizinkan." });
  }

  // Memastikan ada body pada permintaan.
  if (!req.body) {
    return res.status(400).json({ error: "Body permintaan tidak ada." });
  }

  try {
    // Mengurai body permintaan yang dikirim dari frontend (diasumsikan dalam format JSON).
    const { prompt, generationConfig } = req.body;

    // Validasi bahwa 'prompt' ada.
    if (!prompt) {
      return res.status(400).json({ error: "Prompt diperlukan." });
    }

    // Membangun payload untuk dikirim ke Gemini API.
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    // Jika 'generationConfig' disediakan dari frontend, tambahkan ke payload.
    if (generationConfig) {
      payload.generationConfig = generationConfig;
    }

    // Memanggil Gemini API dengan payload yang sudah disiapkan.
    const result = await model.generateContent(payload);
    const response = await result.response;
    const text = response.text(); // Mengambil teks hasil generate dari respons Gemini.

    // Mengirim hasil kembali ke frontend dalam format JSON.
    res.status(200).json({ text: text });
  } catch (error) {
    // Menangani error jika terjadi masalah saat memanggil Gemini API.
    console.error("Error saat memanggil Gemini API dari fungsi Vercel:", error);
    res
      .status(500)
      .json({
        error: "Gagal menghasilkan konten dari Gemini API.",
        details: error.message,
      });
  }
};
