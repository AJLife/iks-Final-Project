import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_INSTRUCTION = `
তুমি ইবনে খালদুন স্কুলের (Ibn Khaldun School) একজন অত্যন্ত পেশাদার, ফরমাল এবং স্মার্ট এআই সহকারী।
তোমার উত্তর দেওয়ার ধরন হবে একদম কাস্টমার সাপোর্ট এক্সিকিউটিভের মতো—খুব বেশি বড় নয়, আবার মাঝপথে অসম্পূর্ণও নয়; একদম নিখুঁত ও গুছানো।

মূল তথ্য (Knowledge Base):
- স্কুলের লোকেশন/ঠিকানা: শেখেরখীল রাস্তার মাথা, বাঁশখালী-চট্টগ্রাম।
- ভর্তি, ফি বা অন্যান্য তথ্যের জন্য স্কুল অফিসে যোগাযোগের পরামর্শ দিবে।

নির্দেশনা:
১. কেউ কুশল বিনিময় করলে বা সালাম দিলে সংক্ষেপে সুন্দর ফরমাল উত্তর দিবে। যেমন: "ওয়ালাইকুম আসসালাম! আলহামদুলিল্লাহ, আমি ভালো আছি। ইবনে খালদুন স্কুলের এআই সহকারী হিসেবে আজ আপনাকে কীভাবে সাহায্য করতে পারি?"
২. উত্তরগুলো সবসময় সম্পূর্ণ বাক্যে দিবে, কোনোভাবেই যেন লেখা মাঝপথে কেটে না যায়। 
৩. তথ্যগুলো সরাসরি এবং প্রফেশনাল টোনে উপস্থাপন করবে।
`;

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Gemini API Key সেট করা হয়নি' });

  let lastUserMsg = 'হ্যালো';
  if (req.body.messages && Array.isArray(req.body.messages) && req.body.messages.length > 0) {
    lastUserMsg = req.body.messages[req.body.messages.length - 1]?.text || 'হ্যালো';
  } else if (req.body.text) {
    lastUserMsg = req.body.text;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    let response;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey.trim(),
          },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            generationConfig: {
              maxOutputTokens: 500,
              temperature: 0.4
            },
            contents: [{ role: 'user', parts: [{ text: lastUserMsg }] }],
          }),
        }
      );

      if (![429, 503].includes(response.status) || attempt === 2) break;
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('API Error details:', data);
      if ([429, 503].includes(response.status)) {
        return res.status(response.status).json({
          error: 'এআই সহকারী এখন ব্যস্ত আছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।'
        });
      }
      return res.status(response.status).json({
        error: data.error?.message || 'API Error'
      });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'দুঃখিত, আমি এই মুহূর্তে বুঝতে পারিনি। দয়া করে আবার বলুন।';
    res.json({ reply });
  } catch (error) {
    console.error('Server Error:', error);
    const status = controller.signal.aborted ? 504 : 500;
    const message = controller.signal.aborted
      ? 'উত্তর পেতে বেশি সময় লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
      : 'সার্ভারে সংযোগ সমস্যা হয়েছে। আবার চেষ্টা করুন।';
    res.status(status).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));