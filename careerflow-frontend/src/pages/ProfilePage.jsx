import { useEffect, useState } from 'react'
import { Briefcase, CheckCircle2, MapPin, Phone, User } from 'lucide-react'
import { getProfileApi, updateProfileApi } from '../api/profile.api.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import ListEditor from '../components/ListEditor.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.jsx'
import { Input } from '../components/ui/input.jsx'
import { Textarea } from '../components/ui/textarea.jsx'
import { Label } from '../components/ui/label.jsx'
import { Badge } from '../components/ui/badge.jsx'
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

const fieldClass = "space-y-2"

const rowClass = "grid grid-cols-1 gap-4 md:grid-cols-2"

const initialsOf = (value) =>
  String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6" role="status">
      <span className="sr-only">Loading your profile…</span>
      <div className="space-y-3" aria-hidden="true">
        <div className="space-y-2">
          <div className="h-8 w-44 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:p-7">
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-52 max-w-full animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-40 max-w-full animate-pulse rounded-md bg-muted" />
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="h-5 w-56 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-80 max-w-full animate-pulse rounded-md bg-muted" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-9 animate-pulse rounded-lg bg-muted" />
            <div className="h-9 animate-pulse rounded-lg bg-muted" />
            <div className="h-9 animate-pulse rounded-lg bg-muted" />
            <div className="h-9 animate-pulse rounded-lg bg-muted" />
            <div className="h-36 animate-pulse rounded-lg bg-muted md:col-span-2" />
          </div>
        </div>
      </div>
    </div>
  )
}

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
    return <ProfileSkeleton />
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" subtitle="Could not load your profile." />
        <ErrorMessage title="Could not load profile" message={loadError.message} />
      </div>
    )
  }

  const skillsList = splitList(form.skills)

  const yearsRaw = Number(form.yearsOfExperience)
  const years = form.yearsOfExperience === '' || Number.isNaN(yearsRaw) ? null : yearsRaw

  const identityMeta = [
    form.location.trim() ? { key: 'location', icon: MapPin, label: form.location.trim() } : null,
    form.phone.trim() ? { key: 'phone', icon: Phone, label: form.phone.trim() } : null,
    years != null
      ? { key: 'experience', icon: Briefcase, label: `${years} year${years === 1 ? '' : 's'} of experience` }
      : null,
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Keep your professional details up to date for better AI matching."
        actions={
          <Button type="submit" form="profile-form" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </Button>
        }
      />

      {successMessage && (
        <div
          className="mx-auto flex w-full max-w-4xl items-center gap-2 rounded-xl border border-success/30 bg-emerald-50 px-4 py-3 text-emerald-800"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}
      {saveError && (
        <div className="mx-auto w-full max-w-4xl">
          <ErrorMessage title="Could not save profile" message={saveError.message} errors={saveError.errors} />
        </div>
      )}

      <form id="profile-form" className="mx-auto w-full max-w-4xl space-y-6" onSubmit={handleSave}>
        <Card>
          <CardContent className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20"
                aria-hidden="true"
              >
                {form.fullName.trim() ? (
                  <span className="text-xl font-bold tracking-tight">{initialsOf(form.fullName)}</span>
                ) : (
                  <User className="h-7 w-7" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {form.fullName.trim() || 'Your name'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                  {form.headline.trim() || 'Add a headline that summarizes your professional identity.'}
                </p>
                {identityMeta.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    {identityMeta.map(({ key, icon: Icon, label }) => (
                      <li key={key} className="flex items-center gap-1.5">
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Professional information</CardTitle>
            <CardDescription>Your name, contact details, and a short professional summary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={rowClass}>
              <div className={fieldClass}>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" name="fullName" value={form.fullName} onChange={updateField} />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="headline">Headline</Label>
                <Input id="headline" name="headline" placeholder="e.g. Frontend Engineer" value={form.headline} onChange={updateField} />
              </div>
            </div>

            <div className={rowClass}>
              <div className={fieldClass}>
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" placeholder="City, Country" value={form.location} onChange={updateField} />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" value={form.phone} onChange={updateField} />
              </div>
            </div>

            <div className={fieldClass}>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" name="bio" rows={4} placeholder="A short summary about yourself" value={form.bio} onChange={updateField} className="min-h-[140px]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skills &amp; career</CardTitle>
            <CardDescription>Skills and professional experience used to match you with the right opportunities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={rowClass}>
              <div className={fieldClass}>
                <Label htmlFor="skills">Skills</Label>
                <Input id="skills" name="skills" placeholder="JavaScript, React, Node.js" value={form.skills} onChange={updateField} />
                {skillsList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {skillsList.map((skill) => (
                      <Badge key={skill} variant="primary">{skill}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className={fieldClass}>
                <Label htmlFor="yearsOfExperience">Years of experience</Label>
                <Input id="yearsOfExperience" name="yearsOfExperience" type="number" min="0" value={form.yearsOfExperience} onChange={updateField} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Education</CardTitle>
            <CardDescription>Degrees, certifications, and academic background.</CardDescription>
          </CardHeader>
          <CardContent>
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
                      <Label htmlFor={`education-school-${index}`}>School</Label>
                      <Input id={`education-school-${index}`} value={item.school} onChange={(e) => updateListItem('education', index, { school: e.target.value })} />
                    </div>
                    <div className={fieldClass}>
                      <Label htmlFor={`education-degree-${index}`}>Degree</Label>
                      <Input id={`education-degree-${index}`} value={item.degree} onChange={(e) => updateListItem('education', index, { degree: e.target.value })} />
                    </div>
                  </div>
                  <div className={rowClass}>
                    <div className={fieldClass}>
                      <Label htmlFor={`education-field-${index}`}>Field of study</Label>
                      <Input id={`education-field-${index}`} value={item.fieldOfStudy} onChange={(e) => updateListItem('education', index, { fieldOfStudy: e.target.value })} />
                    </div>
                  </div>
                  <div className={rowClass}>
                    <div className={fieldClass}>
                      <Label htmlFor={`education-start-${index}`}>Start date</Label>
                      <Input type="date" id={`education-start-${index}`} value={item.startDate} onChange={(e) => updateListItem('education', index, { startDate: e.target.value })} />
                    </div>
                    <div className={fieldClass}>
                      <Label htmlFor={`education-end-${index}`}>End date</Label>
                      <Input type="date" id={`education-end-${index}`} value={item.endDate} onChange={(e) => updateListItem('education', index, { endDate: e.target.value })} />
                    </div>
                  </div>
                </>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Experience</CardTitle>
            <CardDescription>Your work history and the roles you have held.</CardDescription>
          </CardHeader>
          <CardContent>
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
                      <Label htmlFor={`experience-company-${index}`}>Company</Label>
                      <Input id={`experience-company-${index}`} value={item.company} onChange={(e) => updateListItem('experience', index, { company: e.target.value })} />
                    </div>
                    <div className={fieldClass}>
                      <Label htmlFor={`experience-position-${index}`}>Position</Label>
                      <Input id={`experience-position-${index}`} value={item.position} onChange={(e) => updateListItem('experience', index, { position: e.target.value })} />
                    </div>
                  </div>
                  <div className={fieldClass}>
                    <Label htmlFor={`experience-description-${index}`}>Description</Label>
                    <Textarea id={`experience-description-${index}`} rows={2} value={item.description} onChange={(e) => updateListItem('experience', index, { description: e.target.value })} className="min-h-[80px]" />
                  </div>
                  <div className={rowClass}>
                    <div className={fieldClass}>
                      <Label htmlFor={`experience-start-${index}`}>Start date</Label>
                      <Input type="date" id={`experience-start-${index}`} value={item.startDate} onChange={(e) => updateListItem('experience', index, { startDate: e.target.value })} />
                    </div>
                    <div className={fieldClass}>
                      <Label htmlFor={`experience-end-${index}`}>End date</Label>
                      <Input type="date" id={`experience-end-${index}`} value={item.endDate} disabled={item.current} onChange={(e) => updateListItem('experience', index, { endDate: e.target.value })} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary" checked={item.current} onChange={(e) => updateListItem('experience', index, { current: e.target.checked })} />
                      I currently work here
                    </label>
                  </div>
                </>
              )}
            />
          </CardContent>
        </Card>
      </form>
    </div>
  )
}