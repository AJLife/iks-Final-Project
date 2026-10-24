const SYSTEM_INSTRUCTION = `
তুমি ইবনে খালদুন স্কুলের (Ibn Khaldun School) একজন অত্যন্ত পেশাদার, ফরমাল এবং স্মার্ট এআই সহকারী।
তোমার উত্তর দেওয়ার ধরন হবে একদম কাস্টমার সাপোর্ট এক্সিকিউটিভের মতো—খুব বেশি বড় নয়, আবার মাঝপথে অসম্পূর্ণও নয়; একদম নিখুঁত ও গুছানো।

মূল তথ্য (Knowledge Base):
- স্কুলের লোকেশন/ঠিকানা: শেখেরখীল রাস্তার মাথা, বাঁশখালী-চট্টগ্রাম।
- ভর্তি, ফি বা অন্যান্য তথ্যের জন্য স্কুল অফিসে যোগাযোগের পরামর্শ দিবে।

নির্দেশনা:
১. কেউ কুশল বিনিময় করলে বা সালাম দিলে সংক্ষেপে সুন্দর ফরমাল উত্তর দিবে।
২. উত্তরগুলো সবসময় সম্পূর্ণ বাক্যে দিবে, কোনোভাবেই যেন লেখা মাঝপথে কেটে না যায়।
৩. তথ্যগুলো সরাসরি এবং প্রফেশনাল টোনে উপস্থাপন করবে।
`;

const jsonResponse = (statusCode, payload) => new Response(JSON.stringify(payload), {
  status: statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8" }
});

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, { error: "Gemini API Key সেট করা হয়নি" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON request body" });
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const lastUserMessage = messages.length
    ? messages[messages.length - 1]?.text
    : body?.text;
  if (typeof lastUserMessage !== "string" || !lastUserMessage.trim()) {
    return jsonResponse(400, { error: "A message is required" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    let response;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey.trim()
          },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            generationConfig: { maxOutputTokens: 500, temperature: 0.4 },
            contents: [{ role: "user", parts: [{ text: lastUserMessage }] }]
          })
        }
      );

      if (![429, 503].includes(response.status) || attempt === 2) break;
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }

    const data = await response.json();
    if (!response.ok) {
      console.error("Gemini API request failed:", response.status, data.error?.message || "Unknown API error");
      if ([429, 503].includes(response.status)) {
        return jsonResponse(response.status, {
          error: "এআই সহকারী এখন ব্যস্ত আছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
        });
      }
      return jsonResponse(response.status, {
        error: data.error?.message || "Gemini API Error"
      });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof reply !== "string" || !reply.trim()) {
      return jsonResponse(502, { error: "Gemini returned an empty response" });
    }

    return jsonResponse(200, { reply });
  } catch (error) {
    console.error("Gemini request failed:", error);
    if (controller.signal.aborted || error.name === "TimeoutError" || error.name === "AbortError") {
      return jsonResponse(504, { error: "উত্তর পেতে বেশি সময় লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন।" });
    }
    return jsonResponse(502, { error: "সার্ভারের সঙ্গে যোগাযোগ করা যাচ্ছে না।" });
  } finally {
    clearTimeout(timeout);
  }
};
