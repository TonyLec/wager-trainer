import React, { useEffect, useRef, useState } from "react";

const RS_WELCOME = 30;
const RS_REGULAR = 20;
const GOLDEN_REGULAR = 10;
const GOLDEN_GV_REGULAR = 15;
const RS_FS = 40;
const GOLDEN_FS = 30;

const NAMES = ["Alex Johnson","Taylor Smith","Jordan Brown","Casey Miller","Drew Davis","Morgan Wilson","Jamie Moore","Cameron Taylor","Reese Anderson","Quinn Thomas","Avery Jackson","Riley White","Skyler Harris","Peyton Martin","Harper Thompson","Logan Garcia","Charlie Martinez","Emerson Robinson","Finley Clark","Hayden Rodriguez","Rowan Lewis","Sawyer Lee","Parker Walker","Dakota Hall","Jesse Allen","Kendall Young","Blake King","Micah Wright","River Scott"];

const formatMoney = (n) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

export default function WagerTrainer() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdown, setBreakdown] = useState("");
  const [currentCasino, setCurrentCasino] = useState(null);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [bestTimes, setBestTimes] = useState(() => {
    try {
      const v = localStorage.getItem("wagerTrainer_bestTimes");
      return v ? JSON.parse(v) : { RS: null, Golden: null, "Golden GV": null };
    } catch {
      return { RS: null, Golden: null, "Golden GV": null };
    }
  });
  const ticker = useRef(null);
  const [difficulty, setDifficulty] = useState("easy");

  useEffect(() => {
    if (running) {
      ticker.current = setInterval(() => setTimer((t) => Number((t + 0.1).toFixed(1))), 100);
    }
    return () => { if (ticker.current) clearInterval(ticker.current); };
  }, [running]);

  const computeTotal = ({ casino, isWelcome, deposit, bonusPct, fsWinnings }) => {
    const bonus = deposit * (bonusPct / 100);
    let wagerMult;
    if (casino === "RS") wagerMult = isWelcome ? RS_WELCOME : RS_REGULAR;
    else if (casino === "Golden") wagerMult = GOLDEN_REGULAR;
    else if (casino === "Golden GV") wagerMult = GOLDEN_GV_REGULAR;
    const fsMult = casino === "RS" ? RS_FS : GOLDEN_FS;
    const total = ((deposit + bonus) * wagerMult) + (fsWinnings * fsMult);
    return { bonus, total };
  };

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const generateDeposit = (difficulty) => {
    if (Math.random() < 0.25) return 25;
    if (difficulty === "easy") return pick([10, 50, 75, 100, 150, 200, 250, 300]);
    if (difficulty === "medium") return pick(Array.from({ length: 59 }, (_, i) => (i + 2) * 5));
    return parseFloat((Math.random() * 290 + 10).toFixed(2));
  };

  const generateBonusPercent = (casino, isWelcome, bonusType) => {
    if (casino === "RS" && isWelcome) {
      if (Math.random() < 0.5) return 275;
      return pick([175, 100, 275]);
    }
    if (bonusType === "Regular") return 10 + (Math.floor(Math.random() * ((170 - 10) / 5 + 1)) * 5);
    if (bonusType === "VIP") return 150 + (Math.floor(Math.random() * ((400 - 150) / 5 + 1)) * 5);
    return 0;
  };

  const generateScenario = (diff = difficulty) => {
    let casino = Math.random() < 0.75 ? "RS" : Math.random() < 0.5 ? "Golden" : "Golden GV";
    const bonusType = casino === "RS" && (diff === "easy" ? Math.random() < 0.7 : Math.random() < 0.5) ? "Welcome" : Math.random() < 0.5 ? "Regular" : "VIP";
    const isWelcome = bonusType === "Welcome";
    const deposit = generateDeposit(diff);
    const bonusPct = generateBonusPercent(casino, isWelcome, bonusType);
    let fsWinnings = diff === "easy" ? 0 : diff === "medium" ? pick([0, 5, 10, 15, 20, 25, 50, 75, 100, 150, 199]) : parseFloat((Math.random() * 198.99 + 1).toFixed(2));
    const { bonus, total } = computeTotal({ casino, isWelcome, deposit, bonusPct, fsWinnings });
    const fsText = fsWinnings > 0 ?  I also won ${formatMoney(fsWinnings)} from free spins. : "";
    const introText = isWelcome ? for my ${bonusPct === 275 ? 'first time depositing' : 'welcome bonus'} (${bonusPct}%) : and claimed a ${bonusPct}% ${bonusType.toLowerCase()} bonus;
    const customerName = pick(NAMES);
    setPrompt(💬 ${customerName}: Hi, I just deposited ${formatMoney(deposit)} at ${casino} Casino ${introText}. Can you tell me my total wagers?${fsText});
    setAnswer("");
    setFeedback(null);
    setShowBreakdown(false);
    setCorrectAnswer(total.toFixed(2));
    setBreakdown(🏢 Casino: ${casino}\n🎁 Bonus type: ${isWelcome ? "Welcome bonus" : ${bonusType} bonus}\n💵 Deposit: ${formatMoney(deposit)}\n📈 Bonus %: ${bonusPct}%\n🎰 Free spin winnings: ${fsWinnings > 0 ? formatMoney(fsWinnings) : "none"}\n💲 Bonus amount: ${formatMoney(bonus)}\n✅ Total wagers: ${formatMoney(total)});
    if (ticker.current) clearInterval(ticker.current);
    setTimer(0);
    setRunning(true);
    setCurrentCasino(casino);
    setStarted(true);
  };

  const submit = () => {
    if (!correctAnswer) return;
    const val = Number(answer);
    if (!isFinite(val)) return;
    const ok = Math.abs(val - Number(correctAnswer)) < 0.01;
    setFeedback(ok ? "correct" : "incorrect");
    setShowBreakdown(true);
    setRunning(false);
    if (ok && currentCasino) {
      if (bestTimes[currentCasino] == null || timer < bestTimes[currentCasino]) {
        const updated = { ...bestTimes, [currentCasino]: timer };
        setBestTimes(updated);
        try { localStorage.setItem("wagerTrainer_bestTimes", JSON.stringify(updated)); } catch {}
      }
    }
  };

  const handleDifficultyChange = (e) => { const next = e.target.value; setDifficulty(next); generateScenario(next); };

  return (
    <div className="p-6 max-w-3xl mx-auto text-stone-100" style={{ background: "linear-gradient(135deg, #1f1f1f, #2b2b2b)", minHeight: "100vh" }}>
      <h1 className="text-4xl font-extrabold mb-4 text-yellow-400 drop-shadow">🎯 Wager Requirements Trainer</h1>
      <div className="text-sm mb-4 flex flex-wrap gap-4 items-center bg-gray-800 p-3 rounded-lg shadow">
        <span>⏱ Timer: <b>{timer.toFixed(1)}s</b></span>
        {Object.entries(bestTimes).map(([casino, time]) => (
          <span key={casino}>{casino} Best: <b>{time != null ? time.toFixed(1) + 's' : '—'}</b></span>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <label className="opacity-80">Difficulty</label>
          <select className="text-black border rounded px-2 py-1" value={difficulty} onChange={handleDifficultyChange} title="Changing difficulty starts a new question">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>
      {!started && (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-4">
          <button onClick={generateScenario} className="bg-green-600 px-3 py-1 rounded shadow">Start</button>
        </div>
      )}
      {started && (
        <>
          <p className="mb-4 text-lg bg-gray-900 p-4 rounded-lg shadow border border-gray-700">{prompt}</p>
          <div className="flex gap-2 mb-3">
            <input type="number" value={answer} onChange={(e) => setAnswer(e.target.value)} className="border p-2 flex-1 text-black rounded shadow" placeholder="Enter total wager requirement" onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
            <button onClick={submit} className="bg-blue-500 text-white px-4 py-2 rounded shadow">Submit</button>
            <button onClick={generateScenario} className="bg-purple-500 text-white px-4 py-2 rounded shadow">New Scenario</button>
          </div>
          {feedback && (
            <p className={mt-1 font-bold ${feedback === 'correct' ? 'text-green-400' : 'text-red-400'}}>
              {feedback === 'correct' ? '✅ Correct!' : ❌ Incorrect. Correct answer was ${formatMoney(Number(correctAnswer))}}
            </p>
          )}
          {showBreakdown && (
            <pre className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-lg whitespace-pre-wrap shadow">{breakdown}</pre>
          )}
        </>
      )}
    </div>
  );
}