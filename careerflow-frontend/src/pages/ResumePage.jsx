import { FileText, Upload } from 'lucide-react'
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import FileRow from '../components/resume/FileRow.jsx'
import SuccessBanner from '../components/resume/SuccessBanner.jsx'
import ResumeFormCards from '../components/resume/ResumeFormCards.jsx'
import ResumeUploadTab from '../components/resume/ResumeUploadTab.jsx'
import ResumeSkeleton from '../components/resume/ResumeSkeleton.jsx'
import { Button } from '../components/ui/button.jsx'
import { useResume } from '../hooks/useResume.js'
import { formatFileSize } from '../utils/resumeForm.js'

export default function ResumePage() {
  const resumeState = useResume()
  const {
    loading,
    resume,
    activeTab,
    setActiveTab,
    manualForm,
    setManualForm,
    saving,
    deleting,
    isBusy,
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    confirmDiscardOpen,
    setConfirmDiscardOpen,
    error,
    success,
    clearMessages,
    updateManualField,
    updateManualListItem,
    handleSaveManual,
    handleDeleteResume,
    handleDeleteConfirm,
    handleDiscardConfirm,
    handleSyncFromProfile,
  } = resumeState

  if (loading) {
    return <ResumeSkeleton />
  }

  const subtitle =
    activeTab === 'manual'
      ? 'Your resume powers AI matching, interview prep, and job score.'
      : 'Upload a CV to populate your resume with AI assistance.'

  const originalFile = resume?.originalFile

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
        Manual Entry
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

  const renderManualTab = () => {
    if (!resume) {
      return (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Start with your Profile data?"
          description="Use your existing profile information as a starting point for your resume."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => handleSyncFromProfile(true)}>Use Profile data</Button>
              <Button variant="outline" onClick={() => handleSyncFromProfile(false)}>
                Start from scratch
              </Button>
            </div>
          }
        />
      )
    }

    return (
      <div className="space-y-6">
        {originalFile && (
          <FileRow
            title="Original CV"
            name={originalFile.originalFileName || 'Uploaded CV'}
            size={formatFileSize(originalFile.fileSize)}
          />
        )}

        <form className="space-y-6" onSubmit={handleSaveManual}>
          <ResumeFormCards
            form={manualForm}
            onChangeField={updateManualField}
            onListChange={(section, value) => setManualForm((prev) => ({ ...prev, [section]: value }))}
            onUpdateListItem={updateManualListItem}
            idPrefix="manual"
            disabled={saving || isBusy}
          />

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
            <Button type="submit" disabled={saving || isBusy}>
              {saving ? 'Saving...' : 'Save Resume'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || isBusy}
              onClick={handleDeleteResume}
            >
              {deleting ? 'Deleting...' : 'Delete Resume'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Resume" subtitle={subtitle} />

      {error && <ErrorMessage title="Something went wrong" message={error} />}
      {success && <SuccessBanner onDismiss={clearMessages}>{success}</SuccessBanner>}

      {renderTabs()}

      {activeTab === 'manual' ? renderManualTab() : <ResumeUploadTab {...resumeState} />}

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