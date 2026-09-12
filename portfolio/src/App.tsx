import { AppLogo } from './components/AppLogo'
import {
  GITHUB_URL,
  LINKEDIN_URL,
  projects,
  skillGroups,
  stats,
  type Project,
} from './data/portfolio'

const accentStyles: Record<
  string,
  { ring: string; badge: string; dot: string; gradient: string }
> = {
  teal: {
    ring: 'ring-teal-100',
    badge: 'bg-teal-50 text-teal-800 ring-teal-100',
    dot: 'bg-teal-500',
    gradient: 'from-teal-500/10 via-emerald-500/5 to-cyan-500/10',
  },
  sky: {
    ring: 'ring-sky-100',
    badge: 'bg-sky-50 text-sky-800 ring-sky-100',
    dot: 'bg-sky-500',
    gradient: 'from-sky-500/10 via-blue-500/5 to-indigo-500/10',
  },
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="text-sm font-medium text-stone-600 transition hover:text-teal-700"
    >
      {children}
    </a>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-3">
          <AppLogo size="sm" />
          <span className="font-display text-lg font-bold tracking-tight text-stone-900">
            Miguel Silva
          </span>
        </a>
        <nav className="hidden items-center gap-8 sm:flex">
          <NavLink href="#about">About</NavLink>
          <NavLink href="#projects">Projects</NavLink>
          <NavLink href="#skills">Skills</NavLink>
          <NavLink href="#contact">Contact</NavLink>
        </nav>
      </div>
    </header>
  )
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-20 sm:pb-24 sm:pt-28">
      <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-teal-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <p className="section-label">Software Developer · Canada</p>
        <h1 className="mt-4 max-w-4xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-stone-900 sm:text-6xl lg:text-7xl">
          Building thoughtful interfaces &{' '}
          <span className="gradient-text">tools that ship</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
          Hi, I&apos;m <strong className="font-semibold text-stone-900">Miguel Silva</strong> — a
          front-end engineer with 6+ years crafting responsive, performant web apps in React and
          TypeScript. Based in the Greater Toronto Area, I blend pixel-perfect UI with practical AI
          integrations and Microsoft Power Platform when the problem calls for it.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="#projects"
            className="rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-teal-700"
          >
            See my projects
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-stone-200 bg-white px-6 py-3 text-sm font-semibold text-stone-700 shadow-sm transition hover:border-teal-200 hover:text-teal-700"
          >
            LinkedIn
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-stone-200 bg-white px-6 py-3 text-sm font-semibold text-stone-700 shadow-sm transition hover:border-teal-200 hover:text-teal-700"
          >
            GitHub
          </a>
        </div>
        <dl className="mt-14 grid max-w-3xl grid-cols-3 gap-6 border-t border-stone-200 pt-10">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <dt className="font-display text-2xl font-bold text-stone-900 sm:text-3xl">{value}</dt>
              <dd className="mt-1 text-sm text-stone-500">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

export function About() {
  return (
    <section id="about" className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="section-label">About</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Front-end craft, real-world delivery
        </h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="card card-hover p-8">
            <h3 className="font-display text-lg font-semibold text-stone-900">What I do</h3>
            <p className="mt-4 leading-relaxed text-stone-600">
              I specialize in accessible, responsive interfaces and integrating REST APIs into smooth
              user experiences. With 6+ years in front-end development, I&apos;ve shipped in Agile teams,
              worked through CI/CD pipelines, and collaborated closely with designers and back-end
              engineers to turn specs into polished products.
            </p>
          </div>
          <div className="card card-hover p-8">
            <h3 className="font-display text-lg font-semibold text-stone-900">How I work</h3>
            <p className="mt-4 leading-relaxed text-stone-600">
              Beyond React, I build with Microsoft Power Platform — Power Apps, Power Automate, and
              Dataverse — for hybrid full-code and low-code solutions. Lately I&apos;ve been dogfooding
              my own AI-powered job-search app while pursuing software roles across Canada.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const style = accentStyles[project.accent] ?? accentStyles.teal

  return (
    <article
      className={`card card-hover overflow-hidden ${project.featured ? 'lg:col-span-2 ring-2 ' + style.ring : ''}`}
    >
      <div className={`bg-gradient-to-br ${style.gradient} p-8 sm:p-10`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {project.featured && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${style.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                Featured project
              </span>
            )}
            <h3 className="mt-3 font-display text-2xl font-bold text-stone-900 sm:text-3xl">
              {project.title}
            </h3>
            <p className="mt-1 text-sm font-medium text-stone-500">{project.tagline}</p>
          </div>
        </div>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-stone-600">
          {project.description}
        </p>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {project.highlights.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-stone-700">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-teal-600"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.42 0l-3.25-3.25a1 1 0 111.42-1.42l2.54 2.54 6.54-6.54a1 1 0 011.42 0z"
                  clipRule="evenodd"
                />
              </svg>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-2">
          {project.stack.map((tech) => (
            <span
              key={tech}
              className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-stone-600 ring-1 ring-stone-200/80"
            >
              {tech}
            </span>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          {project.liveUrl ? (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Live demo
              <span aria-hidden>→</span>
            </a>
          ) : (
            <span className="rounded-full bg-stone-100 px-5 py-2.5 text-sm text-stone-500">
              Demo link pending
            </span>
          )}
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-teal-200 hover:text-teal-700"
          >
            Source code
          </a>
        </div>
      </div>
    </article>
  )
}

export function Projects() {
  return (
    <section id="projects" className="bg-surface-100/60 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="section-label">Projects</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Featured project
        </h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          Built to solve my own job search — deployed and maintained, not just a tutorial.
        </p>
        <div className="mt-12 grid gap-8">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function Skills() {
  return (
    <section id="skills" className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="section-label">Skills</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Stack & strengths
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {skillGroups.map((group) => (
            <div key={group.label} className="card card-hover p-6">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-teal-700">
                {group.label}
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.items.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-stone-50 px-3 py-1.5 text-sm font-medium text-stone-700 ring-1 ring-stone-200/80"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Contact() {
  return (
    <section id="contact" className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="card relative overflow-hidden px-8 py-14 text-center sm:px-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-amber-50/80" />
          <div className="relative">
            <AppLogo size="lg" />
            <h2 className="mt-6 font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Let&apos;s connect
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-stone-600">
              Open to software developer roles in Canada. Explore my live projects or reach out on
              LinkedIn and GitHub — I&apos;d love to hear from you.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-8 py-3.5 font-semibold text-white shadow-glow transition hover:bg-teal-700"
              >
                LinkedIn
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-8 py-3.5 font-semibold text-stone-700 transition hover:border-teal-200 hover:text-teal-700"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-stone-200 px-6 py-8 text-center text-sm text-stone-500">
      © {new Date().getFullYear()} Miguel Silva · Built with React & TypeScript
    </footer>
  )
}
