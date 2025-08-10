// File: api.js

// Ambil kunci API Gemini dari variabel lingkungan
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// URL dasar untuk Gemini API
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

// Ekspor variabel
export { GEMINI_API_KEY, GEMINI_API_URL };
