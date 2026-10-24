// game.js
// MIMI quiz game: loads questions from Firestore, builds a random round,
// and makes MIMI react to every answer.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ⚠️ Replace this whole object with the config from:
// Firebase console → Project settings → General → Your apps → (Web app) → SDK setup and configuration → Config
const firebaseConfig = {
  apiKey: "AIzaSyAWoaRUkkilKL1l5g5q1uIiiPicijMzBM0",
  authDomain: "mimi-bot-13cd8.firebaseapp.com",
  projectId: "mimi-bot-13cd8",
  storageBucket: "mimi-bot-13cd8.firebasestorage.app",
  messagingSenderId: "415119888440",
  appId: "1:415119888440:web:20e52a128736c2dd93d6cd",
  measurementId: "G-8P3ZFW9JFL"
};
const db = getFirestore(initializeApp(firebaseConfig));

const ROUND_SIZE = 10;

const CATEGORIES = {
  all: { label: "كل المواضيع", emoji: "🌈" },
  animals: { label: "الحيوانات", emoji: "🐾" },
  colors: { label: "الألوان", emoji: "🎨" },
  math: { label: "الحساب", emoji: "🔢" },
  shapes: { label: "الأشكال", emoji: "🔷" },
  food: { label: "الطعام", emoji: "🍎" },
  body: { label: "جسم الإنسان", emoji: "🧒" },
  nature: { label: "الطبيعة", emoji: "🌳" },
  islamic: { label: "ديني", emoji: "🕌" },
  riddles: { label: "ألغاز", emoji: "🧩" },
};

const PRAISE = ["أحسنت! 🎉", "رائع جدًا!", "إجابة صحيحة، برافو!", "ممتاز، أنت ذكي!"];
const ENCOURAGE = [
  "لا بأس، الإجابة الصحيحة باللون الأخضر.",
  "قريب! حاول في السؤال القادم.",
  "نتعلّم من أخطائنا، هيا نكمل!",
];

const el = {
  mimi: document.getElementById("mimi"),
  bubble: document.getElementById("bubble"),
  scoreChip: document.getElementById("score-chip"),
  score: document.getElementById("score"),
  chips: document.getElementById("chips"),
  status: document.getElementById("status"),
  startBtn: document.getElementById("start-btn"),
  dots: document.getElementById("dots"),
  qEmoji: document.getElementById("q-emoji"),
  qText: document.getElementById("q-text"),
  options: document.getElementById("options"),
  nextBtn: document.getElementById("next-btn"),
  stars: document.getElementById("stars"),
  result: document.getElementById("result"),
  best: document.getElementById("best"),
  againBtn: document.getElementById("again-btn"),
  topicsBtn: document.getElementById("topics-btn"),
};

let allQuestions = [];
let category = "all";
let round = [];
let current = 0;
let score = 0;

// ---------- Helpers ----------

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Fisher–Yates shuffle: returns a new, randomly ordered copy
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.hidden = screen.id !== id;
  });
  el.scoreChip.hidden = id !== "game";
}

// Changes MIMI's face and what MIMI says
function mimiSays(mood, message) {
  el.mimi.dataset.mood = mood;
  el.mimi.classList.remove("react");
  void el.mimi.offsetWidth; // restart the animation
  el.mimi.classList.add("react");
  el.bubble.textContent = message;
}

function greet() {
  mimiSays("happy", "أهلًا! أنا ميمي 🤖 اختر موضوعًا، ثم اضغط «ابدأ اللعب».");
}

// ---------- Loading ----------

async function loadQuestions() {
  try {
    const snapshot = await getDocs(collection(db, "questions"));
    allQuestions = snapshot.docs.map((doc) => doc.data());
    if (allQuestions.length === 0) throw new Error("No questions found in Firestore");

    renderChips();
    el.startBtn.disabled = false;
    greet();
  } catch (err) {
    console.error("Could not load questions:", err);
    mimiSays("sad", "أوه! لم أستطع إحضار الأسئلة.");
    el.status.textContent = "تعذّر تحميل الأسئلة. تحقّق من الاتصال بالإنترنت، ثم أعد تحميل الصفحة.";
  }
}

function renderChips() {
  const available = new Set(allQuestions.map((q) => q.category));
  const keys = ["all", ...Object.keys(CATEGORIES).filter((key) => key !== "all" && available.has(key))];

  el.chips.innerHTML = "";
  keys.forEach((key) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = `${CATEGORIES[key].emoji} ${CATEGORIES[key].label}`;
    chip.setAttribute("aria-pressed", String(key === category));
    chip.addEventListener("click", () => {
      category = key;
      el.chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    });
    el.chips.appendChild(chip);
  });
}

// ---------- Game flow ----------

function startGame() {
  const pool = category === "all" ? allQuestions : allQuestions.filter((q) => q.category === category);
  round = shuffle(pool).slice(0, ROUND_SIZE);
  current = 0;
  score = 0;
  el.score.textContent = "0";
  el.dots.innerHTML = round.map(() => "<li></li>").join("");
  showScreen("game");
  showQuestion();
}

function showQuestion() {
  const q = round[current];
 el.qEmoji.textContent = ""; // hidden until the child answers
  el.qText.textContent = q.question;

  el.options.innerHTML = "";
  shuffle(q.options).forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.textContent = option;
    btn.dataset.value = option;
    btn.addEventListener("click", () => checkAnswer(btn));
    el.options.appendChild(btn);
  });

  [...el.dots.children].forEach((dot, i) => dot.classList.toggle("current", i === current));
  el.nextBtn.hidden = true;
  mimiSays("thinking", `السؤال ${current + 1} من ${round.length}. فكّر جيدًا!`);
}

function checkAnswer(chosen) {
  const q = round[current];
  const buttons = [...el.options.children];
  const dot = el.dots.children[current];
  buttons.forEach((b) => { b.disabled = true; });
el.qEmoji.textContent = q.emoji || el.qEmoji.textContent; // reveal the answer's emoji
  if (chosen.dataset.value === q.answer) {
    score++;
    el.score.textContent = score;
    chosen.classList.add("correct");
    dot.classList.add("right");
    mimiSays("happy", pick(PRAISE));
  } else {
    chosen.classList.add("wrong");
    buttons.find((b) => b.dataset.value === q.answer)?.classList.add("correct");
    dot.classList.add("wrong");
    mimiSays("sad", pick(ENCOURAGE));
  }

  const isLast = current === round.length - 1;
  el.nextBtn.textContent = isLast ? "اعرض النتيجة" : "السؤال التالي";
  el.nextBtn.hidden = false;
  el.nextBtn.focus();
}

function endGame() {
  const ratio = score / round.length;
  const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
  el.stars.textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
  el.result.textContent = `نتيجتك: ${score} من ${round.length}`;

  // Best score per topic, saved in this browser only
  const key = `mimi-best-${category}`;
  let best = score;
  try {
    best = Math.max(score, Number(localStorage.getItem(key)) || 0);
    localStorage.setItem(key, String(best));
  } catch {
    // Storage not available: skip the best score
  }
  el.best.textContent = score > 0 && score >= best
    ? "🏆 هذه أفضل نتيجة لك حتى الآن!"
    : `أفضل نتيجة لك في هذا الموضوع: ${best}`;

  const messages = {
    3: ["happy", "واو! أنت بطل حقيقي 🌟"],
    2: ["happy", "عمل رائع! يمكنك أن تصبح أفضل أيضًا."],
    1: ["thinking", "بداية جيدة! هيا نلعب مرة أخرى ونتعلّم أكثر."],
  };
  mimiSays(...messages[stars]);
  showScreen("end");
}

// ---------- Events ----------

el.startBtn.addEventListener("click", startGame);
el.nextBtn.addEventListener("click", () => {
  current++;
  if (current < round.length) showQuestion();
  else endGame();
});
el.againBtn.addEventListener("click", startGame);
el.topicsBtn.addEventListener("click", () => {
  showScreen("start");
  greet();
});

showScreen("start");
loadQuestions();
