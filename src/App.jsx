// Full code for WagerTrainer component with difficulty explanations and best time only on correct answers.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// --- Casino config ---
const CONFIG = {
  RS: { label: "RS", wager: { welcome: 30, regular: 20 }, fsMult: 40 },
  Golden: { label: "Golden", wager: { regular: 10 }, fsMult: 30 },
  "Golden GV": { label: "Golden GV", wager: { regular: 15 }, fsMult: 30 },
};

const NAMES = ["Tony L", "Taylor Smith", "Alberto", "Casey Miller", "Drew Davis", "Blanca", "Roberto", "Cameron Taylor", "Brian", "Quinn Thomas", "Avery Jackson", "Riley White", "Skyler Harris", "Peyton Martin", "Harper Thompson", "Logan Garcia", "Charlie Martinez", "Emerson Robinson", "Finley Clark", "Hayden Rodriguez", "Rowan Lewis", "Sawyer Lee", "Parker Walker", "Dakota Hall", "Jesse Allen", "Kendall Young", "Blake King", "Micah Wright", "River Scott"];

const formatMoney = (n) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });
const randPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const to2 = (n) => Number(n.toFixed(2));
const BEST_TIMES_KEY = "wagerTrainer_bestTimes_v2";

export default function WagerTrainer() {
  const [difficulty, setDifficulty] = useState("easy");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdown, setBreakdown] = useState("");
  const [currentCasino, setCurrentCasino] = useState(null);
  const [started, setStarted] = useState(false);
  const [bestTimes, setBestTimes] = useState(() => {
    try { const v = localStorage.getItem(BEST_TIMES_KEY); if (v) return JSON.parse(v); } catch {}
    return { RS: null, Golden: null, "Golden GV": null };
  });

  const rafId = useRef(null);
  const baseElapsed = useRef(0);
  const startedAt = useRef(null);
  const [displayTime, setDisplayTime] = useState(0);

  const startTimer = useCallback(() => {
    startedAt.current = performance.now();
    const loop = () => {
      const now = performance.now();
      const elapsed = baseElapsed.current + (now - startedAt.current) / 1000;
      setDisplayTime(Number(elapsed.toFixed(1)));
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);
  }, []);

  const stopTimer = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = null;
    if (startedAt.current != null) {
      const now = performance.now();
      baseElapsed.current += (now - startedAt.current) / 1000;
      startedAt.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = null;
    baseElapsed.current = 0;
    startedAt.current = null;
    setDisplayTime(0);
  }, []);

  useEffect(() => () => { if (rafId.current) cancelAnimationFrame(rafId.current); }, []);

  const computeTotal = useCallback(({ casino, isWelcome, deposit, bonusPct, fsWinnings }) => {
    const conf = CONFIG[casino];
    const bonus = to2(deposit * (bonusPct / 100));
    const wagerMult = isWelcome && conf.wager.welcome ? conf.wager.welcome : conf.wager.regular;
    const fsMult = conf.fsMult;
    const total = to2((deposit + bonus) * wagerMult + fsWinnings * fsMult);
    return { bonus, wagerMult, fsMult, total };
  }, []);

  const generateDeposit = useCallback((diff) => {
    if (Math.random() < 0.25) return 25;
    if (diff === "easy") return randPick([10, 50, 75, 100, 150, 200, 250, 300]);
    if (diff === "medium") return randPick(Array.from({ length: 59 }, (_, i) => (i + 2) * 5));
    return Number((Math.random() * 290 + 10).toFixed(2));
  }, []);

  const generateBonusPercent = useCallback((casino, isWelcome, bonusType) => {
    if (casino === "RS" && isWelcome) {
      if (Math.random() < 0.5) return 275;
      return randPick([175, 100, 275]);
    }
    if (bonusType === "Regular") {
      const steps = (170 - 10) / 5;
      return 10 + Math.floor(Math.random() * (steps + 1)) * 5;
    }
    if (bonusType === "VIP") {
      const steps = (400 - 150) / 5;
      return 150 + Math.floor(Math.random() * (steps + 1)) * 5;
    }
    return 0;
  }, []);

  const fsWinningsFor = useCallback((diff) => {
    if (diff === "easy") return 0;
    if (diff === "medium") return randPick([0, 5, 10, 15, 20, 25, 50, 75, 100, 150, 199]);
    return Number((Math.random() * 198.99 + 1).toFixed(2));
  }, []);

  const newScenario = useCallback((diff = difficulty) => {
    const casino = Math.random() < 0.75 ? "RS" : Math.random() < 0.5 ? "Golden" : "Golden GV";
    const welcomeBias = diff === "easy" ? 0.7 : 0.5;
    const isWelcome = (casino === "RS") && (Math.random() < welcomeBias);
    const bonusType = isWelcome ? "Welcome" : Math.random() < 0.5 ? "Regular" : "VIP";

    const deposit = generateDeposit(diff);
    const bonusPct = generateBonusPercent(casino, isWelcome, bonusType);
    const fsWinnings = fsWinningsFor(diff);

    const { bonus, wagerMult, fsMult, total } = computeTotal({ casino, isWelcome, deposit, bonusPct, fsWinnings });

    const fsText = fsWinnings > 0 ? ` I also won ${formatMoney(fsWinnings)} from free spins.` : "";
    const introText = isWelcome ? (bonusPct === 275 ? "for my first time depositing (275%)" : `for my welcome bonus (${bonusPct}%)`) : `and claimed a ${bonusPct}% ${bonusType.toLowerCase()} bonus`;
    const customerName = randPick(NAMES);

    setPrompt(`💬 ${customerName}: Hi, I just deposited ${formatMoney(deposit)} at ${casino} Casino ${introText}. Can you tell me my total wagers?${fsText}`);
    setAnswer("");
    setFeedback(null);
    setShowBreakdown(false);
    setCorrectAnswer(total);
    setCurrentCasino(casino);
    setBreakdown([
      `🏢 Casino: ${casino}`,
      `🎁 Bonus type: ${isWelcome ? "Welcome bonus" : `${bonusType} bonus`}`,
      `💵 Deposit: ${formatMoney(deposit)}`,
      `📈 Bonus %: ${bonusPct}%`,
      `🎰 Free spin winnings: ${fsWinnings > 0 ? formatMoney(fsWinnings) : "none"}`,
      `💲 Bonus amount: ${formatMoney(bonus)}`,
      `🔁 Wager multiplier: x${wagerMult}`,
      `🎲 FS multiplier: x${fsMult}`,
      `✅ Total wagers: ${formatMoney(total)}`,
    ].join("\n"));

    resetTimer();
    startTimer();
    setStarted(true);
  }, [computeTotal, difficulty, fsWinningsFor, generateBonusPercent, generateDeposit, resetTimer, startTimer]);

  const onDifficulty = (e) => { const next = e.target.value; setDifficulty(next); newScenario(next); };
  const parseAnswer = (raw) => { const cleaned = String(raw).replace(/[$,\s]/g, ""); const n = Number(cleaned); return Number.isFinite(n) ? n : NaN; };

  const submit = useCallback(() => {
    if (correctAnswer == null) return;
    const val = parseAnswer(answer);
    if (!Number.isFinite(val)) return;
    const ok = Math.abs(val - Number(correctAnswer)) < 0.01;
    setFeedback(ok ? "correct" : "incorrect");
    setShowBreakdown(true);
    if (ok) {
      stopTimer();
      if (currentCasino) {
        setBestTimes((prev) => {
          const prior = prev?.[currentCasino];
          const updated = { ...prev, [currentCasino]: (prior == null || displayTime < prior) ? displayTime : prior };
          try { localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
    }
  }, [answer, correctAnswer, currentCasino, displayTime, stopTimer]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter") submit();
      if (e.key.toLowerCase() === "n") newScenario();
      if (e.key.toLowerCase() === "r") { resetTimer(); startTimer(); setFeedback(null); setShowBreakdown(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newScenario, resetTimer, startTimer, submit]);

  const bestTimesList = useMemo(() => Object.entries(bestTimes), [bestTimes]);

  return (
    <div className="p-6 max-w-3xl mx-auto text-stone-100" style={{ background: "linear-gradient(135deg, #1f1f1f, #2b2b2b)", minHeight: "100vh" }}>
      <h1 className="text-4xl font-extrabold mb-4 text-yellow-400 drop-shadow">🎯 Wager Requirements Trainer</h1>

      <div className="text-sm mb-4 flex flex-wrap gap-4 items-center bg-gray-800 p-3 rounded-lg shadow">
        <span>⏱ Timer: <b>{displayTime.toFixed(1)}s</b></span>
        {bestTimesList.map(([casino, time]) => (<span key={casino}>{casino} Best: <b>{time != null ? time.toFixed(1) + 's' : '—'}</b></span>))}
        <div className="ml-auto flex items-center gap-2">
          <label className="opacity-80">Difficulty</label>
          <select className="text-black border rounded px-2 py-1" value={difficulty} onChange={onDifficulty} title="Changing difficulty starts a new question">
            <option value="easy">Easy - rounded deposits, no FS winnings, more welcome bonuses</option>
            <option value="medium">Medium - moderate deposits, small FS winnings, bonus mix</option>
            <option value="hard">Hard - any deposits, high FS winnings, varied bonuses</option>
          </select>
        </div>
      </div>

      {!started && (<div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-4"><button onClick={() => newScenario()} className="bg-green-600 px-3 py-1 rounded shadow">Start</button></div>)}

      {started && (
        <>
          <p className="mb-4 text-lg bg-gray-900 p-4 rounded-lg shadow border border-gray-700">{prompt}</p>
          <div className="flex gap-2 mb-3">
            <input type="text" inputMode="decimal" value={answer} onChange={(e) => setAnswer(e.target.value)} className="border p-2 flex-1 text-black rounded shadow" placeholder="Enter total wager requirement (e.g., 1,234.56)" />
            <button onClick={submit} className="bg-blue-500 text-white px-4 py-2 rounded shadow">Submit</button>
            <button onClick={() => newScenario()} className="bg-purple-500 text-white px-4 py-2 rounded shadow">New Scenario</button>
          </div>
          <div className="text-xs opacity-75 mb-2">Hotkeys: <kbd className="px-1 py-0.5 bg-gray-800 rounded">Enter</kbd> submit · <kbd className="px-1 py-0.5 bg-gray-800 rounded">N</kbd> new · <kbd className="px-1 py-0.5 bg-gray-800 rounded">R</kbd> restart timer</div>
          {feedback && (<p className={`mt-1 font-bold ${feedback === 'correct' ? 'text-green-400' : 'text-red-400'}`}>{feedback === 'correct' ? '✅ Correct!' : `❌ Incorrect. Correct answer was ${formatMoney(Number(correctAnswer))}`}</p>)}
          {showBreakdown && (<pre className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-lg whitespace-pre-wrap shadow">{breakdown}</pre>)}
        </>
      )}
    </div>
  );
}
