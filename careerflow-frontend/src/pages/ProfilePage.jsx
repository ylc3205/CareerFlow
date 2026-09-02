import { useEffect, useState } from 'react'
import { getProfileApi, updateProfileApi } from '../api/profile.api.js'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import ListEditor from '../components/ListEditor.jsx'
import { Button } from '../components/ui/button.jsx'
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

const inputClass = "flex h-9 w-full rounded-sm border border-input bg-transparent px-3 py-1 text-base shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"

const textareaClass = `${inputClass} min-h-[80px] resize-y`

const labelClass = "text-sm font-medium"

const fieldClass = "space-y-1.5"

const rowClass = "grid grid-cols-1 md:grid-cols-2 gap-4"

const sectionClass = "border-t border-border pt-6"

const sectionTitleClass = "text-lg font-semibold tracking-tight"

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
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Keep your professional details up to date for better AI matching.</p>
        </div>
      </header>

      {successMessage && (
        <div className="rounded-sm border border-success bg-success/10 text-success p-4" role="status">
          {successMessage}
        </div>
      )}
      {saveError && <ErrorMessage title="Could not save profile" message={saveError.message} errors={saveError.errors} />}

      <form className="space-y-6" onSubmit={handleSave}>
        <div className={rowClass}>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="fullName">Full name</label>
            <input id="fullName" name="fullName" className={inputClass} value={form.fullName} onChange={updateField} />
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="headline">Headline</label>
            <input id="headline" name="headline" className={inputClass} placeholder="e.g. Frontend Engineer" value={form.headline} onChange={updateField} />
          </div>
        </div>

        <div className={rowClass}>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="location">Location</label>
            <input id="location" name="location" className={inputClass} placeholder="City, Country" value={form.location} onChange={updateField} />
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="phone">Phone</label>
            <input id="phone" name="phone" className={inputClass} value={form.phone} onChange={updateField} />
          </div>
        </div>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="bio">Bio</label>
          <textarea id="bio" name="bio" className={textareaClass} rows={4} placeholder="A short summary about yourself" value={form.bio} onChange={updateField} />
        </div>

        <div className={rowClass}>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="skills">Skills</label>
            <input id="skills" name="skills" className={inputClass} placeholder="JavaScript, React, Node.js" value={form.skills} onChange={updateField} />
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="yearsOfExperience">Years of experience</label>
            <input id="yearsOfExperience" name="yearsOfExperience" type="number" min="0" className={inputClass} value={form.yearsOfExperience} onChange={updateField} />
          </div>
        </div>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Education</h2>
          <ListEditor
            items={form.education}
            onChange={(education) => setForm((prev) => ({ ...prev, education }))}
            addLabel="Add education"
            emptyLabel="No education added yet"
            emptyItem={{ school: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '' }}
            renderItem={(item, index) => (
              <>
                <div className={rowClass}>
                  <div className={fieldClass}>
                    <label className={labelClass}>School</label>
                    <input className={inputClass} value={item.school} onChange={(e) => updateListItem('education', index, { school: e.target.value })} />
                  </div>
                  <div className={fieldClass}>
                    <label className={labelClass}>Degree</label>
                    <input className={inputClass} value={item.degree} onChange={(e) => updateListItem('education', index, { degree: e.target.value })} />
                  </div>
                </div>
                <div className={rowClass}>
                  <div className={fieldClass}>
                    <label className={labelClass}>Field of study</label>
                    <input className={inputClass} value={item.fieldOfStudy} onChange={(e) => updateListItem('education', index, { fieldOfStudy: e.target.value })} />
                  </div>
                </div>
                <div className={rowClass}>
                  <div className={fieldClass}>
                    <label className={labelClass}>Start date</label>
                    <input type="date" className={inputClass} value={item.startDate} onChange={(e) => updateListItem('education', index, { startDate: e.target.value })} />
                  </div>
                  <div className={fieldClass}>
                    <label className={labelClass}>End date</label>
                    <input type="date" className={inputClass} value={item.endDate} onChange={(e) => updateListItem('education', index, { endDate: e.target.value })} />
                  </div>
                </div>
              </>
            )}
          />
        </section>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Experience</h2>
          <ListEditor
            items={form.experience}
            onChange={(experience) => setForm((prev) => ({ ...prev, experience }))}
            addLabel="Add experience"
            emptyLabel="No experience added yet"
            emptyItem={{ company: '', position: '', description: '', startDate: '', endDate: '', current: false }}
            renderItem={(item, index) => (
              <>
                <div className={rowClass}>
                  <div className={fieldClass}>
                    <label className={labelClass}>Company</label>
                    <input className={inputClass} value={item.company} onChange={(e) => updateListItem('experience', index, { company: e.target.value })} />
                  </div>
                  <div className={fieldClass}>
                    <label className={labelClass}>Position</label>
                    <input className={inputClass} value={item.position} onChange={(e) => updateListItem('experience', index, { position: e.target.value })} />
                  </div>
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Description</label>
                  <textarea className={textareaClass} rows={2} value={item.description} onChange={(e) => updateListItem('experience', index, { description: e.target.value })} />
                </div>
                <div className={rowClass}>
                  <div className={fieldClass}>
                    <label className={labelClass}>Start date</label>
                    <input type="date" className={inputClass} value={item.startDate} onChange={(e) => updateListItem('experience', index, { startDate: e.target.value })} />
                  </div>
                  <div className={fieldClass}>
                    <label className={labelClass}>End date</label>
                    <input type="date" className={inputClass} value={item.endDate} disabled={item.current} onChange={(e) => updateListItem('experience', index, { endDate: e.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary" checked={item.current} onChange={(e) => updateListItem('experience', index, { current: e.target.checked })} />
                    I currently work here
                  </label>
                </div>
              </>
            )}
          />
        </section>

        <div className="flex items-center gap-3 border-t border-border pt-6">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </Button>
        </div>
      </form>
    </div>
  )
}