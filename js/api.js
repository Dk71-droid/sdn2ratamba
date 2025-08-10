// URL palsu yang aman, mengarah ke API route di Vercel
export const GEMINI_API_URL = "/api/gemini";

// Fungsi untuk memanggil API
export async function callGemini(prompt) {
  const res = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    throw new Error("Request gagal");
  }

  return await res.json();
}
