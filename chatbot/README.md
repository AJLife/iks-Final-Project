# ইবনে খালদুন অ্যাসিস্ট্যান্ট

HTML/CSS/JavaScript frontend + Node.js/Express backend + Gemini API.

## 1. প্রয়োজনীয় সফটওয়্যার
- Node.js (LTS)
- VS Code
- Google AI Studio থেকে Gemini API key

## 2. চালু করার নিয়ম
টার্মিনালে project folder-এ গিয়ে:

```bash
npm install
```

`.env.example` ফাইলটি কপি করে `.env` নামে রাখুন এবং API key বসান:

```env
GEMINI_API_KEY=আপনার_GEMINI_API_KEY
PORT=3000
```

তারপর চালান:

```bash
npm run dev
```

ব্রাউজারে খুলুন: http://localhost:3000

## 3. গুরুত্বপূর্ণ
- API key কখনো `public/` ফোল্ডারে বা frontend JavaScript-এ রাখবেন না।
- `.env` GitHub-এ আপলোড করবেন না।
- AI সাধারণ প্রশ্নের উত্তর দিতে পারে, কিন্তু স্কুলের নির্দিষ্ট ভর্তি/ফি/সময়সূচির তথ্য আলাদা করে না দিলে অনুমান করতে পারে না। নিশ্চিত তথ্য দিতে `server.js`-এর `SCHOOL_INSTRUCTIONS`-এ যাচাইকৃত তথ্য যোগ করুন।
- Production-এ প্রকাশের আগে rate limiting, abuse protection, privacy notice এবং hosting HTTPS যোগ করুন।
- Gemini model access বা SDK পরিবর্তন হলে Google AI Studio-এর বর্তমান নির্দেশনা দেখে model নাম মিলিয়ে নিন।
