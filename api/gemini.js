// api/gemini.js
// Ini adalah serverless function yang akan berjalan di Vercel.

// Mengimpor library Google Generative AI.
// Pastikan library ini sudah terdaftar di 'dependencies' pada package.json.
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inisialisasi Gemini API.
// Kunci API diambil dari environment variable Vercel (process.env.GEMINI_API_KEY).
// Kunci ini TIDAK akan terekspos di kode frontend.
const API_KEY = process.env.GEMINI_API_KEY;

// Tambahkan pemeriksaan untuk API_KEY
if (!API_KEY) {
  console.error(
    "Kesalahan: GEMINI_API_KEY tidak ditemukan di environment variables."
  );
  // Dalam lingkungan produksi, Anda mungkin ingin menghentikan aplikasi atau memberikan respons error yang lebih spesifik.
  // Untuk tujuan pengembangan, kita akan tetap mencoba inisialisasi, tetapi ini akan gagal.
}

const genAI = new GoogleGenerativeAI(API_KEY);

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

  // Jika API_KEY tidak ada, langsung berikan error
  if (!API_KEY) {
    return res.status(500).json({
      error: "Kesalahan konfigurasi server: Kunci API Gemini tidak ditemukan.",
      details: "Harap pastikan GEMINI_API_KEY diatur di lingkungan Vercel.",
    });
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
    const geminiResponse = await result.response;
    const geminiText = await geminiResponse.text(); // Mengambil teks mentah dari respons Gemini.

    // Cek apakah frontend meminta respons JSON berdasarkan generationConfig
    const expectsJson =
      generationConfig &&
      generationConfig.responseMimeType === "application/json";

    if (expectsJson) {
      try {
        // Jika diharapkan JSON, coba parse teks mentah dari Gemini sebagai JSON.
        const parsedGeminiContent = JSON.parse(geminiText);
        // Mengirimkan konten JSON yang sudah di-parsing secara langsung kembali ke frontend.
        res.status(200).json(parsedGeminiContent);
      } catch (parseError) {
        // Jika respons Gemini bukan JSON yang valid padahal diharapkan JSON, catat error.
        console.error("Error parsing Gemini API response as JSON:", parseError);
        return res.status(500).json({
          error: "Invalid JSON response from Gemini API.",
          details: parseError.message,
          rawGeminiResponse: geminiText, // Sertakan respons mentah untuk debugging
        });
      }
    } else {
      // Jika tidak diharapkan JSON, kembalikan teks mentah Gemini dalam objek { text: ... }.
      res.status(200).json({ text: geminiText });
    }
  } catch (error) {
    // Menangani error jika terjadi masalah saat memanggil Gemini API atau error lainnya.
    console.error("Error saat memanggil Gemini API dari fungsi Vercel:", error);
    res.status(500).json({
      error: "Gagal menghasilkan konten dari Gemini API.",
      details: error.message,
    });
  }
};
