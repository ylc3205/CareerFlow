import { Link } from 'react-router-dom'
import ScoreGauge from '../ScoreGauge.jsx'
import Loading from '../Loading.jsx'
import ErrorMessage from '../ErrorMessage.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'

// TYPE A analysis: "How well does this candidate fit this specific job?"
// Never mix with interview performance strengths/weaknesses.
export default function JobFitAnalysis({ analysis, analyzing, error, onAnalyze }) {
  const lensLabel = analysis?.careerDirectionTitle ? `Analyzed using: ${analysis.careerDirectionTitle}` : 'Analyzed using: General / Base Resume'
  const focusBadgeLabel = analysis?.careerDirectionTitle ? `Focus: ${analysis.careerDirectionTitle}` : 'Focus: Base Resume'

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold tracking-tight">Job Fit Analysis</h2>
        <p className="mt-1 text-sm text-muted-foreground">How well does this candidate fit this job?</p>
      </header>

      {analyzing && (
        <div className="flex items-center gap-2">
          <Loading label="Analyzing job fit…" />
        </div>
      )}

      {!analyzing && error && error.missingProfileResume && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Create your profile or upload a resume to analyze your fit for this job.</p>
          <div className="flex gap-2">
            <Link to="/profile">
              <Button size="sm">Go to Profile</Button>
            </Link>
            <Link to="/resume">
              <Button variant="outline" size="sm">Go to Resume</Button>
            </Link>
          </div>
        </div>
      )}

      {!analyzing && error && !error.missingProfileResume && (
        <div className="space-y-3">
          <ErrorMessage title="Could not analyze job fit" message={error.message} errors={error.errors} />
          <Button variant="outline" size="sm" onClick={onAnalyze}>
            Try again
          </Button>
        </div>
      )}

      {!analyzing && !error && analysis && (
        <div className="space-y-6">
          <div className="flex items-center justify-center">
            <ScoreGauge score={analysis.matchScore} size={120} caption="Match" />
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <Badge variant="secondary" className="font-normal text-xs">
              {focusBadgeLabel}
            </Badge>
            <p className="text-xs text-muted-foreground text-center">{lensLabel}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Matched Skills</h3>
              {analysis.matchedSkills?.length ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.matchedSkills.map((skill) => (
                    <Badge key={skill} variant="success">{skill}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Missing Skills</h3>
              {analysis.missingSkills?.length ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.missingSkills.map((skill) => (
                    <Badge key={skill} variant="destructive">{skill}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Strengths</h3>
              {analysis.strengths?.length ? (
                <ul className="space-y-2">
                  {analysis.strengths.map((item, index) => (
                    <li key={index} className="text-sm">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Weaknesses</h3>
              {analysis.weaknesses?.length ? (
                <ul className="space-y-2">
                  {analysis.weaknesses.map((item, index) => (
                    <li key={index} className="text-sm">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-medium">Recommendations</h3>
            {analysis.recommendations?.length ? (
              <ul className="space-y-2">
                {analysis.recommendations.map((item, index) => (
                  <li key={index} className="text-sm">{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No recommendations available.</p>
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <Button variant="outline" onClick={onAnalyze}>
              Re-analyze Fit
            </Button>
          </div>
        </div>
      )}

      {!analyzing && !error && !analysis && (
        <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
          <p className="text-sm text-muted-foreground">Run a Job Fit Analysis to see how well you match this role.</p>
          <Button onClick={onAnalyze}>Analyze Fit</Button>
        </div>
      )}
    </section>
  )
}