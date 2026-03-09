(function () {
  const STORAGE_KEY = "sonartraSignalsAnswers";
  const LEAD_STORAGE_KEY = "sonartraSignalsLead";

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

  function valueFor(map, key) {
    return Number.isFinite(map[key]) ? map[key] : 0;
  }

  function sortedEntries(obj) {
    return Object.entries(obj).sort((a, b) => b[1] - a[1]);
  }

  function clampScore(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function weightedIndex(parts) {
    const aggregate = parts.reduce((acc, part) => {
      return {
        total: acc.total + (part.score * part.weight),
        weight: acc.weight + part.weight
      };
    }, { total: 0, weight: 0 });

    if (!aggregate.weight) {
      return 0;
    }

    return clampScore(aggregate.total / aggregate.weight);
  }

  function deriveProfile(scores) {
    const scoreMap = scores.reduce((acc, item) => {
      acc[item.dimension] = item.score;
      return acc;
    }, {});

    const styles = {
      Driver: valueFor(scoreMap, "Driver"),
      Influencer: valueFor(scoreMap, "Influencer"),
      Stabiliser: valueFor(scoreMap, "Stabiliser"),
      Analyst: valueFor(scoreMap, "Analyst")
    };

    const motivators = {
      Achievement: valueFor(scoreMap, "Achievement"),
      Influence: valueFor(scoreMap, "Influence"),
      Stability: weightedIndex([
        { score: styles.Stabiliser, weight: 0.65 },
        { score: valueFor(scoreMap, "People"), weight: 0.35 }
      ]),
      Mastery: weightedIndex([
        { score: styles.Analyst, weight: 0.6 },
        { score: valueFor(scoreMap, "Conscientiousness"), weight: 0.4 }
      ])
    };

    const leadership = {
      Results: weightedIndex([
        { score: styles.Driver, weight: 0.65 },
        { score: motivators.Achievement, weight: 0.35 }
      ]),
      Vision: weightedIndex([
        { score: styles.Influencer, weight: 0.65 },
        { score: valueFor(scoreMap, "Adhocracy"), weight: 0.35 }
      ]),
      People: weightedIndex([
        { score: valueFor(scoreMap, "People"), weight: 0.7 },
        { score: styles.Stabiliser, weight: 0.3 }
      ]),
      Process: weightedIndex([
        { score: valueFor(scoreMap, "Process"), weight: 0.65 },
        { score: styles.Analyst, weight: 0.35 }
      ])
    };

    const conflict = {
      Compete: valueFor(scoreMap, "Compete"),
      Collaborate: weightedIndex([
        { score: valueFor(scoreMap, "People"), weight: 0.45 },
        { score: styles.Influencer, weight: 0.3 },
        { score: styles.Analyst, weight: 0.25 }
      ]),
      Compromise: weightedIndex([
        { score: styles.Stabiliser, weight: 0.5 },
        { score: styles.Influencer, weight: 0.25 },
        { score: styles.Driver, weight: 0.25 }
      ]),
      Accommodate: weightedIndex([
        { score: styles.Stabiliser, weight: 0.6 },
        { score: valueFor(scoreMap, "People"), weight: 0.4 }
      ]),
      Avoid: clampScore(100 - valueFor(scoreMap, "Compete") - (styles.Driver * 0.2))
    };

    const stress = {
      Control: valueFor(scoreMap, "Control"),
      Criticality: weightedIndex([
        { score: styles.Analyst, weight: 0.5 },
        { score: valueFor(scoreMap, "Conscientiousness"), weight: 0.5 }
      ]),
      Avoidance: weightedIndex([
        { score: Math.max(0, 100 - styles.Driver), weight: 0.45 },
        { score: styles.Stabiliser, weight: 0.55 }
      ]),
      Scatter: weightedIndex([
        { score: styles.Influencer, weight: 0.6 },
        { score: valueFor(scoreMap, "Adhocracy"), weight: 0.4 }
      ])
    };

    const styleRanked = sortedEntries(styles);
    const motivatorRanked = sortedEntries(motivators);
    const leadershipRanked = sortedEntries(leadership);
    const stressRanked = sortedEntries(stress);

    return {
      styles,
      motivators,
      leadership,
      conflict,
      stress,
      summary: {
        primaryStyle: (styleRanked[0] || ["—"])[0],
        secondaryStyle: (styleRanked[1] || ["—"])[0],
        topMotivator: (motivatorRanked[0] || ["—"])[0],
        leadershipTilt: (leadershipRanked[0] || ["—"])[0],
        stressRisk: (stressRanked[0] || ["—"])[0]
      }
    };
  }

  function getInterpretation(profile) {
    const primaryScore = profile.styles[profile.summary.primaryStyle] || 0;
    const processStrength = profile.leadership.Process;
    const peopleStrength = profile.leadership.People;
    const stressRiskScore = profile.stress[profile.summary.stressRisk] || 0;

    const executionLens = processStrength >= 60
      ? "This profile appears strongest in environments requiring judgement, rigour, and structured execution"
      : "This profile appears strongest when outcomes need tempo, adaptability, and visible ownership";

    const collaborationLens = peopleStrength >= 55
      ? "Collaboration signals indicate an ability to stabilise team alignment while maintaining standards"
      : "Collaboration signals suggest a preference for performance clarity over consensus-heavy operating models";

    const stressLens = stressRiskScore >= 60
      ? `Under pressure, the pattern suggests increased ${profile.summary.stressRisk.toLowerCase()} rather than emotional diffusion`
      : "Under pressure, the pattern remains comparatively balanced with controlled behavioural variance";

    const valueLens = primaryScore >= 65
      ? "This behavioural architecture is likely to add disproportionate value in systems-heavy, performance-accountable roles"
      : "This behavioural architecture is versatile and likely to add value across cross-functional execution contexts";

    return `${executionLens}. ${collaborationLens}. ${stressLens}. ${valueLens}.`;
  }

  function buildMetricCard(title, metrics) {
    const card = document.createElement("article");
    card.className = "results-card";

    const heading = document.createElement("h3");
    heading.textContent = title;
    card.appendChild(heading);

    sortedEntries(metrics).forEach(([label, score]) => {
      const row = document.createElement("div");
      row.className = "metric-row";

      const metricLabel = document.createElement("span");
      metricLabel.className = "metric-label";
      metricLabel.textContent = label;

      const bar = document.createElement("div");
      bar.className = "metric-bar";
      const fill = document.createElement("span");
      fill.style.width = `${Math.max(0, Math.min(100, score))}%`;
      bar.appendChild(fill);

      const value = document.createElement("span");
      value.className = "metric-value";
      value.textContent = String(Math.round(score));

      row.appendChild(metricLabel);
      row.appendChild(bar);
      row.appendChild(value);
      card.appendChild(row);
    });

    return card;
  }

  function renderRadar(styles) {
    const svg = document.getElementById("profileRadar");
    const legend = document.getElementById("radarLegend");

    if (!svg || !legend) {
      return;
    }

    const axes = ["Driver", "Influencer", "Stabiliser", "Analyst"];
    const center = 160;
    const radius = 118;

    const rings = [25, 50, 75, 100].map((pct) => {
      const r = (radius * pct) / 100;
      const points = axes
        .map((_, idx) => {
          const angle = (-Math.PI / 2) + ((Math.PI * 2 * idx) / axes.length);
          const x = center + (Math.cos(angle) * r);
          const y = center + (Math.sin(angle) * r);
          return `${x},${y}`;
        })
        .join(" ");
      return `<polygon class="radar-ring" points="${points}" />`;
    }).join("");

    const axisLines = axes
      .map((axis, idx) => {
        const angle = (-Math.PI / 2) + ((Math.PI * 2 * idx) / axes.length);
        const x = center + (Math.cos(angle) * radius);
        const y = center + (Math.sin(angle) * radius);
        return `<line class="radar-axis" x1="${center}" y1="${center}" x2="${x}" y2="${y}" />`;
      })
      .join("");

    const profilePoints = axes
      .map((axis, idx) => {
        const score = Math.max(0, Math.min(100, styles[axis] || 0));
        const angle = (-Math.PI / 2) + ((Math.PI * 2 * idx) / axes.length);
        const r = (radius * score) / 100;
        const x = center + (Math.cos(angle) * r);
        const y = center + (Math.sin(angle) * r);
        return `${x},${y}`;
      })
      .join(" ");

    const labels = axes
      .map((axis, idx) => {
        const angle = (-Math.PI / 2) + ((Math.PI * 2 * idx) / axes.length);
        const x = center + (Math.cos(angle) * (radius + 24));
        const y = center + (Math.sin(angle) * (radius + 24));
        return `<text class="radar-label" x="${x}" y="${y}">${axis}</text>`;
      })
      .join("");

    svg.innerHTML = `${rings}${axisLines}<polygon class="radar-shape" points="${profilePoints}" />${labels}`;

    legend.innerHTML = "";
    axes.forEach((axis) => {
      const item = document.createElement("div");
      item.className = "radar-legend-item";
      item.innerHTML = `<span>${axis}</span><strong>${Math.round(styles[axis] || 0)}</strong>`;
      legend.appendChild(item);
    });
  }

  function renderSummaryCards(profile) {
    const summaryCards = document.getElementById("summaryCards");
    if (!summaryCards) {
      return;
    }

    const items = [
      ["Primary Style", profile.summary.primaryStyle],
      ["Secondary Style", profile.summary.secondaryStyle],
      ["Top Motivator", profile.summary.topMotivator],
      ["Leadership Tilt", profile.summary.leadershipTilt],
      ["Stress Risk", profile.summary.stressRisk]
    ];

    summaryCards.innerHTML = "";
    items.forEach(([label, value]) => {
      const card = document.createElement("article");
      card.className = "summary-card";
      card.innerHTML = `<span class="summary-label">${label}</span><span class="summary-value">${value}</span>`;
      summaryCards.appendChild(card);
    });
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

    const summaryLine = document.getElementById("summaryLine");
    const interpretation = document.getElementById("interpretation");
    const scoreSections = document.getElementById("scoreSections");
    const retakeBtn = document.getElementById("retakeButton");
    const leadForm = document.getElementById("leadForm");
    const leadSuccess = document.getElementById("leadSuccess");

    if (count < SIGNALS_QUESTIONS.length) {
      summaryLine.textContent = `Assessment incomplete: ${count}/${SIGNALS_QUESTIONS.length} questions answered.`;
      interpretation.textContent = "Complete every question to generate your full behavioural intelligence profile.";
      if (scoreSections) {
        scoreSections.innerHTML = "";
      }
      renderSummaryCards({
        summary: {
          primaryStyle: "—",
          secondaryStyle: "—",
          topMotivator: "—",
          leadershipTilt: "—",
          stressRisk: "—"
        }
      });
      renderRadar({ Driver: 0, Influencer: 0, Stabiliser: 0, Analyst: 0 });
    } else {
      const scores = calculateScores(answers);
      const profile = deriveProfile(scores);

      summaryLine.textContent = `Profile readiness: ${count}/${SIGNALS_QUESTIONS.length} behavioural signals captured. Primary orientation is ${profile.summary.primaryStyle} with ${profile.summary.topMotivator.toLowerCase()} as the leading motivator.`;
      interpretation.textContent = getInterpretation(profile);

      renderSummaryCards(profile);

      scoreSections.innerHTML = "";
      const sections = [
        ["Behavioural Styles", profile.styles],
        ["Motivational Drivers", profile.motivators],
        ["Leadership Orientation", profile.leadership],
        ["Conflict Style", profile.conflict],
        ["Stress Risk Signals", profile.stress]
      ];

      sections.forEach(([title, data]) => {
        scoreSections.appendChild(buildMetricCard(title, data));
      });

      renderRadar(profile.styles);
    }

    if (retakeBtn) {
      retakeBtn.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = "assessment.html";
      });
    }

    if (leadForm && leadSuccess) {
      const existingLead = localStorage.getItem(LEAD_STORAGE_KEY);
      if (existingLead) {
        leadSuccess.textContent = "Saved. Our team will use your details for a tailored organisational walkthrough.";
      }

      leadForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(leadForm);
        const payload = Object.fromEntries(formData.entries());
        localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(payload));
        leadSuccess.textContent = "Thanks — your request has been captured. We'll be in touch with a strategic demo.";
        leadForm.reset();
      });
    }
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
