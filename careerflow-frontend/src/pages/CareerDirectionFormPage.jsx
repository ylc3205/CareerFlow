import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { Button } from '../components/ui/button.jsx'
import CareerDirectionForm, {
  emptyCareerDirectionForm,
  hydrateCareerDirectionForm,
} from '../components/careerDirections/CareerDirectionForm.jsx'
import {
  createCareerDirectionApi,
  getCareerDirectionApi,
  updateCareerDirectionApi,
} from '../api/careerDirections.api.js'

export default function CareerDirectionFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [initialValues, setInitialValues] = useState(emptyCareerDirectionForm)
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await getCareerDirectionApi(id)
        if (cancelled) return
        setInitialValues(hydrateCareerDirectionForm(res.data.careerDirection))
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
  }, [id, isEdit, reloadKey])

  const handleSubmit = async (payload) => {
    setSubmitting(true)
    setApiError(null)
    try {
      if (isEdit) {
        await updateCareerDirectionApi(id, payload)
        navigate(`/career-directions/${id}`)
      } else {
        const res = await createCareerDirectionApi(payload)
        navigate(`/career-directions/${res.data.careerDirection._id}`)
      }
    } catch (err) {
      setApiError({ message: err.message, errors: err.errors })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loading label="Loading career direction..." />
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-8">
        <PageHeader title="Career Direction" subtitle="Could not load this direction." />
        <div className="flex gap-3">
          <ErrorMessage title="Could not load direction" message={loadError.message} />
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-8">
      <PageHeader
        title={isEdit ? 'Edit career direction' : 'Add a career direction'}
        subtitle={isEdit ? 'Update the career direction details.' : 'Define a focused career path.'}
      />
      <CareerDirectionForm
        key={isEdit ? id : 'new'}
        initialValues={initialValues}
        submitLabel={isEdit ? 'Save changes' : 'Create direction'}
        onSubmit={handleSubmit}
        submitting={submitting}
        apiError={apiError}
      />
    </div>
  )
}
