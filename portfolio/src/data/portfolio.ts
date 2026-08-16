export interface Project {
  id: string
  title: string
  description: string
  stack: string[]
  features: string[]
  liveUrl: string
  githubPath: string
  emoji: string
  gradient: string
}

export const projects: Project[] = [
  {
    id: 'movie-discovery',
    title: 'Cine — Movie Discovery',
    description:
      'Browse trending films, search movies, view TMDB scores, watch trailers, and read community reviews. Favorites saved locally with dark/light theme support.',
    stack: ['React', 'TypeScript', 'Tailwind', 'TMDB API', 'Vite'],
    features: ['Search & trending', 'Scores & reviews', 'YouTube trailers', 'Favorites'],
    liveUrl: import.meta.env.VITE_MOVIE_APP_URL || '#projects',
    githubPath: 'movie-discovery',
    emoji: '🎬',
    gradient: 'from-red-500/20 to-orange-500/10',
  },
  {
    id: 'job-tracker',
    title: 'ApplyTrack — AI Job Tracker',
    description:
      'Kanban board for job applications with AI-powered posting parser, cover letter drafts, and tailored resume bullets. Built for my job search in Canada.',
    stack: ['React', 'TypeScript', 'Gemini AI', 'Supabase', 'Tailwind'],
    features: ['Kanban board', 'AI job parser', 'Cover letters', 'Cloud sync'],
    liveUrl: import.meta.env.VITE_JOB_TRACKER_URL || '#projects',
    githubPath: 'job-tracker',
    emoji: '💼',
    gradient: 'from-indigo-500/20 to-blue-500/10',
  },
]

export const skills = [
  'React',
  'TypeScript',
  'JavaScript',
  'Tailwind CSS',
  'REST APIs',
  'Supabase',
  'Git & CI/CD',
  'Agile',
  'Power Platform',
  'Accessible UI',
]

export const GITHUB_URL =
  import.meta.env.VITE_GITHUB_URL || 'https://github.com/DevMiguelSilva'
