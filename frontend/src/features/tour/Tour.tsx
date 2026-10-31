import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthContext'
import { stepsFor } from './tourSteps'
import './tour.css'

export const OPEN_TOUR_EVENT = 'brightloop:open-tour'
const SKIPPED_KEY = 'brightloop:tour-skipped-this-session'

const sessionSkipped = () => {
  try {
    return sessionStorage.getItem(SKIPPED_KEY) === '1'
  } catch {
    return false
  }
}
const rememberSkipped = () => {
  try {
    sessionStorage.setItem(SKIPPED_KEY, '1')
  } catch {
    /* private mode: the tour may reappear on the next page load, which is acceptable */
  }
}

/** Welcome tour. Opens once for new users, can be skipped, and can always be reopened by hand. */
export function Tour() {
  const { user } = useAuth()
  const steps = stepsFor(user?.role)
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [neverShow, setNeverShow] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Ask the server once whether this person has already finished or opted out.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    api
      .get('/tour/')
      .then((res) => {
        if (!cancelled && res.data?.show_automatically && !sessionSkipped()) setOpen(true)
      })
      .catch(() => {}) // the tour is optional: never block the app
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    const reopen = () => {
      setIndex(0)
      setNeverShow(false)
      setOpen(true)
    }
    window.addEventListener(OPEN_TOUR_EVENT, reopen)
    return () => window.removeEventListener(OPEN_TOUR_EVENT, reopen)
  }, [])

  const save = useCallback((body: { completed?: boolean; never_show?: boolean }) => {
    api.patch('/tour/', body).catch(() => {})
  }, [])

  const skip = useCallback(() => {
    rememberSkipped()
    if (neverShow) save({ never_show: true })
    setOpen(false)
  }, [neverShow, save])

  const finish = useCallback(() => {
    save({ completed: true, ...(neverShow ? { never_show: true } : {}) })
    setOpen(false)
  }, [neverShow, save])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip()
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, steps.length - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    cardRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, skip, steps.length])

  if (!open || !user) return null

  const step = steps[index]
  const Icon = step.icon
  const last = index === steps.length - 1

  return (
    <div className="bl-tour-backdrop" role="presentation">
      <div
        className="bl-tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bl-tour-title"
        tabIndex={-1}
        ref={cardRef}
      >
        <button type="button" className="bl-tour-close" onClick={skip} aria-label="Skip tour">
          <X size={18} />
        </button>

        {/* key restarts the animation on every step */}
        <div className="bl-tour-art" key={`art-${index}`} aria-hidden="true">
          <div className="bl-tour-window">
            <span className="bl-tour-bar" />
            <span className="bl-tour-row" style={{ ['--i' as string]: 0 }} />
            <span className="bl-tour-row" style={{ ['--i' as string]: 1 }} />
            <span className="bl-tour-row is-short" style={{ ['--i' as string]: 2 }} />
            <span className="bl-tour-pulse" />
          </div>
          <span className="bl-tour-badge">
            <Icon size={26} strokeWidth={1.6} />
          </span>
        </div>

        <div className="bl-tour-body" key={`body-${index}`}>
          <span className="bl-tour-count">
            Step {index + 1} of {steps.length}
          </span>
          <h2 id="bl-tour-title">{step.title}</h2>
          <p>{step.summary}</p>
          <ul>
            {step.todo.map((item) => (
              <li key={item}>
                <Check size={14} aria-hidden="true" /> {item}
              </li>
            ))}
          </ul>
          {step.path && (
            <Link to={step.path} className="bl-tour-link" onClick={() => setOpen(false)}>
              {step.pathLabel} <ArrowRight size={14} />
            </Link>
          )}
        </div>

        <div className="bl-tour-dots" role="group" aria-label="Tour progress">
          {steps.map((s, i) => (
            <button
              key={s.title}
              type="button"
              className={i === index ? 'is-active' : ''}
              aria-label={`Go to step ${i + 1}: ${s.title}`}
              aria-current={i === index ? 'step' : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>

        <div className="bl-tour-footer">
          <label className="bl-tour-never">
            <input type="checkbox" checked={neverShow} onChange={(e) => setNeverShow(e.target.checked)} />
            Don’t show this again
          </label>
          <div className="bl-tour-actions">
            <button type="button" className="bl-refresh" onClick={skip}>
              Skip tour
            </button>
            {index > 0 && (
              <button type="button" className="bl-refresh" onClick={() => setIndex(index - 1)}>
                <ArrowLeft size={14} /> Back
              </button>
            )}
            {last ? (
              <button type="button" className="bl-refresh is-primary" onClick={finish}>
                Finish
              </button>
            ) : (
              <button type="button" className="bl-refresh is-primary" onClick={() => setIndex(index + 1)}>
                Next <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
