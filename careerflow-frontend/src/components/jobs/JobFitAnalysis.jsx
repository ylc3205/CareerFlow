import { Link } from 'react-router-dom'
import ScoreGauge from '../ScoreGauge.jsx'
import Loading from '../Loading.jsx'
import ErrorMessage from '../ErrorMessage.jsx'

// TYPE A analysis: "How well does this candidate fit this specific job?"
// Never mix with interview performance strengths/weaknesses.
export default function JobFitAnalysis({ analysis, analyzing, error, onAnalyze }) {
  return (
    <section className="job-fit">
      <h2 className="job-fit__title">Job Fit Analysis</h2>
      <p className="job-fit__subtitle">How well does this candidate fit this job?</p>

      {analyzing && (
        <div className="job-fit__analyzing">
          <Loading label="Analyzing job fit…" />
        </div>
      )}

      {!analyzing && error && error.missingProfileResume && (
        <div className="job-fit__missing">
          <p>Create your profile or upload a resume to analyze your fit for this job.</p>
          <div className="job-fit__actions">
            <Link to="/profile" className="btn btn--primary btn--sm">
              Go to Profile
            </Link>
            <Link to="/resume" className="btn btn--ghost btn--sm">
              Go to Resume
            </Link>
          </div>
        </div>
      )}

      {!analyzing && error && !error.missingProfileResume && (
        <div className="job-fit__error">
          <ErrorMessage title="Could not analyze job fit" message={error.message} errors={error.errors} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={onAnalyze}>
            Try again
          </button>
        </div>
      )}

      {!analyzing && !error && analysis && (
        <div className="job-fit__result">
          <div className="job-fit__score">
            <ScoreGauge score={analysis.matchScore} size={120} caption="Match" />
          </div>

          <div className="job-fit__columns">
            <div className="job-fit__column">
              <h3>Matched Skills</h3>
              {analysis.matchedSkills?.length ? (
                <div className="job-fit__chips">
                  {analysis.matchedSkills.map((skill) => (
                    <span key={skill} className="chip chip--success">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="job-fit__empty">None</p>
              )}
            </div>
            <div className="job-fit__column">
              <h3>Missing Skills</h3>
              {analysis.missingSkills?.length ? (
                <div className="job-fit__chips">
                  {analysis.missingSkills.map((skill) => (
                    <span key={skill} className="chip chip--danger">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="job-fit__empty">None</p>
              )}
            </div>
          </div>

          <div className="job-fit__columns">
            <div className="job-fit__column">
              <h3>Strengths</h3>
              {analysis.strengths?.length ? (
                <ul className="job-fit__list">
                  {analysis.strengths.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="job-fit__empty">None</p>
              )}
            </div>
            <div className="job-fit__column">
              <h3>Weaknesses</h3>
              {analysis.weaknesses?.length ? (
                <ul className="job-fit__list">
                  {analysis.weaknesses.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="job-fit__empty">None</p>
              )}
            </div>
          </div>

          <div className="job-fit__recommendations">
            <h3>Recommendations</h3>
            {analysis.recommendations?.length ? (
              <ul className="job-fit__list">
                {analysis.recommendations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="job-fit__empty">No recommendations available.</p>
            )}
          </div>
        </div>
      )}

      {!analyzing && !error && !analysis && (
        <div className="job-fit__cta">
          <p>Run a Job Fit Analysis to see how well you match this role.</p>
          <button type="button" className="btn btn--primary" onClick={onAnalyze}>
            Analyze Fit
          </button>
        </div>
      )}
    </section>
  )
}
