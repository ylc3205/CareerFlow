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
import {
  emptyResume,
  hydrateResume,
  hydrateExperience,
  hydrateEducation,
  buildPayload,
  isAllowedFile,
} from '../utils/resumeForm.js'
import { joinList } from '../utils/format.js'

export function useResume() {
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

  // Dialog states
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  // Messages
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  // -----------------------------------------------------------------------
  // Load resume on mount
  // -----------------------------------------------------------------------

  const loadResume = useCallback(async () => {
    try {
      const res = await getResumeApi()
      const r = res.data.resume
      setResume(r)
      setManualForm(hydrateResume(r))

      if (r.importStatus === 'draft' && r.draft) {
        setDraftForm(hydrateResume(r.draft))
        setUploadViewMode('draft')
      } else if (r.originalFile && r.originalFile.fileUrl) {
        setUploadViewMode('uploaded')
      } else {
        setUploadViewMode('upload')
      }
    } catch (err) {
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
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const res = await getResumeApi()
        if (cancelled) return
        const r = res.data.resume
        setResume(r)
        setManualForm(hydrateResume(r))

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
    init()
    return () => {
      cancelled = true
    }
  }, [])

  // -----------------------------------------------------------------------
  // Form updates
  // -----------------------------------------------------------------------

  const updateManualField = useCallback((event) => {
    const { name, value } = event.target
    setManualForm((prev) => ({ ...prev, [name]: value }))
  }, [])

  const updateDraftField = useCallback((event) => {
    const { name, value } = event.target
    setDraftForm((prev) => ({ ...prev, [name]: value }))
  }, [])

  const updateManualListItem = useCallback((section, index, patch) => {
    setManualForm((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
  }, [])

  const updateDraftListItem = useCallback((section, index, patch) => {
    setDraftForm((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
  }, [])

  const addManualListItem = useCallback((section, item) => {
    setManualForm((prev) => ({
      ...prev,
      [section]: [...(prev[section] || []), item],
    }))
  }, [])

  const removeManualListItem = useCallback((section, index) => {
    setManualForm((prev) => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }))
  }, [])

  const addDraftListItem = useCallback((section, item) => {
    setDraftForm((prev) => ({
      ...prev,
      [section]: [...(prev[section] || []), item],
    }))
  }, [])

  const removeDraftListItem = useCallback((section, index) => {
    setDraftForm((prev) => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }))
  }, [])

  // -----------------------------------------------------------------------
  // File drag & drop / selection
  // -----------------------------------------------------------------------

  const validateAndSetFile = useCallback((file) => {
    setError(null)
    if (!isAllowedFile(file)) {
      setError('Only PDF and DOCX files are supported.')
      return
    }
    setSelectedFile(file)
  }, [])

  const handleFileInput = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (file) validateAndSetFile(file)
    },
    [validateAndSetFile],
  )

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) validateAndSetFile(file)
    },
    [validateAndSetFile],
  )

  // -----------------------------------------------------------------------
  // Upload flow
  // -----------------------------------------------------------------------

  const handleUpload = useCallback(async () => {
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
  }, [selectedFile, uploading])

  const handleResetUpload = useCallback(() => {
    clearMessages()
    setSelectedFile(null)
    setUploadViewMode('upload')
  }, [clearMessages])

  // -----------------------------------------------------------------------
  // Parse flow
  // -----------------------------------------------------------------------

  const handleParse = useCallback(async () => {
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
  }, [parsing])

  // -----------------------------------------------------------------------
  // Confirm draft flow
  // -----------------------------------------------------------------------

  const handleConfirmDraft = useCallback(async () => {
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
  }, [confirming, draftForm])

  // -----------------------------------------------------------------------
  // Discard draft flow
  // -----------------------------------------------------------------------

  const handleDiscardDraft = useCallback(() => {
    if (deleting) return
    setConfirmDiscardOpen(true)
  }, [deleting])

  const handleDiscardConfirm = useCallback(async () => {
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
  }, [])

  // -----------------------------------------------------------------------
  // Manual save / delete
  // -----------------------------------------------------------------------

  const handleSaveManual = useCallback(
    async (event) => {
      if (event && event.preventDefault) event.preventDefault()
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

  const handleDeleteResume = useCallback(() => {
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
  // Profile prefill / sync
  // -----------------------------------------------------------------------

  const handleSyncFromProfile = useCallback(async (useProfile) => {
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
  }, [])

  const isBusy = uploading || parsing || saving || deleting || confirming

  return {
    // State
    loading,
    setLoading,
    resume,
    setResume,
    activeTab,
    setActiveTab,
    manualForm,
    setManualForm,
    draftForm,
    setDraftForm,
    uploadViewMode,
    setUploadViewMode,
    selectedFile,
    setSelectedFile,
    isDragging,
    setIsDragging,
    fileInputRef,

    // Flags
    uploading,
    parsing,
    saving,
    deleting,
    confirming,
    isBusy,

    // Confirmation dialog state
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    confirmDiscardOpen,
    setConfirmDiscardOpen,

    // Feedback
    error,
    setError,
    success,
    setSuccess,
    clearMessages,

    // Actions & Form handlers
    updateManualField,
    updateDraftField,
    updateManualListItem,
    updateDraftListItem,
    addManualListItem,
    removeManualListItem,
    addDraftListItem,
    removeDraftListItem,

    // File handlers
    validateAndSetFile,
    handleFileInput,
    handleDragOver,
    handleDragLeave,
    handleDrop,

    // Async handlers
    loadResume,
    handleUpload,
    handleResetUpload,
    handleParse,
    handleConfirmDraft,
    handleDiscardDraft,
    handleDiscardConfirm,
    handleSaveManual,
    handleDeleteResume,
    handleDeleteConfirm,
    handleSyncFromProfile,

    // Aliases
    handleSave: handleSaveManual,
    handleDelete: handleDeleteResume,
    handleConfirm: handleConfirmDraft,
    handleDiscard: handleDiscardDraft,
    handlePrefill: handleSyncFromProfile,
  }
}
