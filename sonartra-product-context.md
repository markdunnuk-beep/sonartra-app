# Sonartra Product Context

## Project Overview

Sonartra is a cloud-based **performance intelligence platform** designed to help organisations understand, structure, and deploy human capital more effectively.

The platform combines behavioural psychology, organisational analytics, and AI to analyse individuals, teams, and organisations.

The core mission of Sonartra is:

**To help organisations build ultra-high-performing teams through behavioural intelligence.**

Sonartra is not positioned as a traditional HR personality test tool.  
It is designed as a **performance intelligence system**.

The long-term ambition is to build a global enterprise SaaS platform similar in importance to systems such as:

- SAP
- Workday
- Palantir
- Snowflake

but focused on **human performance data and organisational intelligence**.

---

# Core Product Concept

Sonartra operates across three analytical layers.

## 1. Individual Intelligence

The platform begins with behavioural assessment.

The initial product is called:

**Sonartra Signals**

Signals is a structured behavioural questionnaire based on the **WPLP-80 assessment model**.

It analyses:

- personality style
- motivational drivers
- leadership orientation
- conflict behaviour
- cultural preferences
- behavioural risk under stress
- cognitive traits

The system generates a structured behavioural profile that identifies:

- strengths
- leadership tendencies
- behavioural risks
- optimal working environments

---

## 2. Team Intelligence

Sonartra then analyses **team composition**.

The system can evaluate:

- behavioural diversity
- leadership balance
- conflict risk
- communication dynamics
- decision-making styles

The goal is to help organisations design **balanced, high-performance teams**.

---

## 3. Organisational Intelligence

At scale, Sonartra analyses aggregated behavioural data to evaluate:

- organisational culture
- leadership architecture
- structural weaknesses
- communication patterns
- decision bottlenecks

This enables organisations to treat their workforce as a **human performance system**.

---

# Sonartra Signals Assessment

The first product module is **Sonartra Signals**.

This is a structured behavioural questionnaire derived from multiple psychological frameworks including:

- Big Five personality model
- DISC behavioural styles
- McClelland motivation theory
- Competing Values Framework (culture)
- Thomas-Kilmann conflict model
- leadership style frameworks

The assessment produces structured behavioural scores.

## Behavioural Dimensions

### Styles
- Driver
- Influencer
- Stabiliser
- Analyst

### Motivators
- Achievement
- Influence
- Stability
- Mastery

### Leadership Orientation
- Results
- Vision
- People
- Process

### Conflict Styles
- Compete
- Collaborate
- Compromise
- Accommodate
- Avoid

### Cultural Preferences
- Market
- Adhocracy
- Clan
- Hierarchy

### Stress Behaviour
- Control
- Criticality
- Avoidance
- Scatter

### Traits
- Conscientiousness
- Agreeableness
- Openness
- Extraversion
- Neuroticism

---

# Product Roadmap

Sonartra will evolve through several stages.

## Phase 1 – Assessment MVP

Deliver:

- Sonartra landing page
- Sonartra Signals product page
- Interactive assessment
- Personal results dashboard
- Behavioural profile report

No authentication required initially.

---

## Phase 2 – Team Intelligence

Add:

- organisation workspaces
- team dashboards
- team composition analysis
- behavioural compatibility insights

---

## Phase 3 – Organisational Intelligence

Add:

- organisational culture diagnostics
- leadership structure analysis
- company-level behavioural dashboards

---

## Phase 4 – Performance Intelligence

Connect behavioural signals to outcomes such as:

- project success
- sales performance
- retention
- productivity

Enable behavioural → performance correlation.

---

## Phase 5 – Predictive Intelligence

Introduce AI models to predict:

- leadership risk
- team dysfunction
- burnout
- promotion readiness

---

# Technology Stack

Sonartra should be implemented as a modern SaaS platform.

## Frontend

- Next.js (App Router)
- TypeScript
- TailwindCSS

## Backend (later phases)

- Node.js / serverless APIs
- PostgreSQL database

## Authentication

- Clerk (later phase)

## Hosting

- Vercel

---

# Initial Application Structure

The initial MVP should contain the following routes.

/
/signals
/signals/start
/signals/assessment
/signals/results


## Component Structure

src/components/
Header
HeroSection
FeatureCard
QuestionCard
ProgressBar
ScoreBar
ResultsSummary
Footer


## Logic Structure

src/lib/
questions.ts
scoring.ts
interpretation.ts


---

# Assessment Engine Design

The assessment should:

- show one question at a time
- store answers in local state or localStorage
- compute weighted scores
- normalise scores to 0–100 ranges
- generate behavioural summaries

Interpretation should initially use **rules-based logic**, not AI.

Example:

if Analyst score > 50
→ Primary style = Analyst


---

# Design Principles

The Sonartra interface should feel:

- modern
- intelligent
- minimal
- enterprise grade
- data driven

Design inspiration:

- Stripe
- Vercel
- Linear
- Palantir
- Snowflake

The interface should prioritise:

- clarity
- structured dashboards
- strong typography
- minimal clutter

Dark mode is preferred.

---

# Product Philosophy

Sonartra should not be positioned as a generic HR tool.

Instead it should be framed as:

**Performance intelligence for organisations.**

Language should focus on:

- performance
- leadership
- organisational systems
- decision-making
- strategic insight

Avoid typical HR language such as:

- engagement surveys
- personality quizzes
- workplace happiness tools

---

# Long-Term Vision

The long-term ambition of Sonartra is to become:

**The global system of record for human performance intelligence.**

The platform should eventually be capable of analysing:

- individuals
- teams
- organisations

to determine how human capital can be deployed most effectively.

This vision should guide product and design decisions.

---

# AI Usage Philosophy

AI should not be used for gimmicks.

AI will be applied to:

- behavioural pattern detection
- team modelling
- organisational diagnostics
- predictive signals
- performance correlations

The assessment itself is primarily a **data collection layer**.

The true long-term value of Sonartra is the **behavioural intelligence built on top of the dataset**.

---

# Coding Guidance for AI Agents

When generating code:

- prioritise clean architecture
- keep components modular
- avoid unnecessary dependencies
- ensure code is production-ready
- maintain clear separation between UI and scoring logic
- structure code for future scaling

The initial focus should be **frontend experience and assessment logic**.

Database and authentication will be added later.

---

End of context file.
