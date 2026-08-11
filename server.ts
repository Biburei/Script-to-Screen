import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Server-side LLM configuration
const openRouterKey = process.env.OPENROUTER_API_KEY || "";
const openRouterModel = process.env.OPENROUTER_MODEL || "openrouter/free";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// ==============================================================================
// FATAL ERROR LOGGING & REPORTING SYSTEM
// ==============================================================================
interface FatalErrorReport {
  id: string;
  timestamp: string;
  module: string;
  errorName: string;
  message: string;
  stack?: string;
  recovered: boolean;
  context?: Record<string, any>;
  processId?: number;
}

const LOGS_DIR = path.join(process.cwd(), "logs");
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const FATAL_LOG_PATH = path.join(LOGS_DIR, "fatal_errors.log");
const fatalErrorLogs: FatalErrorReport[] = [];

function recordFatalError(details: {
  module: string;
  errorName: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  recovered?: boolean;
}): FatalErrorReport {
  const report: FatalErrorReport = {
    id: `fatal_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    module: details.module || "SYSTEM",
    errorName: details.errorName || "FatalError",
    message: details.message || "An unhandled critical error occurred",
    stack: details.stack || new Error().stack,
    recovered: details.recovered ?? false,
    context: details.context || {},
    processId: process.pid,
  };

  fatalErrorLogs.unshift(report);
  if (fatalErrorLogs.length > 50) fatalErrorLogs.pop(); // keep last 50

  const fileEntry = `[${report.timestamp}] [FATAL] [MODULE: ${report.module}] [ERROR: ${report.errorName}]\nMessage: ${report.message}\nStack: ${report.stack || "N/A"}\nContext: ${JSON.stringify(report.context)}\n${"-".repeat(80)}\n`;
  try {
    fs.appendFileSync(FATAL_LOG_PATH, fileEntry, "utf-8");
  } catch (err) {
    console.error("Failed to write to fatal_errors.log:", err);
  }

  console.error(`🚨 FATAL ERROR LOGGED [${report.module}]: ${report.message}`);
  return report;
}

// Global Process Exception Handlers for Fatal Errors
process.on("uncaughtException", (error: Error) => {
  recordFatalError({
    module: "NODE_PROCESS_UNCAUGHT",
    errorName: error.name,
    message: error.message,
    stack: error.stack,
    context: { processId: process.pid, uptime: process.uptime() },
  });
});

process.on("unhandledRejection", (reason: any) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  recordFatalError({
    module: "NODE_PROCESS_UNHANDLED_REJECTION",
    errorName: "UnhandledPromiseRejection",
    message,
    stack,
    context: { processId: process.pid, uptime: process.uptime() },
  });
});

// Fallback curated Reddit stories per subreddit if Reddit API blocks or returns 403
const FALLBACK_STORIES: Record<string, any[]> = {
  AITAH: [
    {
      id: "aitah_fallback_1",
      subreddit: "AITAH",
      title: "AITA for leaving my brother's wedding reception early after my sister-in-law's speech?",
      body: `My brother got married yesterday. During the maid of honor speech, his new wife decided to announce to all 150 guests that I was fired from my job last week. She played it off as a joke, but everyone laughed. I stood up, left the venue immediately, and turned off my phone. Now my whole family is spamming me calling me selfish for ruining their special day.`,
      author: "throwaway_wedding_99",
      score: 14200,
      num_comments: 1850,
      url: "https://reddit.com/r/AITAH/comments/sample1",
      word_count: 185,
      is_self: true,
      over_18: false,
    },
    {
      id: "aitah_fallback_2",
      subreddit: "AITAH",
      title: "AITA for refusing to give my stepson my late wife's heirloom watch?",
      body: `My late wife passed away four years ago. Before she passed, she gave me a vintage heirloom watch that belonged to her grandfather, specifying it should go to our biological daughter when she turns 18. My current wife insists I give it to her 16-year-old son instead because he loves watches. When I refused, she called me cold and heartless.`,
      author: "watch_dilemma_dad",
      score: 18900,
      num_comments: 2310,
      url: "https://reddit.com/r/AITAH/comments/sample2",
      word_count: 172,
      is_self: true,
      over_18: false,
    },
    {
      id: "aitah_fallback_3",
      subreddit: "AITAH",
      title: "AITA for throwing away my roommate's unlabeled food that was moldy in the fridge?",
      body: `I live with two roommates. One of them left a plastic container of takeout in the fridge for over three weeks. Yesterday I opened it and it was completely covered in thick green mold and smelling terrible. I threw the entire container in the outdoor trash. Today my roommate exploded, claiming the container was expensive Pyrex.`,
      author: "fridge_cleaner_33",
      score: 9500,
      num_comments: 870,
      url: "https://reddit.com/r/AITAH/comments/sample3",
      word_count: 148,
      is_self: true,
      over_18: false,
    },
  ],
  TrueOffMyChest: [
    {
      id: "tomc_fallback_1",
      subreddit: "TrueOffMyChest",
      title: "I discovered a secret room behind the bookshelf in my new rented house",
      body: `I moved into an old 1920s house three weeks ago. Yesterday while cleaning the study, I bumped into the heavy wooden bookshelf and heard a hollow click. I pushed it aside and found a small concealed wooden door. Inside was a dusty wooden trunk with old letters from 1944 detailing a wartime mystery.`,
      author: "mystery_tenant",
      score: 11800,
      num_comments: 1140,
      url: "https://reddit.com/r/TrueOffMyChest/comments/sample1",
      word_count: 162,
      is_self: true,
      over_18: false,
    },
    {
      id: "tomc_fallback_2",
      subreddit: "TrueOffMyChest",
      title: "I quit my toxic corporate job yesterday with zero notice and I have never felt more relieved",
      body: `For two years, my manager forced me to work 60-hour weeks without overtime pay, taking credit for my projects while publicly criticizing me in team meetings. Yesterday, right before a major client presentation, I submitted my resignation email, handed in my badge, and walked out. The weight off my shoulders is indescribable.`,
      author: "free_at_last_dev",
      score: 21500,
      num_comments: 1980,
      url: "https://reddit.com/r/TrueOffMyChest/comments/sample2",
      word_count: 155,
      is_self: true,
      over_18: false,
    },
  ],
  AskReddit: [
    {
      id: "ask_fallback_1",
      subreddit: "AskReddit",
      title: "What is the most unexpected piece of advice an old stranger ever gave you?",
      body: `I was sitting at a bus station in Chicago during a heavy rainstorm feeling completely lost in life. An old man with a vintage suit sat down next to me and said: 'Never sacrifice your peace for someone else's chaos.' That single sentence changed my entire decade and perspective on personal boundaries.`,
      author: "urban_traveler",
      score: 22400,
      num_comments: 3100,
      url: "https://reddit.com/r/AskReddit/comments/sample1",
      word_count: 142,
      is_self: true,
      over_18: false,
    },
  ],
  confession: [
    {
      id: "confession_fallback_1",
      subreddit: "confession",
      title: "I accidentally tipped a food delivery driver $100 instead of $10, and I pretended it was on purpose",
      body: `Late last night I ordered pizza after an exhausting 14-hour workday. When paying on my phone, my thumb slipped and typed $100.00 in the custom tip field. When the young delivery driver looked at his receipt, tears literally welled up in his eyes and he thanked me profusely, saying it paid his medicine. I smiled and told him he earned it.`,
      author: "accidental_benefactor",
      score: 16700,
      num_comments: 1220,
      url: "https://reddit.com/r/confession/comments/sample1",
      word_count: 158,
      is_self: true,
      over_18: false,
    },
  ],
  tifu: [
    {
      id: "tifu_fallback_1",
      subreddit: "tifu",
      title: "TIFU by replying to a company-wide email with a meme intended for my friend",
      body: `Today our company VP sent a serious email about new Q3 quarterly quotas to all 400 employees. I meant to send a ridiculous cat meme to my work bestie, but accidentally hit 'Reply All' with the attachment. Within two minutes, my phone blew up, and I was summoned to HR.`,
      author: "reply_all_disaster",
      score: 19300,
      num_comments: 1540,
      url: "https://reddit.com/r/tifu/comments/sample1",
      word_count: 150,
      is_self: true,
      over_18: false,
    },
  ],
};

// --------------------------------------------------------
// API ROUTE 1: Reddit Public JSON Scraper (Bypasses CORS & handles 403 gracefully)
// --------------------------------------------------------
app.get("/api/reddit/posts", async (req, res) => {
  const subreddit = (req.query.subreddit as string) || "AITAH";
  const limit = parseInt((req.query.limit as string) || "15", 10);
  const timeFilter = (req.query.t as string) || "day";

  const targetUrls = [
    `https://www.reddit.com/r/${subreddit}/top/.json?t=${timeFilter}&limit=${limit}`,
    `https://old.reddit.com/r/${subreddit}/top.json?t=${timeFilter}&limit=${limit}`,
    `https://www.reddit.com/r/${subreddit}/hot/.json?limit=${limit}`,
  ];

  const headers = {
    "User-Agent": "android:com.autoshorts.app:v1.0.0 (by /u/autoshorts_bot)",
    "Accept": "application/json",
  };

  let fetchedData: any = null;
  let fetchError: string | null = null;

  for (const url of targetUrls) {
    try {
      const response = await fetch(url, { headers });
      if (response.ok) {
        fetchedData = await response.json();
        if (fetchedData?.data?.children?.length) {
          break;
        }
      } else {
        fetchError = `Reddit HTTP ${response.status} from ${url}`;
      }
    } catch (err: any) {
      fetchError = err.message || "Fetch network error";
    }
  }

  if (fetchedData && fetchedData?.data?.children) {
    const children = fetchedData.data.children || [];
    const posts = children
      .map((item: any) => {
        const p = item.data;
        const rawBody = p.selftext || "";

        let cleanBody = rawBody
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .replace(/http[s]?:\/\/\S+/g, "")
          .replace(/\n+edit:?.*$/gi, "")
          .replace(/\n+tl;?dr:?.*$/gi, "")
          .replace(/[ \t]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        const words = cleanBody.split(/\s+/).filter(Boolean);

        return {
          id: p.id,
          subreddit: p.subreddit,
          title: p.title,
          body: cleanBody,
          author: p.author,
          score: p.score,
          num_comments: p.num_comments,
          url: `https://reddit.com${p.permalink}`,
          word_count: words.length,
          over_18: p.over_18,
          is_self: p.is_self,
        };
      })
      .filter((p: any) => p.is_self && !p.over_18 && p.word_count >= 100);

    if (posts.length > 0) {
      return res.json({ status: "success", subreddit, count: posts.length, posts });
    }
  }

  // Fallback if Reddit blocked container IP or returned no usable text posts
  console.warn(`Reddit live fetch notice (${fetchError}). Using fallback curated stories for r/${subreddit}`);
  const fallbacks = FALLBACK_STORIES[subreddit] || FALLBACK_STORIES["AITAH"];
  res.json({
    status: "success",
    subreddit,
    count: fallbacks.length,
    posts: fallbacks,
    source: "curated_fallback",
    notice: fetchError || "Loaded curated stories for instant reliability",
  });
});

// --------------------------------------------------------
// API ROUTE 2: Fetch Python Pipeline Files for Code Viewer & Download
// --------------------------------------------------------
app.get("/api/codebase", (req, res) => {
  const pythonDir = path.join(process.cwd(), "python_pipeline");
  try {
    if (!fs.existsSync(pythonDir)) {
      return res.status(404).json({ error: "python_pipeline directory not found" });
    }

    const files = fs.readdirSync(pythonDir);
    const codeFiles: Record<string, string> = {};

    for (const file of files) {
      const filePath = path.join(pythonDir, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        codeFiles[file] = fs.readFileSync(filePath, "utf-8");
      }
    }

    res.json({ status: "success", files: codeFiles });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --------------------------------------------------------
// API ROUTE 3: Server AI Script Transformer (OpenRouter Free Tier & Zero-Cost Fallback)
// --------------------------------------------------------
app.post("/api/transform-script", async (req, res) => {
  const { title, body, source_word_count } = req.body;

  let targetWords = 140;
  if (source_word_count < 250) targetWords = 110;
  else if (source_word_count < 500) targetWords = 145;
  else if (source_word_count < 800) targetWords = 175;
  else targetWords = 210;

  try {
    const prompt = `You are an expert scriptwriter and narrator specializing in short-form horror, dark fantasy, and atmospheric storytelling (TikTok, YouTube Shorts, Instagram Reels).

REWRITE and adapt the following raw story into a high-retention narration script following these EXACT rules:
1. WORD COUNT: Keep total word count strictly under 325 words (target around ${targetWords} words) for short-form video format.
2. IMMEDIATE HOOK: Hook the listener immediately in the very first sentence with a high-stakes, dramatic conflict. Do NOT say "Welcome back", "Reddit post", or introduce the channel.
3. TONE & ATMOSPHERE: Maintain a tense, eerie, and immersive tone suitable for horror and dark fantasy. Write in first person ("I").
4. STRATEGIC PAUSE TAGS: Insert explicit pause tags like [PAUSE=1.0] or [PAUSE=1.5] at moments of high suspense, dramatic turns, or major punctuation breaks to give the TTS engine and visual generator natural pacing.
5. NO META-COMMENTARY: Do NOT include any introductory remarks, stage directions, speaker labels, or outro text. Return ONLY the final script ready for narration.

STORY TITLE: ${title}
STORY CONTENT:
${body}`;

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
        });
        const rawScript = response.text?.trim() || "";
        if (rawScript) {
          let scriptWithPauses = rawScript
            .replace(/\n{2,}/g, " [PAUSE=1.0] ")
            .replace(/\n/g, " ")
            .replace(/\.{3,}/g, "... [PAUSE=0.5] ")
            .replace(/—|--/g, " — [PAUSE=0.5] ")
            .replace(/(\[PAUSE=[\d.]+\]\s*){2,}/g, "$1")
            .replace(/\s+/g, " ")
            .trim();

          const words = rawScript.split(/\s+/).filter(Boolean);

          return res.json({
            status: "success",
            raw_script: rawScript,
            script_with_pauses: scriptWithPauses,
            word_count: words.length,
            estimated_duration: Math.round(words.length * 0.4),
            provider: "Google Gemini 2.5 Flash API",
          });
        }
      } catch (geminiErr: any) {
        console.warn(`Gemini API call notice (${geminiErr.message}). Falling back to OpenRouter/Algorithmic.`);
      }
    }

    if (openRouterKey) {
      const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "HTTP-Referer": "https://github.com/autoshorts-pipeline",
          "X-Title": "AutoShorts Pipeline",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: openRouterModel,
          messages: [
            { role: "system", content: "You are a professional viral scriptwriter." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        })
      });

      if (openRouterRes.ok) {
        const data: any = await openRouterRes.json();
        const rawScript = data?.choices?.[0]?.message?.content?.trim() || "";
        if (rawScript) {
          let scriptWithPauses = rawScript
            .replace(/\n{2,}/g, " [PAUSE=1.0] ")
            .replace(/\n/g, " ")
            .replace(/\.{3,}/g, "... [PAUSE=0.5] ")
            .replace(/—|--/g, " — [PAUSE=0.5] ")
            .replace(/(\[PAUSE=[\d.]+\]\s*){2,}/g, "$1")
            .replace(/\s+/g, " ")
            .trim();

          const words = rawScript.split(/\s+/).filter(Boolean);

          return res.json({
            status: "success",
            raw_script: rawScript,
            script_with_pauses: scriptWithPauses,
            word_count: words.length,
            estimated_duration: Math.round(words.length * 0.4),
            provider: `OpenRouter Free API (${openRouterModel})`,
          });
        }
      }
    }
  } catch (e: any) {
    console.warn(`OpenRouter API call notice (${e.message}). Using zero-cost algorithmic transformer fallback.`);
  }

  // Pure Algorithmic Fallback with Randomized Atmospheric CTAs & Organic Truncation
  const cleanTitle = title.replace(/^(AITA|AITAH|UPDATE|TrueOffMyChest)\b[:\s-]*/i, "").trim();
  const hook = `You won't believe what happened. ${cleanTitle}.`;
  const paragraphs = body.split("\n\n").filter((p: string) => p.trim().length > 30);
  const snippet = paragraphs.slice(0, 3).join(" ");
  
  const ctaPool = [
    "Would you have stayed in that house, or run? Tell me in the comments.",
    "What would you do if you saw that smiling at you in the dark? Comment below.",
    "If you heard that tapping sound at 3 AM, what's your first move? Let me know.",
    "Tell me in the comments—what do you think was hiding behind that door?",
    "Was I wrong for leaving right then? Share your thoughts in the comments.",
    "Would you open that door? Drop a comment with what you would have done.",
    "What would you have done if you heard that whisper? Let me know below.",
    "Tell me in the comments: would you lock the door or check outside?",
    "Do you believe in cursed places? Leave a comment with your experience.",
    "If this happened to you in the dark, how would you survive? Share below."
  ];

  const words = snippet.split(/\s+/);
  const maxBodyWords = Math.max(30, targetWords - 25);
  let cleanBodyText = snippet;

  if (words.length > maxBodyWords) {
    const truncatedSlice = words.slice(0, maxBodyWords).join(" ");
    const match = truncatedSlice.match(/^(.*[.!?])\s+[^.!?]*$/);
    if (match) {
      cleanBodyText = match[1].trim();
    } else {
      cleanBodyText = truncatedSlice.trim() + "...";
    }
  }

  if (!/[.!?...]$/.test(cleanBodyText)) {
    cleanBodyText += ".";
  }

  const randomCta = ctaPool[Math.floor(Math.random() * ctaPool.length)];
  const rawScript = `${hook} ${cleanBodyText} ${randomCta}`;
  const scriptWithPauses = rawScript
    .replace(/\n{2,}/g, " [PAUSE=1.0] ")
    .replace(/\.{3,}/g, "... [PAUSE=0.5] ")
    .replace(/\s+/g, " ")
    .trim();

  res.json({
    status: "success",
    raw_script: rawScript,
    script_with_pauses: scriptWithPauses,
    word_count: rawScript.split(/\s+/).length,
    estimated_duration: Math.round(rawScript.split(/\s+/).length * 0.4),
    provider: "Algorithmic Script Transformer",
  });
});

// --------------------------------------------------------
// API ROUTE 4: Fatal Error Reporting & Telemetry System
// --------------------------------------------------------
app.post("/api/logs/fatal", (req, res) => {
  const { module, errorName, message, stack, context, recovered } = req.body;
  if (!message) {
    return res.status(400).json({ status: "error", error: "Missing required 'message' field" });
  }

  const report = recordFatalError({
    module: module || "CLIENT_REPORT",
    errorName: errorName || "FatalException",
    message,
    stack,
    context: context || {},
    recovered: Boolean(recovered),
  });

  res.json({ status: "success", logged: true, report });
});

app.get("/api/logs/fatal", (req, res) => {
  res.json({
    status: "success",
    count: fatalErrorLogs.length,
    logFile: FATAL_LOG_PATH,
    logs: fatalErrorLogs,
  });
});

app.delete("/api/logs/fatal", (req, res) => {
  fatalErrorLogs.length = 0;
  try {
    fs.writeFileSync(FATAL_LOG_PATH, `--- FATAL ERROR LOG RESET AT ${new Date().toISOString()} ---\n`, "utf-8");
  } catch (e) {
    console.error("Failed to reset fatal error log file:", e);
  }
  res.json({ status: "success", message: "Fatal error log reset successfully" });
});

app.post("/api/logs/simulate-fatal", (req, res) => {
  const { module, message } = req.body;
  const testError = new Error(message || "Simulated pipeline fatal memory allocation error (CUDA_OUT_OF_MEMORY)");
  testError.name = "SimulatedFatalError";

  const report = recordFatalError({
    module: module || "STABLE_DIFFUSION",
    errorName: "SimulatedFatalError",
    message: testError.message,
    stack: testError.stack,
    context: { simulated: true, memoryThresholdGb: 4.0 },
  });

  res.json({ status: "success", simulated: true, report });
});

// Global Express Error Middleware (catches unhandled errors in route handlers)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const report = recordFatalError({
    module: "EXPRESS_ROUTE_EXCEPTION",
    errorName: err.name || "RouteException",
    message: err.message || "Unhandled server route error",
    stack: err.stack,
    context: { url: req.url, method: req.method, body: req.body },
  });

  res.status(500).json({
    status: "fatal_error",
    error: {
      id: report.id,
      module: report.module,
      message: report.message,
      timestamp: report.timestamp,
    },
  });
});

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

