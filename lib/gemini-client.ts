/**
 * Shared Gemini AI client.
 */
const GEMINI_MODEL = 'gemini-2.5-flash';

export async function geminiChat(prompt: string): Promise<string | null> {
  return geminiChatInternal(prompt);
}

export async function geminiChatWithRetry(prompt: string, maxRetries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await geminiChatInternal(prompt);
    if (result) return result;
    if (attempt < maxRetries) {
      const delay = attempt * 10000;
      console.log(`     Gemini retry in ${delay / 1000}s (attempt ${attempt}/${maxRetries})...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return null;
}

async function geminiChatInternal(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 8192 } }),
        signal: AbortSignal.timeout(90000),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`     Gemini HTTP ${res.status}: ${text.slice(0, 300)}`);
      return null;
    }
    const data = await res.json();
    if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || 'empty';
      console.error(`     Gemini blocked: ${reason}`);
      return null;
    }
    return data.candidates[0].content.parts[0].text;
  } catch (e) {
    console.error(`     Gemini error: ${e instanceof Error ? e.message : 'Unknown'}`);
    return null;
  }
}
