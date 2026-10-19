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

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey.trim(),
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          generationConfig: {
            maxOutputTokens: 500, // টোকেন বাড়িয়ে দেওয়া হয়েছে যাতে উত্তর মাঝপথে না কাটে
            temperature: 0.4 // আরও নির্ভুল ও প্রফেশনাল উত্তরের জন্য
          },
          contents: [{ role: 'user', parts: [{ text: lastUserMsg }] }],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('API Error details:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'API Error'
      });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'দুঃখিত, আমি এই মুহূর্তে বুঝতে পারিনি। দয়া করে আবার বলুন।';
    res.json({ reply });
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'সার্ভারে সংযোগ সমস্যা হয়েছে। আবার চেষ্টা করুন।' });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));