import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'

export function ProfilePage() {
  const { profile, updateProfile, isProfileComplete } = useProfile()
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to="/" className="text-sm text-slate-500 hover:text-track-accent dark:text-slate-400">
          ← Back to board
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Your Profile</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          AI uses this info to draft cover letters and resume bullets. Be honest — AI won't invent experience you don't have.
        </p>
      </div>

      {!isProfileComplete && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Fill in at least your name and experience summary to unlock AI cover letters.
        </p>
      )}

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-track-700 dark:bg-track-800">
        <label className="block">
          <span className="text-sm font-medium">Full name *</span>
          <input
            value={profile.name}
            onChange={(e) => updateProfile({ name: e.target.value })}
            placeholder="Miguel Silva"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Headline</span>
          <input
            value={profile.headline}
            onChange={(e) => updateProfile({ headline: e.target.value })}
            placeholder="Junior Software Developer | React · TypeScript"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Skills (comma-separated)</span>
          <input
            value={profile.skills}
            onChange={(e) => updateProfile({ skills: e.target.value })}
            placeholder="React, TypeScript, JavaScript, HTML, CSS, Git"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Experience summary *</span>
          <textarea
            value={profile.experienceSummary}
            onChange={(e) => updateProfile({ experienceSummary: e.target.value })}
            rows={6}
            placeholder="Describe your projects, internships, and skills honestly. Example: Built a React movie app with TMDB API integration. Completed CS courses / bootcamp projects in JavaScript and web development…"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-track-accent py-2.5 text-sm font-semibold text-white hover:bg-indigo-600"
        >
          {saved ? '✓ Saved' : 'Save profile'}
        </button>
      </form>
    </div>
  )
}
