import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle, CheckCircle2, FileText, Sparkles, Upload, X } from 'lucide-react'
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
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import ListEditor from '../components/ListEditor.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx'
import { Input } from '../components/ui/input.jsx'
import { Label } from '../components/ui/label.jsx'
import { Textarea } from '../components/ui/textarea.jsx'
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

const fieldClass = 'space-y-2'

const rowClass = 'grid grid-cols-1 gap-4 md:grid-cols-2'

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

function SuccessBanner({ children }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-success/30 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
      role="status"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

function FileRow({ title, name, size }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        {title && <p className="text-xs text-muted-foreground">{title}</p>}
        <p className="truncate text-sm font-medium">{name}</p>
      </div>
      {size && <p className="ml-auto shrink-0 text-xs text-muted-foreground">{size}</p>}
    </div>
  )
}

function ResumeSkeleton() {
  return (
    <div className="space-y-6" role="status">
      <span className="sr-only">Loading your resume…</span>
      <div className="space-y-6" aria-hidden="true">
        <div className="space-y-2">
          <div className="h-8 w-44 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex w-full max-w-sm gap-1 border-b border-border">
          <div className="h-9 w-32 animate-pulse rounded-t-lg bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded-t-lg bg-muted" />
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="space-y-2">
            <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-72 max-w-full animate-pulse rounded-md bg-muted" />
          </div>
          <div className="space-y-4">
            <div className="h-9 animate-pulse rounded-lg bg-muted" />
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-9 animate-pulse rounded-lg bg-muted" />
            <div className="h-9 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="h-5 w-36 animate-pulse rounded-md bg-muted" />
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
            <div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ResumePage() {
  // Core state
  const [loading, setLoading] = useState(true)
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

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
      } finally {
        if (!cancelled) setLoading(false)
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

  const handleDiscard = () => {
    if (deleting) return
    setConfirmDiscardOpen(true)
  }

  const handleDiscardConfirm = async () => {
    setConfirmDiscardOpen(false)
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

  const handleDelete = useCallback(() => {
    if (deleting) return
    setConfirmDeleteOpen(true)
  }, [deleting])

  const handleDeleteConfirm = useCallback(async () => {
    setConfirmDeleteOpen(false)
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
  }, [])

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
  // Render: Resume form cards (shared between draft and manual)
  // -----------------------------------------------------------------------

  const renderFormCards = (formState, onFieldChange, onListChange, onListItemChange, idPrefix = 'manual') => {
    const skillsList = splitList(formState.skills)
    const languagesList = splitList(formState.languages)
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle>Resume information</CardTitle>
            <CardDescription>Your resume title and a short professional summary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={fieldClass}>
              <Label htmlFor={`${idPrefix}-title`}>Title</Label>
              <Input
                id={`${idPrefix}-title`}
                name="title"
                placeholder="e.g. Senior Frontend Engineer"
                value={formState.title}
                onChange={onFieldChange}
              />
            </div>
            <div className={fieldClass}>
              <Label htmlFor={`${idPrefix}-summary`}>Summary</Label>
              <Textarea
                id={`${idPrefix}-summary`}
                name="summary"
                rows={4}
                placeholder="A short professional summary"
                value={formState.summary}
                onChange={onFieldChange}
                className="min-h-[140px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skills &amp; languages</CardTitle>
            <CardDescription>Keywords that describe your expertise, separated by commas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={rowClass}>
              <div className={fieldClass}>
                <Label htmlFor={`${idPrefix}-skills`}>Skills</Label>
                <Input
                  id={`${idPrefix}-skills`}
                  name="skills"
                  placeholder="JavaScript, React, Node.js"
                  value={formState.skills}
                  onChange={onFieldChange}
                />
                {skillsList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {skillsList.map((skill) => (
                      <Badge key={skill} variant="primary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className={fieldClass}>
                <Label htmlFor={`${idPrefix}-languages`}>Languages</Label>
                <Input
                  id={`${idPrefix}-languages`}
                  name="languages"
                  placeholder="English, Spanish"
                  value={formState.languages}
                  onChange={onFieldChange}
                />
                {languagesList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {languagesList.map((language) => (
                      <Badge key={language} variant="default">
                        {language}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Experience</CardTitle>
            <CardDescription>Your work history and the roles you have held.</CardDescription>
          </CardHeader>
          <CardContent>
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
                      <Label htmlFor={`${idPrefix}-experience-company-${index}`}>Company</Label>
                      <Input
                        id={`${idPrefix}-experience-company-${index}`}
                        value={item.company}
                        onChange={(e) => onListItemChange('experience', index, { company: e.target.value })}
                      />
                    </div>
                    <div className={fieldClass}>
                      <Label htmlFor={`${idPrefix}-experience-position-${index}`}>Position</Label>
                      <Input
                        id={`${idPrefix}-experience-position-${index}`}
                        value={item.position}
                        onChange={(e) => onListItemChange('experience', index, { position: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className={fieldClass}>
                    <Label htmlFor={`${idPrefix}-experience-description-${index}`}>Description</Label>
                    <Textarea
                      id={`${idPrefix}-experience-description-${index}`}
                      rows={2}
                      value={item.description}
                      onChange={(e) => onListItemChange('experience', index, { description: e.target.value })}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className={rowClass}>
                    <div className={fieldClass}>
                      <Label htmlFor={`${idPrefix}-experience-start-${index}`}>Start date</Label>
                      <Input
                        type="date"
                        id={`${idPrefix}-experience-start-${index}`}
                        value={item.startDate}
                        onChange={(e) => onListItemChange('experience', index, { startDate: e.target.value })}
                      />
                    </div>
                    <div className={fieldClass}>
                      <Label htmlFor={`${idPrefix}-experience-end-${index}`}>End date</Label>
                      <Input
                        type="date"
                        id={`${idPrefix}-experience-end-${index}`}
                        value={item.endDate}
                        disabled={item.current}
                        onChange={(e) => onListItemChange('experience', index, { endDate: e.target.value })}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        checked={item.current}
                        onChange={(e) => onListItemChange('experience', index, { current: e.target.checked })}
                      />
                      I currently work here
                    </label>
                  </div>
                </>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Education</CardTitle>
            <CardDescription>Degrees, certifications, and academic background.</CardDescription>
          </CardHeader>
          <CardContent>
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
                      <Label htmlFor={`${idPrefix}-education-school-${index}`}>School</Label>
                      <Input
                        id={`${idPrefix}-education-school-${index}`}
                        value={item.school}
                        onChange={(e) => onListItemChange('education', index, { school: e.target.value })}
                      />
                    </div>
                    <div className={fieldClass}>
                      <Label htmlFor={`${idPrefix}-education-degree-${index}`}>Degree</Label>
                      <Input
                        id={`${idPrefix}-education-degree-${index}`}
                        value={item.degree}
                        onChange={(e) => onListItemChange('education', index, { degree: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className={rowClass}>
                    <div className={fieldClass}>
                      <Label htmlFor={`${idPrefix}-education-field-${index}`}>Field of study</Label>
                      <Input
                        id={`${idPrefix}-education-field-${index}`}
                        value={item.fieldOfStudy}
                        onChange={(e) => onListItemChange('education', index, { fieldOfStudy: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className={rowClass}>
                    <div className={fieldClass}>
                      <Label htmlFor={`${idPrefix}-education-start-${index}`}>Start date</Label>
                      <Input
                        type="date"
                        id={`${idPrefix}-education-start-${index}`}
                        value={item.startDate}
                        onChange={(e) => onListItemChange('education', index, { startDate: e.target.value })}
                      />
                    </div>
                    <div className={fieldClass}>
                      <Label htmlFor={`${idPrefix}-education-end-${index}`}>End date</Label>
                      <Input
                        type="date"
                        id={`${idPrefix}-education-end-${index}`}
                        value={item.endDate}
                        onChange={(e) => onListItemChange('education', index, { endDate: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Notable projects, personal or professional.</CardDescription>
          </CardHeader>
          <CardContent>
            <ListEditor
              items={formState.projects}
              onChange={(projects) => onListChange('projects', projects)}
              addLabel="Add project"
              emptyLabel="No projects added yet"
              emptyItem={{ name: '', description: '', url: '', techStack: '' }}
              renderItem={(item, index) => {
                const techStackList = splitList(item.techStack)
                return (
                  <>
                    <div className={rowClass}>
                      <div className={fieldClass}>
                        <Label htmlFor={`${idPrefix}-projects-name-${index}`}>Name</Label>
                        <Input
                          id={`${idPrefix}-projects-name-${index}`}
                          value={item.name}
                          onChange={(e) => onListItemChange('projects', index, { name: e.target.value })}
                        />
                      </div>
                      <div className={fieldClass}>
                        <Label htmlFor={`${idPrefix}-projects-url-${index}`}>URL</Label>
                        <Input
                          id={`${idPrefix}-projects-url-${index}`}
                          placeholder="https://..."
                          value={item.url}
                          onChange={(e) => onListItemChange('projects', index, { url: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className={fieldClass}>
                      <Label htmlFor={`${idPrefix}-projects-techstack-${index}`}>Tech stack</Label>
                      <Input
                        id={`${idPrefix}-projects-techstack-${index}`}
                        placeholder="React, Vite, Node.js"
                        value={item.techStack}
                        onChange={(e) => onListItemChange('projects', index, { techStack: e.target.value })}
                      />
                      {techStackList.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {techStackList.map((tech) => (
                            <Badge key={tech} variant="default">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={fieldClass}>
                      <Label htmlFor={`${idPrefix}-projects-description-${index}`}>Description</Label>
                      <Textarea
                        id={`${idPrefix}-projects-description-${index}`}
                        rows={2}
                        value={item.description}
                        onChange={(e) => onListItemChange('projects', index, { description: e.target.value })}
                        className="min-h-[80px]"
                      />
                    </div>
                  </>
                )
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certifications</CardTitle>
            <CardDescription>Credentials, licenses, and professional certifications.</CardDescription>
          </CardHeader>
          <CardContent>
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
                      <Label htmlFor={`${idPrefix}-certifications-name-${index}`}>Name</Label>
                      <Input
                        id={`${idPrefix}-certifications-name-${index}`}
                        value={item.name}
                        onChange={(e) => onListItemChange('certifications', index, { name: e.target.value })}
                      />
                    </div>
                    <div className={fieldClass}>
                      <Label htmlFor={`${idPrefix}-certifications-issuer-${index}`}>Issuer</Label>
                      <Input
                        id={`${idPrefix}-certifications-issuer-${index}`}
                        value={item.issuer}
                        onChange={(e) => onListItemChange('certifications', index, { issuer: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className={rowClass}>
                    <div className={fieldClass}>
                      <Label htmlFor={`${idPrefix}-certifications-issuedate-${index}`}>Issue date</Label>
                      <Input
                        type="date"
                        id={`${idPrefix}-certifications-issuedate-${index}`}
                        value={item.issueDate}
                        onChange={(e) => onListItemChange('certifications', index, { issueDate: e.target.value })}
                      />
                    </div>
                    <div className={fieldClass}>
                      <Label htmlFor={`${idPrefix}-certifications-expirydate-${index}`}>Expiry date</Label>
                      <Input
                        type="date"
                        id={`${idPrefix}-certifications-expirydate-${index}`}
                        value={item.expiryDate}
                        onChange={(e) => onListItemChange('certifications', index, { expiryDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className={fieldClass}>
                    <Label htmlFor={`${idPrefix}-certifications-url-${index}`}>URL</Label>
                    <Input
                      id={`${idPrefix}-certifications-url-${index}`}
                      placeholder="https://..."
                      value={item.url}
                      onChange={(e) => onListItemChange('certifications', index, { url: e.target.value })}
                    />
                  </div>
                </>
              )}
            />
          </CardContent>
        </Card>
      </>
    )
  }

  // -----------------------------------------------------------------------
  // Render: Tab Navigation
  // -----------------------------------------------------------------------

  const renderTabs = () => (
    <div className="flex gap-1 border-b border-border" role="tablist" aria-label="Resume sections">
      <button
        role="tab"
        aria-selected={activeTab === 'manual'}
        onClick={() => {
          clearMessages()
          setActiveTab('manual')
        }}
        className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
          activeTab === 'manual'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
        }`}
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        Manual Resume
      </button>
      <button
        role="tab"
        aria-selected={activeTab === 'upload'}
        onClick={() => {
          clearMessages()
          setActiveTab('upload')
        }}
        className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
          activeTab === 'upload'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
        }`}
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
        Upload CV
        {resume?.importStatus === 'draft' && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Draft</span>
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
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Start with your Profile data?"
          description="Use your existing profile information as a starting point for your resume."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => handlePrefill(true)}>Use Profile data</Button>
              <Button variant="outline" onClick={() => handlePrefill(false)}>
                Start from scratch
              </Button>
            </div>
          }
        />
      )
    }

    // Existing resume - show editor
    const originalFile = resume?.originalFile
    return (
      <div className="space-y-6">
        {originalFile && (
          <FileRow
            title="Original CV"
            name={originalFile.originalFileName || 'Uploaded CV'}
            size={formatFileSize(originalFile.fileSize)}
          />
        )}

        <form className="space-y-6" onSubmit={handleSave}>
          {renderFormCards(
            manualForm,
            updateManualField,
            (section, value) => setManualForm((prev) => ({ ...prev, [section]: value })),
            updateManualListItem,
            'manual',
          )}

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
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
        <Card>
          <CardHeader>
            <CardTitle>Upload CV</CardTitle>
            <CardDescription>Upload your existing CV and let AI extract the details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"
                aria-hidden="true"
              >
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-foreground">Drop your CV here</p>
                <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
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
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/50 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                    aria-hidden="true"
                  >
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="ml-3 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </CardContent>
        </Card>
      )
    }

    // Uploaded state: show file info + parse action
    if (uploadViewMode === 'uploaded') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Upload CV</CardTitle>
            <CardDescription>Your CV has been uploaded. Ready to extract the details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              <CheckCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              CV uploaded successfully
            </div>

            {originalFile && (
              <FileRow
                name={originalFile.originalFileName || 'Uploaded CV'}
                size={formatFileSize(originalFile.fileSize)}
              />
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleParse} disabled={parsing}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
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
      )
    }

    // Parsing state
    if (uploadViewMode === 'parsing') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Upload CV</CardTitle>
            <CardDescription>
              Extracting your experience, skills, education and other resume details. This may take a
              moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                <Sparkles className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-primary">Extracting your resume details with AI.</p>
            </div>
            <div className="space-y-4" aria-hidden="true">
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <div className="h-9 animate-pulse rounded-lg bg-muted" />
                <div className="h-24 animate-pulse rounded-lg bg-muted" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="h-9 animate-pulse rounded-lg bg-muted" />
                <div className="h-9 animate-pulse rounded-lg bg-muted" />
              </div>
              <div className="h-28 animate-pulse rounded-lg bg-muted" />
            </div>
          </CardContent>
        </Card>
      )
    }

    // Draft review
    if (uploadViewMode === 'draft') {
      return (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">AI-generated draft</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This information was extracted by AI and has not replaced your current Resume yet. Review and edit
                below, then confirm to save.
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleConfirm() }}>
            {renderFormCards(
              draftForm,
              updateDraftField,
              (section, value) => setDraftForm((prev) => ({ ...prev, [section]: value })),
              updateDraftListItem,
              'draft',
            )}

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
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

  if (loading) {
    return <ResumeSkeleton />
  }

  const isBusy = uploading || parsing || saving || deleting || confirming
  const subtitle =
    activeTab === 'manual'
      ? 'Your resume powers AI matching, interview prep, and job score.'
      : 'Upload a CV to populate your resume with AI assistance.'

  return (
    <div className="space-y-6">
      <PageHeader title="Resume" subtitle={subtitle} />

      {error && <ErrorMessage title="Something went wrong" message={error} />}
      {success && <SuccessBanner>{success}</SuccessBanner>}

      {renderTabs()}

      {activeTab === 'manual' ? renderManualTab() : renderUploadTab()}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete your resume?"
        description="This will permanently delete your resume information. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
      />

      <ConfirmDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirm={handleDiscardConfirm}
        title="Discard AI draft?"
        description="Discard the AI-generated draft? Your uploaded CV will remain saved."
        confirmLabel="Discard"
        variant="destructive"
        loading={deleting}
      />
    </div>
  )
}