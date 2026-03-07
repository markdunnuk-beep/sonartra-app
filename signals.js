(function () {
  const STORAGE_KEY = "sonartraSignalsAnswers";

  function getAnswers() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  }

  function saveAnswers(answers) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }

  function getCompletionCount(answers) {
    return SIGNALS_QUESTIONS.filter((q) => answers[q.id]).length;
  }

  function calculateScores(answers) {
    const totals = {};

    SIGNALS_QUESTIONS.forEach((question) => {
      const response = Number(answers[question.id] || 0);
      if (!totals[question.dimension]) {
        totals[question.dimension] = { total: 0, count: 0 };
      }
      totals[question.dimension].total += response;
      totals[question.dimension].count += 1;
    });

    const normalized = Object.entries(totals).map(([dimension, value]) => {
      const rawAverage = value.total / value.count;
      const score = Math.round(((rawAverage - 1) / 4) * 100);
      return {
        dimension,
        score: Number.isFinite(score) ? score : 0
      };
    });

    normalized.sort((a, b) => b.score - a.score);
    return normalized;
  }

  function getInterpretation(topScores) {
    const primary = topScores[0];
    if (!primary) {
      return "Complete the assessment to generate your behavioural signal profile.";
    }

    if (primary.score >= 75) {
      return `Primary signal: ${primary.dimension}. You show strong behavioural consistency in this dimension and likely default to it in high-stakes settings.`;
    }

    if (primary.score >= 55) {
      return `Primary signal: ${primary.dimension}. This appears to be a reliable operating mode, supported by a balanced secondary profile.`;
    }

    return `Primary signal: ${primary.dimension}. Your profile is currently broad and adaptable rather than heavily concentrated in one style.`;
  }

  function renderAssessment() {
    const questionText = document.getElementById("questionText");
    const questionMeta = document.getElementById("questionMeta");
    const progressBar = document.getElementById("progressBar");
    const scaleWrap = document.getElementById("scaleOptions");
    const backButton = document.getElementById("backButton");
    const nextButton = document.getElementById("nextButton");
    const finishButton = document.getElementById("finishButton");

    const answers = getAnswers();
    let currentIndex = Math.min(getCompletionCount(answers), SIGNALS_QUESTIONS.length - 1);

    function renderQuestion() {
      const currentQuestion = SIGNALS_QUESTIONS[currentIndex];
      questionText.textContent = currentQuestion.text;
      questionMeta.textContent = `Question ${currentIndex + 1} of ${SIGNALS_QUESTIONS.length} · ${currentQuestion.dimension}`;

      const completion = Math.round((getCompletionCount(answers) / SIGNALS_QUESTIONS.length) * 100);
      progressBar.style.width = `${completion}%`;

      scaleWrap.innerHTML = "";
      [1, 2, 3, 4, 5].forEach((value) => {
        const label = document.createElement("label");
        label.className = "scale-option";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "signal-scale";
        input.value = String(value);
        input.checked = Number(answers[currentQuestion.id]) === value;

        input.addEventListener("change", () => {
          answers[currentQuestion.id] = value;
          saveAnswers(answers);
          updateButtons();
          const completionPct = Math.round((getCompletionCount(answers) / SIGNALS_QUESTIONS.length) * 100);
          progressBar.style.width = `${completionPct}%`;
        });

        const text = document.createElement("span");
        text.textContent = `${value} · ${SCALE_LABELS[value]}`;

        label.appendChild(input);
        label.appendChild(text);
        scaleWrap.appendChild(label);
      });

      updateButtons();
    }

    function updateButtons() {
      const question = SIGNALS_QUESTIONS[currentIndex];
      const answered = Boolean(answers[question.id]);
      const isLast = currentIndex === SIGNALS_QUESTIONS.length - 1;

      backButton.disabled = currentIndex === 0;
      nextButton.disabled = !answered || isLast;
      finishButton.disabled = getCompletionCount(answers) < SIGNALS_QUESTIONS.length;
    }

    backButton.addEventListener("click", () => {
      currentIndex = Math.max(currentIndex - 1, 0);
      renderQuestion();
    });

    nextButton.addEventListener("click", () => {
      currentIndex = Math.min(currentIndex + 1, SIGNALS_QUESTIONS.length - 1);
      renderQuestion();
    });

    finishButton.addEventListener("click", () => {
      window.location.href = "results.html";
    });

    renderQuestion();
  }

  function renderResults() {
    const answers = getAnswers();
    const count = getCompletionCount(answers);

    const scoreList = document.getElementById("scoreList");
    const summaryLine = document.getElementById("summaryLine");
    const interpretation = document.getElementById("interpretation");
    const retakeBtn = document.getElementById("retakeButton");

    if (count < SIGNALS_QUESTIONS.length) {
      summaryLine.textContent = `Assessment incomplete: ${count}/${SIGNALS_QUESTIONS.length} questions answered.`;
      interpretation.textContent = "Complete every question to see your full behavioural signal output.";
      scoreList.innerHTML = "";
      return;
    }

    const scores = calculateScores(answers);
    const topThree = scores.slice(0, 3);

    summaryLine.textContent = `Profile readiness: ${count}/${SIGNALS_QUESTIONS.length} answers captured. Primary signal is ${topThree[0].dimension}.`;
    interpretation.textContent = getInterpretation(topThree);

    scoreList.innerHTML = "";
    scores.forEach((item) => {
      const block = document.createElement("article");
      block.className = "score-card";

      const header = document.createElement("div");
      header.className = "score-header";
      header.innerHTML = `<h3>${item.dimension}</h3><strong>${item.score}</strong>`;

      const bar = document.createElement("div");
      bar.className = "score-bar";
      const fill = document.createElement("span");
      fill.style.width = `${item.score}%`;
      bar.appendChild(fill);

      block.appendChild(header);
      block.appendChild(bar);
      scoreList.appendChild(block);
    });

    retakeBtn.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      window.location.href = "assessment.html";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page === "assessment") {
      renderAssessment();
    }

    if (document.body.dataset.page === "results") {
      renderResults();
    }
  });
})();
