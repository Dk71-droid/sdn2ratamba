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
  // Pastikan ini adalah permintaan POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metode tidak diizinkan." });
  }

  // Pastikan ada 'prompt' di body permintaan
  if (!req.body.prompt) {
    return res.status(400).json({ error: "Parameter 'prompt' diperlukan." });
  }

  const prompt = req.body.prompt;
  const generationConfig = req.body.generationConfig || {}; // Ambil generationConfig jika ada

  try {
    const chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });

    const payload = { contents: chatHistory };

    // Jika ada generationConfig, tambahkan ke payload
    if (Object.keys(generationConfig).length > 0) {
      payload.generationConfig = generationConfig;
    }

    const result = await model.generateContent(payload);
    const geminiResponse = result.response;

    // Cek apakah ada kandidat dan konten
    if (
      !geminiResponse ||
      !geminiResponse.candidates ||
      geminiResponse.candidates.length === 0 ||
      !geminiResponse.candidates[0].content ||
      !geminiResponse.candidates[0].content.parts ||
      geminiResponse.candidates[0].content.parts.length === 0
    ) {
      console.error("Respons Gemini tidak memiliki struktur yang diharapkan.");
      return res.status(500).json({
        error: "Respons Gemini tidak memiliki struktur yang diharapkan.",
        details: "Tidak ada kandidat atau konten yang ditemukan.",
      });
    }

    const geminiText = geminiResponse.candidates[0].content.parts[0].text;

    // Jika frontend meminta JSON, coba parse
    if (generationConfig.responseMimeType === "application/json") {
      try {
        // Log respons mentah dari Gemini untuk debugging
        console.log("Raw Gemini Text received:", geminiText);
        const jsonResponse = JSON.parse(geminiText);
        res.status(200).json(jsonResponse);
      } catch (parseError) {
        // Jika parsing gagal, log error dan kirim respons JSON fallback
        console.error("Error parsing Gemini JSON response:", parseError);
        console.error("Text that failed to parse:", geminiText); // Penting untuk melihat teks yang gagal
        return res.status(500).json({
          error: "Invalid JSON response from Gemini API.",
          details:
            "AI gagal menghasilkan JSON yang valid. Mungkin ada masalah dengan prompt atau respons AI. Teks mentah: " +
            geminiText.substring(0, 200) +
            "...", // Sertakan sebagian teks mentah untuk debugging
          gradedQuestions: [], // Fallback kosong
          overallSuggestions:
            "Maaf, AI gagal mengevaluasi jawaban Anda secara terstruktur. Silakan coba lagi atau hubungi administrator.",
        });
      }
    } else {
      // Jika tidak diharapkan JSON, kembalikan teks mentah Gemini dalam objek { text: ... }
      res.status(200).json({ text: geminiText });
    }
  } catch (error) {
    // Menangani error jika terjadi masalah saat memanggil Gemini API atau error lainnya.
    console.error("Error saat memanggil Gemini API dari fungsi Vercel:", error);
    console.error("Objek error lengkap:", JSON.stringify(error, null, 2));

    let errorMessage = "Gagal menghasilkan konten dari Gemini API.";
    let statusCode = 500;

    if (error.status) {
      statusCode = error.status;
      if (error.status === 429) {
        errorMessage =
          "Anda telah melebihi kuota Gemini API harian Anda. Silakan coba lagi nanti atau tingkatkan kuota Anda.";
      } else if (error.statusText) {
        errorMessage = `Panggilan API gagal dengan status ${error.status}: ${error.statusText}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: error.message,
    });
  }
};
