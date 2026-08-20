import { splitList, joinList, compact, toDateInputValue } from './format.js'

// Job form model helpers. The backend Job schema is the source of truth:
//   title (required), company (required), location, employmentType,
//   workplaceType, status, description, requirements, responsibilities,
//   skills[], salary {min, max, currency, period}, source, sourceUrl,
//   postedAt, deadline, notes.

export const emptyJobForm = () => ({
  title: '',
  company: '',
  location: '',
  employmentType: '',
  workplaceType: '',
  status: 'saved',
  description: '',
  requirements: '',
  responsibilities: '',
  skills: '',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'USD',
  salaryPeriod: '',
  source: '',
  sourceUrl: '',
  postedAt: '',
  deadline: '',
  notes: '',
})

export const hydrateJobForm = (job) => ({
  title: job.title ?? '',
  company: job.company ?? '',
  location: job.location ?? '',
  employmentType: job.employmentType ?? '',
  workplaceType: job.workplaceType ?? '',
  status: job.status ?? 'saved',
  description: job.description ?? '',
  requirements: job.requirements ?? '',
  responsibilities: job.responsibilities ?? '',
  skills: joinList(job.skills),
  salaryMin: job.salary?.min ?? '',
  salaryMax: job.salary?.max ?? '',
  salaryCurrency: job.salary?.currency ?? 'USD',
  salaryPeriod: job.salary?.period ?? '',
  source: job.source ?? '',
  sourceUrl: job.sourceUrl ?? '',
  postedAt: toDateInputValue(job.postedAt),
  deadline: toDateInputValue(job.deadline),
  notes: job.notes ?? '',
})

export const buildJobPayload = (form) => {
  const salary = compact({
    min: form.salaryMin === '' || form.salaryMin === undefined ? undefined : Number(form.salaryMin),
    max: form.salaryMax === '' || form.salaryMax === undefined ? undefined : Number(form.salaryMax),
    currency: String(form.salaryCurrency || '').trim() || undefined,
    period: form.salaryPeriod || undefined,
  })

  return compact({
    title: String(form.title || '').trim(),
    company: String(form.company || '').trim(),
    // Free-text optional fields are always included (even as '') so that
    // clearing a box sends '' and $set actually clears the stored value.
    // Enum fields and required date fields are never sent as ''.
    location: String(form.location || '').trim(),
    employmentType: form.employmentType || undefined,
    workplaceType: form.workplaceType || undefined,
    status: form.status || undefined,
    description: String(form.description || '').trim(),
    requirements: String(form.requirements || '').trim(),
    responsibilities: String(form.responsibilities || '').trim(),
    skills: splitList(form.skills),
    salary: Object.keys(salary).length ? salary : {},
    source: String(form.source || '').trim(),
    sourceUrl: String(form.sourceUrl || '').trim(),
    postedAt: form.postedAt || undefined,
    deadline: form.deadline || undefined,
    notes: String(form.notes || '').trim(),
  })
}
