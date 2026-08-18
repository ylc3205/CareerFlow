import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import JobForm from '../components/jobs/JobForm.jsx'
import { createJobApi, getJobApi, updateJobApi } from '../api/jobs.api.js'
import { emptyJobForm, hydrateJobForm } from '../utils/jobForm.js'

export default function JobFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [initialValues, setInitialValues] = useState(emptyJobForm)
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await getJobApi(id)
        if (cancelled) return
        setInitialValues(hydrateJobForm(res.data.job))
      } catch (err) {
        if (!cancelled) setLoadError({ message: err.message })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  const handleSubmit = async (payload) => {
    setSubmitting(true)
    setApiError(null)
    try {
      if (isEdit) {
        await updateJobApi(id, payload)
        navigate(`/jobs/${id}`)
      } else {
        const res = await createJobApi(payload)
        navigate(`/jobs/${res.data.job._id}`)
      }
    } catch (err) {
      setApiError({ message: err.message, errors: err.errors })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loading label="Loading job..." />
  }

  if (loadError) {
    return <ErrorMessage title="Could not load job" message={loadError.message} />
  }

  return (
    <div className="page">
      <PageHeader
        title={isEdit ? 'Edit job' : 'Add a job'}
        subtitle={isEdit ? 'Update the job details.' : 'Save a job posting to track it.'}
      />
      <JobForm
        key={isEdit ? id : 'new'}
        initialValues={initialValues}
        submitLabel={isEdit ? 'Save changes' : 'Create job'}
        onSubmit={handleSubmit}
        submitting={submitting}
        apiError={apiError}
      />
    </div>
  )
}
