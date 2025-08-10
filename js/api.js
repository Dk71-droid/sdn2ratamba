export const GEMINI_API_URL = "/api/gemini";

export async function callGemini(prompt) {
  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(`API returned status ${response.status}`);
  }

  return await response.json();
}
