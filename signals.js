(function () {
  const ANSWERS_STORAGE_KEY = "sonartraSignalsAnswers";
  const PROFILE_STORAGE_KEY = "sonartraProfile";
  const LEAD_STORAGE_KEY = "sonartraLeadIntake";

  const PROFILE_DIMENSIONS = {
    styles: ["driver", "influencer", "stabiliser", "analyst"],
    motivators: ["achievement", "influence", "stability", "mastery"],
    leadership: ["results", "vision", "people", "process"],
    conflict: ["compete", "collaborate", "compromise", "avoid"],
    culture: ["market", "adhocracy", "clan", "hierarchy"],
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
    return Math.round(validScores.reduce((sum, value) => sum + value, 0) / validScores.length);
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
    profile.leadership.process = process;

    profile.conflict.compete = compete;
    profile.conflict.collaborate = people;
    profile.conflict.compromise = averageScores([stabiliser, people]);
    profile.conflict.avoid = averageScores([stabiliser, Math.max(100 - compete, 0)]);

    profile.culture.market = averageScores([driver, achievement]);
    profile.culture.adhocracy = adhocracy;
    profile.culture.clan = people;
    profile.culture.hierarchy = averageScores([process, conscientiousness]);

    profile.stress.control = control;
    profile.stress.scatter = averageScores([influencer, adhocracy]);
    profile.stress.avoidance = averageScores([stabiliser, Math.max(100 - compete, 0)]);
    profile.stress.criticality = averageScores([analyst, conscientiousness]);

    return profile;
  }

  function capitalizeLabel(label) {
    return label
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function getTopDimensions(groupScores, limit) {
    return Object.entries(groupScores || {})
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, limit)
      .map(([key, score]) => ({ key, score }));
  }

  function normaliseForBar(value, maxValue) {
    const denominator = maxValue > 0 ? maxValue : 100;
    const width = Math.round((value / denominator) * 100);
    return `${Math.min(Math.max(width, 0), 100)}%`;
  }

  function generateInterpretationText(profile) {
    const topStyle = getTopDimensions(profile.styles, 1)[0];
    const topMotivator = getTopDimensions(profile.motivators, 1)[0];
    const topLeadership = getTopDimensions(profile.leadership, 1)[0];
    const topStress = getTopDimensions(profile.stress, 1)[0];

    if (!topStyle || topStyle.score === 0) {
      return "Complete the full 12-question sequence to generate a calibrated behavioural intelligence narrative.";
    }

    const styleNarratives = {
      analyst: "You appear most comfortable operating through structure, analysis, and precision.",
      driver: "You appear most effective when accountability is explicit and execution speed is high.",
      influencer: "You appear to operate best in environments where momentum, visibility, and persuasion unlock progress.",
      stabiliser: "You appear most reliable in operating models that reward consistency, trust, and disciplined delivery rhythms."
    };

    const stressNarratives = {
      control: "Under pressure, you may tighten control and raise operating standards quickly.",
      criticality: "Under pressure, your judgement can become more exacting, which strengthens quality control in high-accountability settings.",
      avoidance: "Under pressure, there is risk of conflict deferral, making explicit decision ownership important.",
      scatter: "Under pressure, there is risk of directional diffusion, so structured prioritisation becomes essential."
    };

    return [
      styleNarratives[topStyle.key],
      `Your profile suggests strongest motivational energy around ${capitalizeLabel(topMotivator.key).toLowerCase()} and a ${capitalizeLabel(topLeadership.key).toLowerCase()}-oriented leadership tilt.`,
      stressNarratives[topStress.key],
      "Overall, this is a profile with clear strategic strengths when deployed into well-defined performance architecture."
    ].join(" ");
  }

  function renderSummaryCards(profile) {
    const topStyles = getTopDimensions(profile.styles, 2);
    const topMotivator = getTopDimensions(profile.motivators, 1)[0];
    const topLeadership = getTopDimensions(profile.leadership, 1)[0];

    const values = {
      summaryPrimaryStyle: topStyles[0] ? `${capitalizeLabel(topStyles[0].key)} · ${topStyles[0].score}` : "Insufficient data",
      summarySecondaryStyle: topStyles[1] ? `${capitalizeLabel(topStyles[1].key)} · ${topStyles[1].score}` : "Insufficient data",
      summaryTopMotivator: topMotivator ? `${capitalizeLabel(topMotivator.key)} · ${topMotivator.score}` : "Insufficient data",
      summaryLeadershipTilt: topLeadership ? `${capitalizeLabel(topLeadership.key)} · ${topLeadership.score}` : "Insufficient data"
    };

    Object.entries(values).forEach(([id, text]) => {
      const node = document.getElementById(id);
      if (node) {
        node.textContent = text;
      }
    });
  }

  function renderMetricSection(sectionId, metrics) {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    const values = Object.values(metrics || {});
    const maxValue = Math.max(...values, 0);

    section.innerHTML = "";

    if (!values.length || values.every((value) => value === 0)) {
      section.innerHTML = '<p class="metric-empty">Insufficient response data for this section.</p>';
      return;
    }

    Object.entries(metrics)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .forEach(([key, value]) => {
        const row = document.createElement("div");
        row.className = "metric-row";

        const label = document.createElement("span");
        label.className = "metric-label";
        label.textContent = capitalizeLabel(key);

        const bar = document.createElement("div");
        bar.className = "metric-bar";
        const fill = document.createElement("span");
        fill.style.width = normaliseForBar(value, maxValue);
        bar.appendChild(fill);

        const metricValue = document.createElement("span");
        metricValue.className = "metric-value";
        metricValue.textContent = String(value);

        row.appendChild(label);
        row.appendChild(bar);
        row.appendChild(metricValue);
        section.appendChild(row);
      });
  }

  function renderLeadCapture() {
    const leadForm = document.getElementById("leadCaptureForm");
    const leadStatus = document.getElementById("leadCaptureStatus");

    if (!leadForm) {
      return;
    }

    leadForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(leadForm);
      const payload = {
        submittedAt: new Date().toISOString(),
        name: formData.get("name") || "",
        workEmail: formData.get("workEmail") || "",
        organisation: formData.get("organisation") || "",
        role: formData.get("role") || "",
        teamSize: formData.get("teamSize") || "",
        interest: formData.get("interest") || ""
      };

      const saved = localStorage.getItem(LEAD_STORAGE_KEY);
      const leads = saved ? JSON.parse(saved) : [];
      leads.push(payload);
      localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(leads));

      leadForm.reset();
      if (leadStatus) {
        leadStatus.textContent = "Thanks. Your request has been captured and a Sonartra team specialist will contact you.";
      }
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
      return;
    }

    if (summaryLine) {
      summaryLine.textContent = `Profile readiness: ${completionCount}/${SIGNALS_QUESTIONS.length} behavioural responses captured. Sonartra has generated your individual performance signal profile.`;
    }

    if (interpretation) {
      interpretation.textContent = generateInterpretationText(profile);
    }

    renderSummaryCards(profile);
    renderMetricSection("stylesMetrics", profile.styles);
    renderMetricSection("motivatorsMetrics", profile.motivators);
    renderMetricSection("leadershipMetrics", profile.leadership);
    renderMetricSection("stressMetrics", profile.stress);
    renderMetricSection("conflictMetrics", profile.conflict);
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
