import { useRef } from 'react'
import { CheckCircle, FileText, Sparkles, Upload, X } from 'lucide-react'
import FileRow from './FileRow.jsx'
import ResumeFormCards from './ResumeFormCards.jsx'
import { Button } from '../ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.jsx'
import { formatFileSize } from '../../utils/resumeForm.js'

export default function ResumeUploadTab({
  uploadViewMode = 'upload',
  resume = null,
  selectedFile = null,
  setSelectedFile,
  isDragging = false,
  uploading = false,
  parsing = false,
  confirming = false,
  deleting = false,
  isBusy = false,
  fileInputRef: externalFileInputRef,
  handleFileInput,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleUpload,
  handleParse,
  handleResetUpload,
  draftForm,
  updateDraftField,
  setDraftForm,
  updateDraftListItem,
  handleConfirm,
  handleDiscard,
  // Alternative prop aliases
  onUpload,
  onParse,
  onConfirmDraft,
  onDiscardDraft,
  onResetUpload,
}) {
  const internalFileInputRef = useRef(null)
  const fileInputRef = externalFileInputRef || internalFileInputRef

  const doUpload = onUpload || handleUpload
  const doParse = onParse || handleParse
  const doConfirm = onConfirmDraft || handleConfirm
  const doDiscard = onDiscardDraft || handleDiscard
  const doReset = onResetUpload || handleResetUpload

  const originalFile = resume?.originalFile
  const busy = isBusy || uploading || parsing || confirming || deleting

  // 1. Upload initial state (dropzone)
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
                onClick={() => setSelectedFile && setSelectedFile(null)}
                className="ml-3 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <Button onClick={doUpload} disabled={!selectedFile || uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // 2. Uploaded state: show file info + parse action
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
            <Button onClick={doParse} disabled={parsing}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {parsing ? 'Parsing...' : 'Parse CV with AI'}
            </Button>
            <Button variant="outline" onClick={doReset}>
              Upload different file
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 3. Parsing state
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
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
              aria-hidden="true"
            >
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

  // 4. Draft review state
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

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault()
            if (doConfirm) doConfirm()
          }}
        >
          <ResumeFormCards
            form={draftForm}
            onChangeField={updateDraftField}
            onListChange={(section, value) =>
              setDraftForm && setDraftForm((prev) => ({ ...prev, [section]: value }))
            }
            onUpdateListItem={updateDraftListItem}
            idPrefix="draft"
            disabled={busy}
          />

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
            <Button type="submit" disabled={confirming || busy}>
              {confirming ? 'Confirming...' : 'Confirm Resume'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || busy}
              onClick={doDiscard}
            >
              {deleting ? 'Discarding...' : 'Discard Draft'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return null
}
