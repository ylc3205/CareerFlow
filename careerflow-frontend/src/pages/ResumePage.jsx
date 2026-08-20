import { useCallback, useEffect, useState } from 'react'
import { getResumeApi, updateResumeApi, deleteResumeApi } from '../api/resume.api.js'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ListEditor from '../components/ListEditor.jsx'
import { toDateInputValue, splitList, joinList, compact, newItemId } from '../utils/format.js'

const emptyResume = () => ({
  title: '',
  summary: '',
  skills: '',
  languages: '',
  experience: [],
  education: [],
  projects: [],
  certifications: [],
})

const hydrateExperience = (item) => ({
  _cid: item._cid ?? item._id ?? newItemId(),
  company: item.company ?? '',
  position: item.position ?? '',
  description: item.description ?? '',
  startDate: toDateInputValue(item.startDate),
  endDate: toDateInputValue(item.endDate),
  current: Boolean(item.current),
})

const hydrateEducation = (item) => ({
  _cid: item._cid ?? item._id ?? newItemId(),
  school: item.school ?? '',
  degree: item.degree ?? '',
  fieldOfStudy: item.fieldOfStudy ?? '',
  startDate: toDateInputValue(item.startDate),
  endDate: toDateInputValue(item.endDate),
})

const hydrateProject = (item) => ({
  _cid: item._cid ?? item._id ?? newItemId(),
  name: item.name ?? '',
  description: item.description ?? '',
  url: item.url ?? '',
  techStack: joinList(item.techStack),
})

const hydrateCertification = (item) => ({
  _cid: item._cid ?? item._id ?? newItemId(),
  name: item.name ?? '',
  issuer: item.issuer ?? '',
  issueDate: toDateInputValue(item.issueDate),
  expiryDate: toDateInputValue(item.expiryDate),
  url: item.url ?? '',
})

const hydrateResume = (r) => ({
  title: r.title ?? '',
  summary: r.summary ?? '',
  skills: joinList(r.skills),
  languages: joinList(r.languages),
  experience: (r.experience || []).map(hydrateExperience),
  education: (r.education || []).map(hydrateEducation),
  projects: (r.projects || []).map(hydrateProject),
  certifications: (r.certifications || []).map(hydrateCertification),
})

const cleanExperience = (item) =>
  compact({
    company: (item.company ?? '').trim() || undefined,
    position: (item.position ?? '').trim() || undefined,
    description: (item.description ?? '').trim() || undefined,
    startDate: item.startDate || undefined,
    endDate: item.current ? undefined : item.endDate || undefined,
    current: item.current || undefined,
  })

const cleanEducation = (item) =>
  compact({
    school: (item.school ?? '').trim() || undefined,
    degree: (item.degree ?? '').trim() || undefined,
    fieldOfStudy: (item.fieldOfStudy ?? '').trim() || undefined,
    startDate: item.startDate || undefined,
    endDate: item.endDate || undefined,
  })

const cleanProject = (item) =>
  compact({
    name: (item.name ?? '').trim() || undefined,
    description: (item.description ?? '').trim() || undefined,
    url: (item.url ?? '').trim() || undefined,
    techStack: splitList(item.techStack),
  })

const cleanCertification = (item) =>
  compact({
    name: (item.name ?? '').trim() || undefined,
    issuer: (item.issuer ?? '').trim() || undefined,
    issueDate: item.issueDate || undefined,
    expiryDate: item.expiryDate || undefined,
    url: (item.url ?? '').trim() || undefined,
  })

const buildPayload = (form) =>
  compact({
    title: form.title.trim() || undefined,
    summary: form.summary.trim() || undefined,
    skills: splitList(form.skills),
    languages: splitList(form.languages),
    experience: form.experience.map(cleanExperience),
    education: form.education.map(cleanEducation),
    projects: form.projects.map(cleanProject),
    certifications: form.certifications.map(cleanCertification),
  })

export default function ResumePage() {
  const [form, setForm] = useState(emptyResume)
  const [hasResume, setHasResume] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await getResumeApi()
        if (cancelled) return
        setForm(hydrateResume(res.data.resume || {}))
        setHasResume(true)
      } catch (err) {
        if (cancelled) return
        if (err.status === 404) {
          // No resume yet — this is a normal first-time state, not an error.
          setHasResume(false)
        } else {
          setLoadError({ message: err.message })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const updateListItem = (section, index, patch) => {
    setForm((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
  }

  const startEditing = () => {
    setEditing(true)
    setSuccessMessage(null)
    setSaveError(null)
  }

  const handleSave = useCallback(async (event) => {
    event.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSuccessMessage(null)
    try {
      const res = await updateResumeApi(buildPayload(form))
      setForm(hydrateResume(res.data.resume || {}))
      setHasResume(true)
      setEditing(false)
      setSuccessMessage('Resume saved successfully')
    } catch (err) {
      setSaveError({ message: err.message, errors: err.errors })
    } finally {
      setSaving(false)
    }
  }, [form])

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Delete your resume? This cannot be undone.')) return
    setDeleting(true)
    setSaveError(null)
    setSuccessMessage(null)
    try {
      await deleteResumeApi()
      setForm(emptyResume())
      setHasResume(false)
      setEditing(false)
    } catch (err) {
      if (err.status === 404) {
        setForm(emptyResume())
        setHasResume(false)
        setEditing(false)
      } else {
        setSaveError({ message: err.message })
      }
    } finally {
      setDeleting(false)
    }
  }, [])

  if (loading) {
    return <Loading label="Loading your resume..." />
  }

  if (loadError) {
    return <ErrorMessage title="Could not load resume" message={loadError.message} />
  }

  if (!hasResume && !editing) {
    return (
      <div className="page">
        <header className="page__header">
          <h1 className="page__title">Resume</h1>
          <p className="page__subtitle">Your resume powers AI matching, interview prep, and job score.</p>
        </header>
        <EmptyState
          icon="📄"
          title="No resume yet"
          description="Create a resume so CareerFlow can match you with the right jobs and prepare you for interviews."
          action={
            <button type="button" className="btn btn--primary" onClick={startEditing}>
              Build my resume
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Resume</h1>
        <p className="page__subtitle">Your resume powers AI matching, interview prep, and job score.</p>
      </header>

      {successMessage && (
        <div className="notice notice--success" role="status">
          {successMessage}
        </div>
      )}
      {saveError && <ErrorMessage title="Could not save resume" message={saveError.message} errors={saveError.errors} />}

      <form className="form form--card" onSubmit={handleSave}>
        <div className="form__field">
          <label className="form__label" htmlFor="title">Title</label>
          <input id="title" name="title" className="form__input" placeholder="e.g. Senior Frontend Engineer" value={form.title} onChange={updateField} />
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="summary">Summary</label>
          <textarea id="summary" name="summary" className="form__input form__textarea" rows={4} placeholder="A short professional summary" value={form.summary} onChange={updateField} />
        </div>

        <div className="form__row">
          <div className="form__field">
            <label className="form__label" htmlFor="skills">Skills</label>
            <input id="skills" name="skills" className="form__input" placeholder="JavaScript, React, Node.js" value={form.skills} onChange={updateField} />
          </div>
          <div className="form__field">
            <label className="form__label" htmlFor="languages">Languages</label>
            <input id="languages" name="languages" className="form__input" placeholder="English, Spanish" value={form.languages} onChange={updateField} />
          </div>
        </div>

        <section className="form__section">
          <h2 className="form__section-title">Experience</h2>
          <ListEditor
            items={form.experience}
            onChange={(experience) => setForm((prev) => ({ ...prev, experience }))}
            addLabel="Add experience"
            emptyLabel="No experience added yet"
            emptyItem={{ company: '', position: '', description: '', startDate: '', endDate: '', current: false }}
            renderItem={(item, index) => (
              <>
                <div className="form__row">
                  <div className="form__field">
                    <label className="form__label">Company</label>
                    <input className="form__input" value={item.company} onChange={(e) => updateListItem('experience', index, { company: e.target.value })} />
                  </div>
                  <div className="form__field">
                    <label className="form__label">Position</label>
                    <input className="form__input" value={item.position} onChange={(e) => updateListItem('experience', index, { position: e.target.value })} />
                  </div>
                </div>
                <div className="form__field">
                  <label className="form__label">Description</label>
                  <textarea className="form__input form__textarea" rows={2} value={item.description} onChange={(e) => updateListItem('experience', index, { description: e.target.value })} />
                </div>
                <div className="form__row">
                  <div className="form__field">
                    <label className="form__label">Start date</label>
                    <input type="date" className="form__input" value={item.startDate} onChange={(e) => updateListItem('experience', index, { startDate: e.target.value })} />
                  </div>
                  <div className="form__field">
                    <label className="form__label">End date</label>
                    <input type="date" className="form__input" value={item.endDate} disabled={item.current} onChange={(e) => updateListItem('experience', index, { endDate: e.target.value })} />
                  </div>
                  <label className="checkbox">
                    <input type="checkbox" checked={item.current} onChange={(e) => updateListItem('experience', index, { current: e.target.checked })} />
                    I currently work here
                  </label>
                </div>
              </>
            )}
          />
        </section>

        <section className="form__section">
          <h2 className="form__section-title">Education</h2>
          <ListEditor
            items={form.education}
            onChange={(education) => setForm((prev) => ({ ...prev, education }))}
            addLabel="Add education"
            emptyLabel="No education added yet"
            emptyItem={{ school: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '' }}
            renderItem={(item, index) => (
              <>
                <div className="form__row">
                  <div className="form__field">
                    <label className="form__label">School</label>
                    <input className="form__input" value={item.school} onChange={(e) => updateListItem('education', index, { school: e.target.value })} />
                  </div>
                  <div className="form__field">
                    <label className="form__label">Degree</label>
                    <input className="form__input" value={item.degree} onChange={(e) => updateListItem('education', index, { degree: e.target.value })} />
                  </div>
                </div>
                <div className="form__row">
                  <div className="form__field">
                    <label className="form__label">Field of study</label>
                    <input className="form__input" value={item.fieldOfStudy} onChange={(e) => updateListItem('education', index, { fieldOfStudy: e.target.value })} />
                  </div>
                </div>
                <div className="form__row">
                  <div className="form__field">
                    <label className="form__label">Start date</label>
                    <input type="date" className="form__input" value={item.startDate} onChange={(e) => updateListItem('education', index, { startDate: e.target.value })} />
                  </div>
                  <div className="form__field">
                    <label className="form__label">End date</label>
                    <input type="date" className="form__input" value={item.endDate} onChange={(e) => updateListItem('education', index, { endDate: e.target.value })} />
                  </div>
                </div>
              </>
            )}
          />
        </section>

        <section className="form__section">
          <h2 className="form__section-title">Projects</h2>
          <ListEditor
            items={form.projects}
            onChange={(projects) => setForm((prev) => ({ ...prev, projects }))}
            addLabel="Add project"
            emptyLabel="No projects added yet"
            emptyItem={{ name: '', description: '', url: '', techStack: '' }}
            renderItem={(item, index) => (
              <>
                <div className="form__row">
                  <div className="form__field">
                    <label className="form__label">Name</label>
                    <input className="form__input" value={item.name} onChange={(e) => updateListItem('projects', index, { name: e.target.value })} />
                  </div>
                  <div className="form__field">
                    <label className="form__label">URL</label>
                    <input className="form__input" placeholder="https://..." value={item.url} onChange={(e) => updateListItem('projects', index, { url: e.target.value })} />
                  </div>
                </div>
                <div className="form__field">
                  <label className="form__label">Tech stack</label>
                  <input className="form__input" placeholder="React, Vite, Node.js" value={item.techStack} onChange={(e) => updateListItem('projects', index, { techStack: e.target.value })} />
                </div>
                <div className="form__field">
                  <label className="form__label">Description</label>
                  <textarea className="form__input form__textarea" rows={2} value={item.description} onChange={(e) => updateListItem('projects', index, { description: e.target.value })} />
                </div>
              </>
            )}
          />
        </section>

        <section className="form__section">
          <h2 className="form__section-title">Certifications</h2>
          <ListEditor
            items={form.certifications}
            onChange={(certifications) => setForm((prev) => ({ ...prev, certifications }))}
            addLabel="Add certification"
            emptyLabel="No certifications added yet"
            emptyItem={{ name: '', issuer: '', issueDate: '', expiryDate: '', url: '' }}
            renderItem={(item, index) => (
              <>
                <div className="form__row">
                  <div className="form__field">
                    <label className="form__label">Name</label>
                    <input className="form__input" value={item.name} onChange={(e) => updateListItem('certifications', index, { name: e.target.value })} />
                  </div>
                  <div className="form__field">
                    <label className="form__label">Issuer</label>
                    <input className="form__input" value={item.issuer} onChange={(e) => updateListItem('certifications', index, { issuer: e.target.value })} />
                  </div>
                </div>
                <div className="form__row">
                  <div className="form__field">
                    <label className="form__label">Issue date</label>
                    <input type="date" className="form__input" value={item.issueDate} onChange={(e) => updateListItem('certifications', index, { issueDate: e.target.value })} />
                  </div>
                  <div className="form__field">
                    <label className="form__label">Expiry date</label>
                    <input type="date" className="form__input" value={item.expiryDate} onChange={(e) => updateListItem('certifications', index, { expiryDate: e.target.value })} />
                  </div>
                </div>
                <div className="form__field">
                  <label className="form__label">URL</label>
                  <input className="form__input" placeholder="https://..." value={item.url} onChange={(e) => updateListItem('certifications', index, { url: e.target.value })} />
                </div>
              </>
            )}
          />
        </section>

        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save resume'}
          </button>
          {hasResume && (
            <button type="button" className="btn btn--danger" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting...' : 'Delete resume'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}