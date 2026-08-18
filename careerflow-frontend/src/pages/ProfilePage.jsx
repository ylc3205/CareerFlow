import { useEffect, useState } from 'react'
import { getProfileApi, updateProfileApi } from '../api/profile.api.js'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import ListEditor from '../components/ListEditor.jsx'
import { toDateInputValue, splitList, joinList, compact, newItemId } from '../utils/format.js'

const hydrateEducation = (item) => ({
  _cid: item._cid ?? item._id ?? newItemId(),
  school: item.school ?? '',
  degree: item.degree ?? '',
  fieldOfStudy: item.fieldOfStudy ?? '',
  startDate: toDateInputValue(item.startDate),
  endDate: toDateInputValue(item.endDate),
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

export default function ProfilePage() {
  const [form, setForm] = useState({
    fullName: '',
    headline: '',
    location: '',
    phone: '',
    bio: '',
    skills: '',
    yearsOfExperience: '',
    education: [],
    experience: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await getProfileApi()
        if (cancelled) return
        const p = res.data.profile || {}
        setForm({
          fullName: p.fullName ?? '',
          headline: p.headline ?? '',
          location: p.location ?? '',
          phone: p.phone ?? '',
          bio: p.bio ?? '',
          skills: joinList(p.skills),
          yearsOfExperience: p.yearsOfExperience ?? '',
          education: (p.education || []).map(hydrateEducation),
          experience: (p.experience || []).map(hydrateExperience),
        })
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

  const cleanEducation = (item) =>
    compact({
      school: (item.school ?? '').trim() || undefined,
      degree: (item.degree ?? '').trim() || undefined,
      fieldOfStudy: (item.fieldOfStudy ?? '').trim() || undefined,
      startDate: item.startDate || undefined,
      endDate: item.endDate || undefined,
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

  const buildPayload = () => {
    const payload = compact({
      fullName: form.fullName.trim() || undefined,
      headline: form.headline.trim() || undefined,
      location: form.location.trim() || undefined,
      phone: form.phone.trim() || undefined,
      bio: form.bio.trim() || undefined,
      skills: splitList(form.skills),
      yearsOfExperience:
        form.yearsOfExperience === '' ? undefined : Number(form.yearsOfExperience),
      education: form.education.map(cleanEducation),
      experience: form.experience.map(cleanExperience),
    })
    return payload
  }

  const handleSave = async (event) => {
    if (event) event.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSuccessMessage(null)
    try {
      const res = await updateProfileApi(buildPayload())
      const p = res.data.profile
      setForm((prev) => ({
        ...prev,
        skills: joinList(p.skills),
        yearsOfExperience: p.yearsOfExperience ?? '',
        education: (p.education || []).map(hydrateEducation),
        experience: (p.experience || []).map(hydrateExperience),
      }))
      setSuccessMessage('Profile saved successfully')
    } catch (err) {
      setSaveError({ message: err.message, errors: err.errors })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Loading label="Loading your profile..." />
  }

  if (loadError) {
    return <ErrorMessage title="Could not load profile" message={loadError.message} />
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Profile</h1>
        <p className="page__subtitle">Keep your professional details up to date for better AI matching.</p>
      </header>

      {successMessage && (
        <div className="notice notice--success" role="status">
          {successMessage}
        </div>
      )}
      {saveError && <ErrorMessage title="Could not save profile" message={saveError.message} errors={saveError.errors} />}

      <form className="form form--card" onSubmit={handleSave}>
        <div className="form__row">
          <div className="form__field">
            <label className="form__label" htmlFor="fullName">Full name</label>
            <input id="fullName" name="fullName" className="form__input" value={form.fullName} onChange={updateField} />
          </div>
          <div className="form__field">
            <label className="form__label" htmlFor="headline">Headline</label>
            <input id="headline" name="headline" className="form__input" placeholder="e.g. Frontend Engineer" value={form.headline} onChange={updateField} />
          </div>
        </div>

        <div className="form__row">
          <div className="form__field">
            <label className="form__label" htmlFor="location">Location</label>
            <input id="location" name="location" className="form__input" placeholder="City, Country" value={form.location} onChange={updateField} />
          </div>
          <div className="form__field">
            <label className="form__label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" className="form__input" value={form.phone} onChange={updateField} />
          </div>
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="bio">Bio</label>
          <textarea id="bio" name="bio" className="form__input form__textarea" rows={4} placeholder="A short summary about yourself" value={form.bio} onChange={updateField} />
        </div>

        <div className="form__row">
          <div className="form__field">
            <label className="form__label" htmlFor="skills">Skills</label>
            <input id="skills" name="skills" className="form__input" placeholder="JavaScript, React, Node.js" value={form.skills} onChange={updateField} />
          </div>
          <div className="form__field">
            <label className="form__label" htmlFor="yearsOfExperience">Years of experience</label>
            <input id="yearsOfExperience" name="yearsOfExperience" type="number" min="0" className="form__input" value={form.yearsOfExperience} onChange={updateField} />
          </div>
        </div>

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
                    <input
                      type="checkbox"
                      checked={item.current}
                      onChange={(e) => updateListItem('experience', index, { current: e.target.checked })}
                    />
                    I currently work here
                  </label>
                </div>
              </>
            )}
          />
        </section>

        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  )
}