import ListEditor from '../ListEditor.jsx'
import { Badge } from '../ui/badge.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.jsx'
import { Input } from '../ui/input.jsx'
import { Label } from '../ui/label.jsx'
import { Textarea } from '../ui/textarea.jsx'
import { splitList } from '../../utils/format.js'

const fieldClass = 'space-y-2'
const rowClass = 'grid grid-cols-1 gap-4 md:grid-cols-2'

export default function ResumeFormCards({
  form,
  onChangeField,
  onListChange,
  onUpdateListItem,
  onAddListItem,
  onRemoveListItem,
  idPrefix = 'manual',
  disabled = false,
}) {
  const formState = form || {}
  const skillsList = splitList(formState.skills || '')
  const languagesList = splitList(formState.languages || '')

  const handleListChange = (section, items) => {
    if (onListChange) {
      onListChange(section, items)
      return
    }
    const current = formState[section] || []
    if (items.length > current.length && onAddListItem) {
      onAddListItem(section, items[items.length - 1])
    } else if (items.length < current.length && onRemoveListItem) {
      const removedIndex = current.findIndex((item, i) => items[i] !== item)
      onRemoveListItem(section, removedIndex !== -1 ? removedIndex : current.length - 1)
    }
  }

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
              value={formState.title || ''}
              onChange={onChangeField}
              disabled={disabled}
            />
          </div>
          <div className={fieldClass}>
            <Label htmlFor={`${idPrefix}-summary`}>Summary</Label>
            <Textarea
              id={`${idPrefix}-summary`}
              name="summary"
              rows={4}
              placeholder="A short professional summary"
              value={formState.summary || ''}
              onChange={onChangeField}
              className="min-h-[140px]"
              disabled={disabled}
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
                value={formState.skills || ''}
                onChange={onChangeField}
                disabled={disabled}
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
                value={formState.languages || ''}
                onChange={onChangeField}
                disabled={disabled}
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
            items={formState.experience || []}
            onChange={(items) => handleListChange('experience', items)}
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
                      value={item.company || ''}
                      onChange={(e) => onUpdateListItem('experience', index, { company: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                  <div className={fieldClass}>
                    <Label htmlFor={`${idPrefix}-experience-position-${index}`}>Position</Label>
                    <Input
                      id={`${idPrefix}-experience-position-${index}`}
                      value={item.position || ''}
                      onChange={(e) => onUpdateListItem('experience', index, { position: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className={fieldClass}>
                  <Label htmlFor={`${idPrefix}-experience-description-${index}`}>Description</Label>
                  <Textarea
                    id={`${idPrefix}-experience-description-${index}`}
                    rows={2}
                    value={item.description || ''}
                    onChange={(e) => onUpdateListItem('experience', index, { description: e.target.value })}
                    className="min-h-[80px]"
                    disabled={disabled}
                  />
                </div>
                <div className={rowClass}>
                  <div className={fieldClass}>
                    <Label htmlFor={`${idPrefix}-experience-start-${index}`}>Start date</Label>
                    <Input
                      type="date"
                      id={`${idPrefix}-experience-start-${index}`}
                      value={item.startDate || ''}
                      onChange={(e) => onUpdateListItem('experience', index, { startDate: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                  <div className={fieldClass}>
                    <Label htmlFor={`${idPrefix}-experience-end-${index}`}>End date</Label>
                    <Input
                      type="date"
                      id={`${idPrefix}-experience-end-${index}`}
                      value={item.endDate || ''}
                      disabled={item.current || disabled}
                      onChange={(e) => onUpdateListItem('experience', index, { endDate: e.target.value })}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      checked={Boolean(item.current)}
                      disabled={disabled}
                      onChange={(e) => onUpdateListItem('experience', index, { current: e.target.checked })}
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
            items={formState.education || []}
            onChange={(items) => handleListChange('education', items)}
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
                      value={item.school || ''}
                      onChange={(e) => onUpdateListItem('education', index, { school: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                  <div className={fieldClass}>
                    <Label htmlFor={`${idPrefix}-education-degree-${index}`}>Degree</Label>
                    <Input
                      id={`${idPrefix}-education-degree-${index}`}
                      value={item.degree || ''}
                      onChange={(e) => onUpdateListItem('education', index, { degree: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className={rowClass}>
                  <div className={fieldClass}>
                    <Label htmlFor={`${idPrefix}-education-field-${index}`}>Field of study</Label>
                    <Input
                      id={`${idPrefix}-education-field-${index}`}
                      value={item.fieldOfStudy || ''}
                      onChange={(e) => onUpdateListItem('education', index, { fieldOfStudy: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className={rowClass}>
                  <div className={fieldClass}>
                    <Label htmlFor={`${idPrefix}-education-start-${index}`}>Start date</Label>
                    <Input
                      type="date"
                      id={`${idPrefix}-education-start-${index}`}
                      value={item.startDate || ''}
                      onChange={(e) => onUpdateListItem('education', index, { startDate: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                  <div className={fieldClass}>
                    <Label htmlFor={`${idPrefix}-education-end-${index}`}>End date</Label>
                    <Input
                      type="date"
                      id={`${idPrefix}-education-end-${index}`}
                      value={item.endDate || ''}
                      onChange={(e) => onUpdateListItem('education', index, { endDate: e.target.value })}
                      disabled={disabled}
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
            items={formState.projects || []}
            onChange={(items) => handleListChange('projects', items)}
            addLabel="Add project"
            emptyLabel="No projects added yet"
            emptyItem={{ name: '', description: '', url: '', techStack: '' }}
            renderItem={(item, index) => {
              const techStackList = splitList(item.techStack || '')
              return (
                <>
                  <div className={rowClass}>
                    <div className={fieldClass}>
                      <Label htmlFor={`${idPrefix}-projects-name-${index}`}>Name</Label>
                      <Input
                        id={`${idPrefix}-projects-name-${index}`}
                        value={item.name || ''}
                        onChange={(e) => onUpdateListItem('projects', index, { name: e.target.value })}
                        disabled={disabled}
                      />
                    </div>
                    <div className={fieldClass}>
                      <Label htmlFor={`${idPrefix}-projects-url-${index}`}>URL</Label>
                      <Input
                        id={`${idPrefix}-projects-url-${index}`}
                        placeholder="https://..."
                        value={item.url || ''}
                        onChange={(e) => onUpdateListItem('projects', index, { url: e.target.value })}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                  <div className={fieldClass}>
                    <Label htmlFor={`${idPrefix}-projects-techstack-${index}`}>Tech stack</Label>
                    <Input
                      id={`${idPrefix}-projects-techstack-${index}`}
                      placeholder="React, Vite, Node.js"
                      value={item.techStack || ''}
                      onChange={(e) => onUpdateListItem('projects', index, { techStack: e.target.value })}
                      disabled={disabled}
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
                      value={item.description || ''}
                      onChange={(e) => onUpdateListItem('projects', index, { description: e.target.value })}
                      className="min-h-[80px]"
                      disabled={disabled}
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
            items={formState.certifications || []}
            onChange={(items) => handleListChange('certifications', items)}
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
                      value={item.name || ''}
                      onChange={(e) => onUpdateListItem('certifications', index, { name: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                  <div className={fieldClass}>
                    <Label htmlFor={`${idPrefix}-certifications-issuer-${index}`}>Issuer</Label>
                    <Input
                      id={`${idPrefix}-certifications-issuer-${index}`}
                      value={item.issuer || ''}
                      onChange={(e) => onUpdateListItem('certifications', index, { issuer: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className={rowClass}>
                  <div className={fieldClass}>
                    <Label htmlFor={`${idPrefix}-certifications-issuedate-${index}`}>Issue date</Label>
                    <Input
                      type="date"
                      id={`${idPrefix}-certifications-issuedate-${index}`}
                      value={item.issueDate || ''}
                      onChange={(e) => onUpdateListItem('certifications', index, { issueDate: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                  <div className={fieldClass}>
                    <Label htmlFor={`${idPrefix}-certifications-expirydate-${index}`}>Expiry date</Label>
                    <Input
                      type="date"
                      id={`${idPrefix}-certifications-expirydate-${index}`}
                      value={item.expiryDate || ''}
                      onChange={(e) => onUpdateListItem('certifications', index, { expiryDate: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className={fieldClass}>
                  <Label htmlFor={`${idPrefix}-certifications-url-${index}`}>URL</Label>
                  <Input
                    id={`${idPrefix}-certifications-url-${index}`}
                    placeholder="https://..."
                    value={item.url || ''}
                    onChange={(e) => onUpdateListItem('certifications', index, { url: e.target.value })}
                    disabled={disabled}
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
