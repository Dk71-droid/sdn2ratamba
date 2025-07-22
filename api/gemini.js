import { GoogleGenerativeAI } from "@google/generative-ai"; // Pastikan Anda menginstal ini juga jika menggunakan klien langsung
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: "Prompt is required" });
  }

  try {
    const model = google("gemini-pro", {
      apiKey: process.env.GEMINI_API_KEY, // Menggunakan environment variable GEMINI_API_KEY
    });

    const { text } = await generateText({
      model: model,
      prompt: prompt,
    });

    res.status(200).json({ generatedText: text });
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
}
