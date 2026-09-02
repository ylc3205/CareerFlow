import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getResumeApi,
  updateResumeApi,
  deleteResumeApi,
  uploadResumeApi,
  parseResumeApi,
  confirmResumeApi,
  discardResumeApi,
} from '../api/resume.api.js'
import { getProfileApi } from '../api/profile.api.js'
import Loading from '../components/Loading.jsx'
import ListEditor from '../components/ListEditor.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card, CardContent } from '../components/ui/card.jsx'
import { Upload, FileText, X, CheckCircle } from 'lucide-react'
import { toDateInputValue, splitList, joinList, compact, newItemId } from '../utils/format.js'

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

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

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const isAllowedFile = (file) => {
  if (!file) return false
  const ext = file.name ? file.name.toLowerCase().split('.').pop() : ''
  const allowedExt = ['pdf', 'docx']
  if (allowedExt.includes(ext)) return true
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  return allowedTypes.includes(file.type)
}

// ---------------------------------------------------------------------------
// Styling constants (consistent with existing project)
// ---------------------------------------------------------------------------

const inputClass =
  'flex h-9 w-full rounded-sm border border-input bg-transparent px-3 py-1 text-base shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'

const textareaClass = `${inputClass} min-h-[80px] resize-y`

const labelClass = 'text-sm font-medium'

const fieldClass = 'space-y-1.5'

const rowClass = 'grid grid-cols-1 md:grid-cols-2 gap-4'

const sectionClass = 'border-t border-border pt-6'

const sectionTitleClass = 'text-lg font-semibold tracking-tight'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ResumePage() {
  // Core state
  const [resume, setResume] = useState(null)
  const [activeTab, setActiveTab] = useState('manual')
  const [manualForm, setManualForm] = useState(emptyResume)
  const [draftForm, setDraftForm] = useState(emptyResume)

  // Upload/Parse flow state
  const [uploadViewMode, setUploadViewMode] = useState('upload')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Async flags
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // Messages
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // -----------------------------------------------------------------------
  // Load resume on mount
  // -----------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await getResumeApi()
        if (cancelled) return
        const r = res.data.resume
        setResume(r)
        setManualForm(hydrateResume(r))
        
        // Initial hydration logic for Draft state
        if (r.importStatus === 'draft' && r.draft) {
          setDraftForm(hydrateResume(r.draft))
          setUploadViewMode('draft')
        } else if (r.originalFile && r.originalFile.fileUrl) {
          setUploadViewMode('uploaded')
        } else {
          setUploadViewMode('upload')
        }
      } catch (err) {
        if (cancelled) return
        if (err.status === 404) {
          setResume(null)
          setManualForm(emptyResume())
          setDraftForm(emptyResume())
          setUploadViewMode('upload')
        } else {
          setError(err.message)
          setResume(null)
          setManualForm(emptyResume())
          setDraftForm(emptyResume())
          setUploadViewMode('upload')
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // -----------------------------------------------------------------------
  // Form helpers
  // -----------------------------------------------------------------------

  const updateManualField = (event) => {
    const { name, value } = event.target
    setManualForm((prev) => ({ ...prev, [name]: value }))
  }

  const updateDraftField = (event) => {
    const { name, value } = event.target
    setDraftForm((prev) => ({ ...prev, [name]: value }))
  }

  const updateManualListItem = (section, index, patch) => {
    setManualForm((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
  }

  const updateDraftListItem = (section, index, patch) => {
    setDraftForm((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
  }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  // -----------------------------------------------------------------------
  // Upload flow
  // -----------------------------------------------------------------------

  const validateAndSetFile = (file) => {
    setError(null)
    if (!isAllowedFile(file)) {
      setError('Only PDF and DOCX files are supported.')
      return
    }
    setSelectedFile(file)
  }

  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndSetFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || uploading) return
    setUploading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await uploadResumeApi(selectedFile)
      const r = res.data.resume
      setResume(r)
      setManualForm(hydrateResume(r))
      setSelectedFile(null)
      setSuccess('CV uploaded successfully.')
      setUploadViewMode('uploaded')
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // -----------------------------------------------------------------------
  // Parse flow
  // -----------------------------------------------------------------------

  const handleParse = async () => {
    if (parsing) return
    setParsing(true)
    setError(null)
    setSuccess(null)
    setUploadViewMode('parsing')
    try {
      const res = await parseResumeApi()
      const r = res.data.resume
      setResume(r)
      setDraftForm(hydrateResume(res.data.draft || r.draft || {}))
      setUploadViewMode('draft')
    } catch (err) {
      setError(err.message || 'Failed to parse CV. The file may be corrupted or unsupported.')
      setUploadViewMode('uploaded')
    } finally {
      setParsing(false)
    }
  }

  // -----------------------------------------------------------------------
  // Confirm flow
  // -----------------------------------------------------------------------

  const handleConfirm = async () => {
    if (confirming) return
    setConfirming(true)
    setError(null)
    setSuccess(null)
    try {
      const payload = buildPayload(draftForm)
      const res = await confirmResumeApi(payload)
      const r = res.data.resume
      setResume(r)
      setManualForm(hydrateResume(r))
      setDraftForm(emptyResume())
      setUploadViewMode('uploaded')
      setActiveTab('manual')
      setSuccess('Resume confirmed successfully.')
    } catch (err) {
      setError(err.message || 'Failed to confirm resume.')
    } finally {
      setConfirming(false)
    }
  }

  // -----------------------------------------------------------------------
  // Discard flow
  // -----------------------------------------------------------------------

  const handleDiscard = async () => {
    if (deleting) return
    if (!window.confirm('Discard the AI-generated draft? Your uploaded CV will remain saved.')) return
    setDeleting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await discardResumeApi()
      const r = res.data.resume
      setResume(r)
      setManualForm(hydrateResume(r))
      setDraftForm(emptyResume())
      if (r.originalFile && r.originalFile.fileUrl) {
        setUploadViewMode('uploaded')
      } else {
        setUploadViewMode('upload')
      }
    } catch (err) {
      setError(err.message || 'Failed to discard draft.')
    } finally {
      setDeleting(false)
    }
  }

  // -----------------------------------------------------------------------
  // Manual save / delete
  // -----------------------------------------------------------------------

  const handleSave = useCallback(
    async (event) => {
      event.preventDefault()
      if (saving) return
      setSaving(true)
      setError(null)
      setSuccess(null)
      try {
        const res = await updateResumeApi(buildPayload(manualForm))
        const r = res.data.resume
        setResume(r)
        setManualForm(hydrateResume(r))
        setSuccess('Resume saved successfully.')
      } catch (err) {
        setError(err.message || 'Failed to save resume.')
      } finally {
        setSaving(false)
      }
    },
    [manualForm, saving],
  )

  const handleDelete = useCallback(async () => {
    if (deleting) return
    if (!window.confirm('Delete your resume? This cannot be undone.')) return
    setDeleting(true)
    setError(null)
    setSuccess(null)
    try {
      await deleteResumeApi()
      setResume(null)
      setManualForm(emptyResume())
      setDraftForm(emptyResume())
      setUploadViewMode('upload')
      setActiveTab('upload')
    } catch (err) {
      if (err.status === 404) {
        setResume(null)
        setManualForm(emptyResume())
        setDraftForm(emptyResume())
        setUploadViewMode('upload')
        setActiveTab('upload')
      } else {
        setError(err.message || 'Failed to delete resume.')
      }
    } finally {
      setDeleting(false)
    }
  }, [deleting])

  // -----------------------------------------------------------------------
  // Profile prefill
  // -----------------------------------------------------------------------

  const handlePrefill = async (useProfile) => {
    if (!useProfile) return
    try {
      const res = await getProfileApi()
      const profile = res.data.profile
      setManualForm((prev) => ({
        ...prev,
        skills: joinList(profile.skills || []),
        experience: (profile.experience || []).map(hydrateExperience),
        education: (profile.education || []).map(hydrateEducation),
      }))
    } catch {
      setError('Could not load your Profile data. You can still build your Resume manually.')
    }
  }

  // -----------------------------------------------------------------------
  // Render: Resume form fields (shared between draft, manual, editor)
  // -----------------------------------------------------------------------

  const renderFormFields = (formState, onFieldChange, onListChange, onListItemChange) => (
    <>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="title">
          Title
        </label>
        <input
          id="title"
          name="title"
          className={inputClass}
          placeholder="e.g. Senior Frontend Engineer"
          value={formState.title}
          onChange={onFieldChange}
        />
      </div>

      <div className={fieldClass}>
        <label className={labelClass} htmlFor="summary">
          Summary
        </label>
        <textarea
          id="summary"
          name="summary"
          className={textareaClass}
          rows={4}
          placeholder="A short professional summary"
          value={formState.summary}
          onChange={onFieldChange}
        />
      </div>

      <div className={rowClass}>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="skills">
            Skills
          </label>
          <input
            id="skills"
            name="skills"
            className={inputClass}
            placeholder="JavaScript, React, Node.js"
            value={formState.skills}
            onChange={onFieldChange}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="languages">
            Languages
          </label>
          <input
            id="languages"
            name="languages"
            className={inputClass}
            placeholder="English, Spanish"
            value={formState.languages}
            onChange={onFieldChange}
          />
        </div>
      </div>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Experience</h2>
        <ListEditor
          items={formState.experience}
          onChange={(experience) => onListChange('experience', experience)}
          addLabel="Add experience"
          emptyLabel="No experience added yet"
          emptyItem={{ company: '', position: '', description: '', startDate: '', endDate: '', current: false }}
          renderItem={(item, index) => (
            <>
              <div className={rowClass}>
                <div className={fieldClass}>
                  <label className={labelClass}>Company</label>
                  <input
                    className={inputClass}
                    value={item.company}
                    onChange={(e) => onListItemChange('experience', index, { company: e.target.value })}
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Position</label>
                  <input
                    className={inputClass}
                    value={item.position}
                    onChange={(e) => onListItemChange('experience', index, { position: e.target.value })}
                  />
                </div>
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>Description</label>
                <textarea
                  className={textareaClass}
                  rows={2}
                  value={item.description}
                  onChange={(e) => onListItemChange('experience', index, { description: e.target.value })}
                />
              </div>
              <div className={rowClass}>
                <div className={fieldClass}>
                  <label className={labelClass}>Start date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={item.startDate}
                    onChange={(e) => onListItemChange('experience', index, { startDate: e.target.value })}
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>End date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={item.endDate}
                    disabled={item.current}
                    onChange={(e) => onListItemChange('experience', index, { endDate: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary"
                    checked={item.current}
                    onChange={(e) => onListItemChange('experience', index, { current: e.target.checked })}
                  />
                  I currently work here
                </label>
              </div>
            </>
          )}
        />
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Education</h2>
        <ListEditor
          items={formState.education}
          onChange={(education) => onListChange('education', education)}
          addLabel="Add education"
          emptyLabel="No education added yet"
          emptyItem={{ school: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '' }}
          renderItem={(item, index) => (
            <>
              <div className={rowClass}>
                <div className={fieldClass}>
                  <label className={labelClass}>School</label>
                  <input
                    className={inputClass}
                    value={item.school}
                    onChange={(e) => onListItemChange('education', index, { school: e.target.value })}
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Degree</label>
                  <input
                    className={inputClass}
                    value={item.degree}
                    onChange={(e) => onListItemChange('education', index, { degree: e.target.value })}
                  />
                </div>
              </div>
              <div className={rowClass}>
                <div className={fieldClass}>
                  <label className={labelClass}>Field of study</label>
                  <input
                    className={inputClass}
                    value={item.fieldOfStudy}
                    onChange={(e) => onListItemChange('education', index, { fieldOfStudy: e.target.value })}
                  />
                </div>
              </div>
              <div className={rowClass}>
                <div className={fieldClass}>
                  <label className={labelClass}>Start date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={item.startDate}
                    onChange={(e) => onListItemChange('education', index, { startDate: e.target.value })}
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>End date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={item.endDate}
                    onChange={(e) => onListItemChange('education', index, { endDate: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}
        />
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Projects</h2>
        <ListEditor
          items={formState.projects}
          onChange={(projects) => onListChange('projects', projects)}
          addLabel="Add project"
          emptyLabel="No projects added yet"
          emptyItem={{ name: '', description: '', url: '', techStack: '' }}
          renderItem={(item, index) => (
            <>
              <div className={rowClass}>
                <div className={fieldClass}>
                  <label className={labelClass}>Name</label>
                  <input
                    className={inputClass}
                    value={item.name}
                    onChange={(e) => onListItemChange('projects', index, { name: e.target.value })}
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>URL</label>
                  <input
                    className={inputClass}
                    placeholder="https://..."
                    value={item.url}
                    onChange={(e) => onListItemChange('projects', index, { url: e.target.value })}
                  />
                </div>
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>Tech stack</label>
                <input
                  className={inputClass}
                  placeholder="React, Vite, Node.js"
                  value={item.techStack}
                  onChange={(e) => onListItemChange('projects', index, { techStack: e.target.value })}
                />
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>Description</label>
                <textarea
                  className={textareaClass}
                  rows={2}
                  value={item.description}
                  onChange={(e) => onListItemChange('projects', index, { description: e.target.value })}
                />
              </div>
            </>
          )}
        />
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Certifications</h2>
        <ListEditor
          items={formState.certifications}
          onChange={(certifications) => onListChange('certifications', certifications)}
          addLabel="Add certification"
          emptyLabel="No certifications added yet"
          emptyItem={{ name: '', issuer: '', issueDate: '', expiryDate: '', url: '' }}
          renderItem={(item, index) => (
            <>
              <div className={rowClass}>
                <div className={fieldClass}>
                  <label className={labelClass}>Name</label>
                  <input
                    className={inputClass}
                    value={item.name}
                    onChange={(e) => onListItemChange('certifications', index, { name: e.target.value })}
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Issuer</label>
                  <input
                    className={inputClass}
                    value={item.issuer}
                    onChange={(e) => onListItemChange('certifications', index, { issuer: e.target.value })}
                  />
                </div>
              </div>
              <div className={rowClass}>
                <div className={fieldClass}>
                  <label className={labelClass}>Issue date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={item.issueDate}
                    onChange={(e) => onListItemChange('certifications', index, { issueDate: e.target.value })}
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Expiry date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={item.expiryDate}
                    onChange={(e) => onListItemChange('certifications', index, { expiryDate: e.target.value })}
                  />
                </div>
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>URL</label>
                <input
                  className={inputClass}
                  placeholder="https://..."
                  value={item.url}
                  onChange={(e) => onListItemChange('certifications', index, { url: e.target.value })}
                />
              </div>
            </>
          )}
        />
      </section>
    </>
  )

  // -----------------------------------------------------------------------
  // Render: Tab Navigation
  // -----------------------------------------------------------------------

  const renderTabs = () => (
    <div className="flex gap-1 border-b border-border mb-6" role="tablist" aria-label="Resume sections">
      <button
        role="tab"
        aria-selected={activeTab === 'manual'}
        onClick={() => { clearMessages(); setActiveTab('manual'); }}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-sm border-b-2 transition-colors ${
          activeTab === 'manual'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
        }`}
      >
        <FileText className="h-4 w-4" />
        Manual Resume
      </button>
      <button
        role="tab"
        aria-selected={activeTab === 'upload'}
        onClick={() => { clearMessages(); setActiveTab('upload'); }}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-sm border-b-2 transition-colors ${
          activeTab === 'upload'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
        }`}
      >
        <Upload className="h-4 w-4" />
        Upload CV
        {resume?.importStatus === 'draft' && (
          <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
            Draft
          </span>
        )}
      </button>
    </div>
  )

  // -----------------------------------------------------------------------
  // Render: Manual Resume Tab
  // -----------------------------------------------------------------------

  const renderManualTab = () => {
    const hasResume = resume !== null

    // Manual creation choice (no resume yet)
    if (!hasResume) {
      return (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold tracking-tight mb-1">Start with your Profile data?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Use your existing profile information as a starting point for your resume.
              </p>
              <div className="flex items-center gap-3">
                <Button onClick={() => handlePrefill(true)}>Use Profile data</Button>
                <Button variant="outline" onClick={() => handlePrefill(false)}>
                  Start from scratch
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Existing resume - show editor
    const originalFile = resume?.originalFile
    return (
      <div className="space-y-6">
        {error && (
          <div className="rounded-sm border border-destructive bg-destructive/10 p-4 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-sm border border-success bg-success/10 text-success p-4" role="status">
            {success}
          </div>
        )}

        {originalFile && (
          <div className="flex items-center gap-3 rounded-sm border border-border bg-muted/50 p-3">
            <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Original CV</p>
              <p className="text-sm font-medium truncate">
                {originalFile.originalFileName || 'Uploaded CV'}
              </p>
            </div>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSave}>
          {renderFormFields(
            manualForm,
            updateManualField,
            (section, value) => setManualForm((prev) => ({ ...prev, [section]: value })),
            updateManualListItem
          )}

          <div className="flex items-center gap-3 border-t border-border pt-6">
            <Button type="submit" disabled={saving || isBusy}>
              {saving ? 'Saving...' : 'Save Resume'}
            </Button>
            <Button type="button" variant="destructive" disabled={deleting || isBusy} onClick={handleDelete}>
              {deleting ? 'Deleting...' : 'Delete Resume'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Render: Upload CV Tab
  // -----------------------------------------------------------------------

  const renderUploadTab = () => {
    const originalFile = resume?.originalFile

    // Upload state machine
    if (uploadViewMode === 'upload') {
      return (
        <div className="space-y-6">
          <header className="flex items-end justify-between gap-4 border-b border-border pb-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">Upload CV</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload your existing CV and let AI extract the details.
              </p>
            </div>
          </header>

          {error && (
            <div className="rounded-sm border border-destructive bg-destructive/10 p-4 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          <Card>
            <CardContent className="p-6">
              <div
                className={`flex flex-col items-center gap-4 rounded-sm border-2 border-dashed p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-muted text-muted-foreground">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">Drop your CV here</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Browse files
                </Button>
                <p className="text-xs text-muted-foreground">Supported: PDF, DOCX (max 10 MB)</p>
              </div>

              {selectedFile && (
                <div className="mt-4 flex items-center justify-between rounded-sm border border-border bg-muted/50 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="ml-3 p-1 rounded-sm text-muted-foreground hover:bg-muted transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 mt-6">
                <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Uploaded state: show file info + parse action
    if (uploadViewMode === 'uploaded') {
      return (
        <div className="space-y-6">
          <header className="flex items-end justify-between gap-4 border-b border-border pb-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">Upload CV</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your CV has been uploaded. Ready to extract the details.
              </p>
            </div>
          </header>

          {error && (
            <div className="rounded-sm border border-destructive bg-destructive/10 p-4 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-sm border border-success bg-success/10 text-success p-4" role="status">
              {success}
            </div>
          )}

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-medium">CV uploaded successfully</span>
              </div>

              {originalFile && (
                <div className="flex items-center gap-3 rounded-sm border border-border bg-muted/50 p-3 mb-6">
                  <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {originalFile.originalFileName || 'Uploaded CV'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(originalFile.fileSize)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button onClick={handleParse} disabled={parsing}>
                  {parsing ? 'Parsing...' : 'Parse with AI'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    clearMessages()
                    setSelectedFile(null)
                    setUploadViewMode('upload')
                  }}
                >
                  Upload different file
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Parsing state
    if (uploadViewMode === 'parsing') {
      return (
        <div className="space-y-6">
          <header className="flex items-end justify-between gap-4 border-b border-border pb-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">Upload CV</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Extracting your resume details with AI.
              </p>
            </div>
          </header>

          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <Loading label="Analyzing your CV..." />
              <p className="text-sm text-muted-foreground max-w-md">
                Extracting your experience, skills, education and other resume details. This may take a
                moment.
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Draft review
    if (uploadViewMode === 'draft') {
      return (
        <div className="space-y-6">
          <header className="flex items-end justify-between gap-4 border-b border-border pb-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">Upload CV</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Review and edit the information extracted from your CV before confirming it.
              </p>
            </div>
          </header>

          <div className="rounded-sm border-l-2 border-primary bg-muted/50 p-4">
            <p className="text-sm font-medium">AI-generated draft</p>
            <p className="text-sm text-muted-foreground mt-1">
              This information was extracted by AI and has not replaced your current Resume yet.
              Review and edit below, then confirm to save.
            </p>
          </div>

          {error && (
            <div className="rounded-sm border border-destructive bg-destructive/10 p-4 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleConfirm(); }}>
            {renderFormFields(
              draftForm,
              updateDraftField,
              (section, value) => setDraftForm((prev) => ({ ...prev, [section]: value })),
              updateDraftListItem
            )}

            <div className="flex items-center gap-3 border-t border-border pt-6">
              <Button type="submit" disabled={confirming || isBusy}>
                {confirming ? 'Confirming...' : 'Confirm Resume'}
              </Button>
              <Button type="button" variant="destructive" disabled={deleting || isBusy} onClick={handleDiscard}>
                {deleting ? 'Discarding...' : 'Discard Draft'}
              </Button>
            </div>
          </form>
        </div>
      )
    }

    return null
  }

  // -----------------------------------------------------------------------
  // Render: Main
  // -----------------------------------------------------------------------

  const isBusy = uploading || parsing || saving || deleting || confirming

  if (activeTab === 'manual') {
    return (
      <div className="space-y-6">
        <header className="flex items-end justify-between gap-4 border-b border-border pb-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Resume</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your resume powers AI matching, interview prep, and job score.
            </p>
          </div>
        </header>

        {renderTabs()}
        {renderManualTab()}
      </div>
    )
  }

  // Upload CV tab
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 border-b border-border pb-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Resume</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a CV to populate your resume with AI assistance.
          </p>
        </div>
      </header>

      {renderTabs()}
      {renderUploadTab()}
    </div>
  )
}