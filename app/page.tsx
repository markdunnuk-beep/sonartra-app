import { Hero } from "../components/hero/Hero";

export default function HomePage() {
  return (
    <>
      <header className="site-header">
        <div className="container nav-wrap">
          <a className="logo" href="/">
            <img src="/assets/Sonartra_Logo.svg" alt="Sonartra" className="logo" />
          </a>
          <nav>
            <a href="/signals.html">Signals</a>
            <a className="button button-small" href="/assessment.html">
              Start Assessment
            </a>
          </nav>
        </div>
      </header>

      <main>
        <Hero />

        <section className="container section section-problem fade-in-up">
          <p className="section-label">Positioning</p>
          <h2>
            Most organisations measure financial performance. Very few measure human performance.
          </h2>
          <p className="section-text narrow">
            Leadership teams track revenue, margins, and operational metrics with precision. But the human systems that
            produce those results — behaviour, motivation, decision-making, leadership dynamics — often remain invisible.
            Sonartra makes human performance measurable.
          </p>
        </section>

        <section className="container section fade-in-up" id="intelligence-system">
          <p className="section-label">Intelligence Architecture</p>
          <h2>The Sonartra Intelligence System</h2>
          <p className="section-text">Behavioural signals analysed across three layers.</p>

          <div className="intelligence-stack">
            <article className="card intelligence-layer">
              <span className="layer-tag">Layer 01</span>
              <h3>Individual Intelligence</h3>
              <p>
                Understand the architecture of individual performance. Sonartra analyses behavioural signals to reveal
                how people think, lead, make decisions, respond to pressure, and contribute inside teams.
              </p>
            </article>
            <article className="card intelligence-layer">
              <span className="layer-tag">Layer 02</span>
              <h3>Team Intelligence</h3>
              <p>
                Build balanced, high-performance teams. Sonartra identifies leadership balance, complementary thinking
                styles, conflict risk, decision-making dynamics, and cognitive diversity across groups.
              </p>
            </article>
            <article className="card intelligence-layer">
              <span className="layer-tag">Layer 03</span>
              <h3>Organisational Intelligence</h3>
              <p>
                Decode organisational performance patterns. At scale, Sonartra reveals cultural alignment, leadership
                distribution, stress signals, structural weaknesses, and decision-making patterns across the
                organisation.
              </p>
            </article>
          </div>
        </section>

        <section className="container section fade-in-up">
          <div className="card signals-engine">
            <div>
              <p className="section-label">Sonartra Signals</p>
              <h2>The behavioural engine powering the Sonartra intelligence system.</h2>
              <p className="section-text">
                Signals is a structured behavioural assessment designed to reveal how individuals perform inside real
                organisational environments.
              </p>
              <ul className="signals-list">
                <li>Behavioural style</li>
                <li>Motivational drivers</li>
                <li>Leadership orientation</li>
                <li>Conflict behaviour</li>
                <li>Pressure response patterns</li>
              </ul>
            </div>
            <div className="signals-cta-panel">
              <p className="signals-statement">Take the most comprehensive performance assessment on the planet.</p>
              <a className="button" href="/assessment.html">
                Start the Assessment
              </a>
              <p className="microcopy">80 questions · approximately 10 minutes · instant intelligence report</p>
            </div>
          </div>
        </section>

        <section className="container section fade-in-up">
          <p className="section-label">Intelligence Output</p>
          <h2>Your performance architecture — visualised.</h2>
          <p className="section-text narrow">
            Signals results are delivered through a structured dashboard that translates behavioural data into
            actionable intelligence.
          </p>

          <div className="grid cards-2 dashboard-preview">
            <article className="card dashboard-card">
              <h3>Behavioural Architecture Radar</h3>
              <div className="radar-placeholder" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </article>
            <article className="card dashboard-card">
              <h3>Leadership Profile</h3>
              <p>Decision Tempo: High Precision</p>
              <p>Leadership Orientation: Strategic Operator</p>
              <p>Primary Signal: Analyst / Driver blend</p>
            </article>
            <article className="card dashboard-card">
              <h3>Motivational Drivers</h3>
              <ul>
                <li>Mastery and autonomy weighting</li>
                <li>Structured challenge preference</li>
                <li>Execution accountability index</li>
              </ul>
            </article>
            <article className="card dashboard-card">
              <h3>Risk and Pressure Signals</h3>
              <ul>
                <li>Conflict indicators by team context</li>
                <li>Pressure-response escalation pattern</li>
                <li>Behavioural drift under sustained load</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="container section fade-in-up">
          <div className="card organisation-section">
            <p className="section-label">Enterprise Deployment</p>
            <h2>Built for leadership teams and organisations.</h2>
            <p className="section-text narrow">
              While individuals can run the Signals assessment independently, Sonartra becomes more powerful when
              deployed across teams and organisations — enabling leadership teams to analyse behavioural patterns, team
              composition, decision-making dynamics, and cultural alignment at scale.
            </p>
          </div>
        </section>

        <section className="container section final-cta fade-in-up">
          <h2>Discover how you perform.</h2>
          <p className="section-text narrow">
            Run the Sonartra Signals assessment and uncover the behavioural architecture driving your performance.
          </p>
          <a className="button" href="/assessment.html">
            Start the Assessment
          </a>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>Sonartra MVP • Static prototype for Signals assessment flow</p>
        </div>
      </footer>
    </>
  );
}
