(function () {
  const ANSWERS_STORAGE_KEY = "sonartraSignalsAnswers";
  const PROFILE_STORAGE_KEY = "sonartraProfile";
  const LEAD_STORAGE_KEY = "sonartraSignalsLead";

  const PROFILE_DIMENSIONS = {
    styles: ["driver", "influencer", "stabiliser", "analyst"],
    motivators: ["achievement", "influence", "stability", "mastery"],
    leadership: ["results", "vision", "people", "process"],
    conflict: ["compete", "collaborate", "compromise", "avoid"],
    stress: ["control", "scatter", "avoidance", "criticality"]
  };

  function getAnswers() {
    const saved = localStorage.getItem(ANSWERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  }

  function saveAnswers(answers) {
    localStorage.setItem(ANSWERS_STORAGE_KEY, JSON.stringify(answers));
  }

  function getProfile() {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  }

  function saveProfile(profile) {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }

  function getCompletionCount(answers) {
    return SIGNALS_QUESTIONS.filter((q) => answers[q.id]).length;
  }

  function normalizeLikert(value) {
    const score = Math.round(((Number(value) - 1) / 4) * 100);
    return Number.isFinite(score) ? Math.min(Math.max(score, 0), 100) : 0;
  }

  function getAnswerScore(answers, id) {
    return normalizeLikert(answers[id] || 0);
  }

  function averageScores(scores) {
    const validScores = scores.filter((score) => Number.isFinite(score));
    if (!validScores.length) {
      return 0;
    }

    const total = validScores.reduce((sum, value) => sum + value, 0);
    return Math.round(total / validScores.length);
  }

  function createEmptyProfile() {
    return Object.entries(PROFILE_DIMENSIONS).reduce((acc, [group, dimensions]) => {
      acc[group] = dimensions.reduce((dimensionMap, key) => {
        dimensionMap[key] = 0;
        return dimensionMap;
      }, {});
      return acc;
    }, {});
  }

  function sortedEntries(obj) {
    return Object.entries(obj).sort((a, b) => b[1] - a[1]);
  }

  function capitalizeLabel(label) {
    return label
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function calculateProfile(answers) {
    const profile = createEmptyProfile();

    const driver = getAnswerScore(answers, 1);
    const influencer = getAnswerScore(answers, 2);
    const stabiliser = getAnswerScore(answers, 3);
    const analyst = getAnswerScore(answers, 4);
    const achievement = getAnswerScore(answers, 5);
    const influence = getAnswerScore(answers, 6);
    const people = getAnswerScore(answers, 7);
    const process = getAnswerScore(answers, 8);
    const compete = getAnswerScore(answers, 9);
    const control = getAnswerScore(answers, 10);
    const adhocracy = getAnswerScore(answers, 11);
    const conscientiousness = getAnswerScore(answers, 12);

    profile.styles.driver = driver;
    profile.styles.influencer = influencer;
    profile.styles.stabiliser = stabiliser;
    profile.styles.analyst = analyst;

    profile.motivators.achievement = achievement;
    profile.motivators.influence = influence;
    profile.motivators.stability = stabiliser;
    profile.motivators.mastery = averageScores([analyst, conscientiousness]);

    profile.leadership.results = averageScores([driver, achievement]);
    profile.leadership.vision = averageScores([influencer, adhocracy]);
    profile.leadership.people = people;
    profile.leadership.process = averageScores([process, conscientiousness]);

    profile.conflict.compete = compete;
    profile.conflict.collaborate = people;
    profile.conflict.compromise = averageScores([stabiliser, people]);
    profile.conflict.avoid = averageScores([stabiliser, Math.max(100 - compete, 0)]);

    profile.stress.control = control;
    profile.stress.scatter = averageScores([influencer, adhocracy]);
    profile.stress.avoidance = averageScores([stabiliser, Math.max(100 - compete, 0)]);
    profile.stress.criticality = averageScores([analyst, conscientiousness]);

    const styleRanked = sortedEntries(profile.styles);
    const motivatorRanked = sortedEntries(profile.motivators);
    const leadershipRanked = sortedEntries(profile.leadership);
    const stressRanked = sortedEntries(profile.stress);

    profile.summary = {
      primaryStyle: capitalizeLabel((styleRanked[0] || ["—"])[0]),
      secondaryStyle: capitalizeLabel((styleRanked[1] || ["—"])[0]),
      topMotivator: capitalizeLabel((motivatorRanked[0] || ["—"])[0]),
      leadershipTilt: capitalizeLabel((leadershipRanked[0] || ["—"])[0]),
      stressRisk: capitalizeLabel((stressRanked[0] || ["—"])[0])
    };

    return profile;
  }

  function getInterpretation(profile) {
    const topStyle = sortedEntries(profile.styles)[0];
    const topLeadership = sortedEntries(profile.leadership)[0];
    const stressSignal = sortedEntries(profile.stress)[0];

    if (!topStyle || topStyle[1] === 0) {
      return "Complete the full assessment to generate a calibrated behavioural interpretation.";
    }

    return [
      `Primary behavioural energy is concentrated in ${capitalizeLabel(topStyle[0])} (${topStyle[1]}).`,
      `Leadership orientation is strongest in ${capitalizeLabel(topLeadership[0]).toLowerCase()} execution.`,
      `Under pressure, the dominant stress pattern indicates ${capitalizeLabel(stressSignal[0]).toLowerCase()}.`,
      "Use this profile as a directional signal for role fit, team composition, and performance deployment."
    ].join(" ");
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
      metricLabel.textContent = capitalizeLabel(label);

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

  function renderRadar(styles) {
    const svg = document.getElementById("profileRadar");
    const legend = document.getElementById("radarLegend");

    if (!svg || !legend) {
      return;
    }

    const axes = [
      ["Driver", "driver"],
      ["Influencer", "influencer"],
      ["Stabiliser", "stabiliser"],
      ["Analyst", "analyst"]
    ];
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
      .map((_, idx) => {
        const angle = (-Math.PI / 2) + ((Math.PI * 2 * idx) / axes.length);
        const x = center + (Math.cos(angle) * radius);
        const y = center + (Math.sin(angle) * radius);
        return `<line class="radar-axis" x1="${center}" y1="${center}" x2="${x}" y2="${y}" />`;
      })
      .join("");

    const profilePoints = axes
      .map(([, key], idx) => {
        const score = Math.max(0, Math.min(100, styles[key] || 0));
        const angle = (-Math.PI / 2) + ((Math.PI * 2 * idx) / axes.length);
        const r = (radius * score) / 100;
        const x = center + (Math.cos(angle) * r);
        const y = center + (Math.sin(angle) * r);
        return `${x},${y}`;
      })
      .join(" ");

    const labels = axes
      .map(([label], idx) => {
        const angle = (-Math.PI / 2) + ((Math.PI * 2 * idx) / axes.length);
        const x = center + (Math.cos(angle) * (radius + 24));
        const y = center + (Math.sin(angle) * (radius + 24));
        return `<text class="radar-label" x="${x}" y="${y}">${label}</text>`;
      })
      .join("");

    svg.innerHTML = `${rings}${axisLines}<polygon class="radar-shape" points="${profilePoints}" />${labels}`;

    legend.innerHTML = "";
    axes.forEach(([label, key]) => {
      const item = document.createElement("div");
      item.className = "radar-legend-item";
      item.innerHTML = `<span>${label}</span><strong>${Math.round(styles[key] || 0)}</strong>`;
      legend.appendChild(item);
    });
  }

  function renderLeadCapture() {
    const leadForm = document.getElementById("leadForm");
    const leadSuccess = document.getElementById("leadSuccess");

    if (!leadForm || !leadSuccess) {
      return;
    }

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

    function updateButtons() {
      const question = SIGNALS_QUESTIONS[currentIndex];
      const answered = Boolean(answers[question.id]);
      const isLast = currentIndex === SIGNALS_QUESTIONS.length - 1;

      backButton.disabled = currentIndex === 0;
      nextButton.disabled = !answered || isLast;
      finishButton.disabled = getCompletionCount(answers) < SIGNALS_QUESTIONS.length;
    }

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

    backButton.addEventListener("click", () => {
      currentIndex = Math.max(currentIndex - 1, 0);
      renderQuestion();
    });

    nextButton.addEventListener("click", () => {
      currentIndex = Math.min(currentIndex + 1, SIGNALS_QUESTIONS.length - 1);
      renderQuestion();
    });

    finishButton.addEventListener("click", () => {
      if (getCompletionCount(answers) < SIGNALS_QUESTIONS.length) {
        return;
      }

      const profile = calculateProfile(answers);
      saveProfile(profile);
      window.location.href = "results.html";
    });

    renderQuestion();
  }

  function renderResults() {
    const answers = getAnswers();
    const completionCount = getCompletionCount(answers);
    const summaryLine = document.getElementById("summaryLine");
    const interpretation = document.getElementById("interpretation");
    const scoreSections = document.getElementById("scoreSections");
    const retakeBtn = document.getElementById("retakeButton");

    let profile = getProfile();

    if (!profile && completionCount === SIGNALS_QUESTIONS.length) {
      profile = calculateProfile(answers);
      saveProfile(profile);
    }

    if (!profile) {
      if (summaryLine) {
        summaryLine.textContent = `Assessment incomplete: ${completionCount}/${SIGNALS_QUESTIONS.length} responses captured.`;
      }
      if (interpretation) {
        interpretation.textContent = "Complete all questions to unlock your behavioural performance intelligence report.";
      }
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
      renderRadar({ driver: 0, influencer: 0, stabiliser: 0, analyst: 0 });
      return;
    }

    if (summaryLine) {
      summaryLine.textContent = `Profile readiness: ${completionCount}/${SIGNALS_QUESTIONS.length} behavioural responses captured.`;
    }
    if (interpretation) {
      interpretation.textContent = getInterpretation(profile);
    }

    renderSummaryCards(profile);

    if (scoreSections) {
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
    }

    renderRadar(profile.styles);
    renderLeadCapture();

    if (retakeBtn) {
      retakeBtn.addEventListener("click", () => {
        localStorage.removeItem(ANSWERS_STORAGE_KEY);
        localStorage.removeItem(PROFILE_STORAGE_KEY);
        window.location.href = "assessment.html";
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
