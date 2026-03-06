import { useState, useRef, type KeyboardEvent } from 'react'
import './TagsInput.css'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export default function TagsInput({ tags, onChange, placeholder = 'nombre...' }: Props) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (val: string) => {
    const v = val.trim().replace(/,$/, '')
    if (!v || tags.includes(v)) return
    onChange([...tags, v])
  }

  const removeTag = (tag: string) => onChange(tags.filter(t => t !== tag))

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input.value)
      input.value = ''
    } else if (e.key === 'Backspace' && !input.value && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div
      className={`tags-input${focused ? ' tags-input--focused' : ''}`}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map(tag => (
        <span key={tag} className="tags-input__chip">
          {tag}
          <button
            type="button"
            className="tags-input__chip-remove"
            onClick={() => removeTag(tag)}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="tags-input__input"
        placeholder={tags.length === 0 ? placeholder : ''}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={e => {
          setFocused(false)
          if (e.target.value) { addTag(e.target.value); e.target.value = '' }
        }}
      />
    </div>
  )
}
