import { GITHUB_URL, projects, skills, type Project } from './data/portfolio'

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="text-sm text-gray-400 transition hover:text-white"
    >
      {children}
    </a>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#" className="font-display text-xl font-bold">
          MS<span className="text-brand-accent">.</span>
        </a>
        <nav className="hidden gap-6 sm:flex">
          <NavLink href="#about">About</NavLink>
          <NavLink href="#projects">Projects</NavLink>
          <NavLink href="#skills">Skills</NavLink>
          <NavLink href="#contact">Contact</NavLink>
        </nav>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium transition hover:border-brand-accent hover:text-brand-accent"
        >
          GitHub
        </a>
      </div>
    </header>
  )
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_50%)]" />
      <div className="relative mx-auto max-w-6xl">
        <p className="mb-4 text-sm uppercase tracking-widest text-brand-accent">
          Software Developer · Canada
        </p>
        <h1 className="font-display text-5xl font-bold leading-tight sm:text-7xl">
          Hi, I'm <span className="gradient-text">Miguel Silva</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-gray-400">
          Front-end engineer with 5+ years building responsive, performant web apps with React
          and TypeScript. Currently building portfolio projects and pursuing software development
          opportunities in Canada.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="#projects"
            className="rounded-lg bg-brand-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            View my work
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="glass rounded-lg px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
          >
            GitHub profile
          </a>
        </div>
      </div>
    </section>
  )
}

export function About() {
  return (
    <section id="about" className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-3xl font-bold">About</h2>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <p className="leading-relaxed text-gray-400">
            I'm a Front-end Software Engineer with 5+ years of experience crafting responsive,
            performant web applications. I specialize in pixel-perfect, accessible interfaces and
            integrating REST APIs for dynamic user experiences.
          </p>
          <p className="leading-relaxed text-gray-400">
            Experienced in Agile environments, CI/CD workflows, and cross-functional collaboration.
            I also work with Microsoft Power Platform (Power Apps, Power Automate, Dataverse) for
            hybrid full-code and low-code solutions. Passionate about clean code and user-centered design.
          </p>
        </div>
      </div>
    </section>
  )
}

export function Projects() {
  return (
    <section id="projects" className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-3xl font-bold">Projects</h2>
        <p className="mt-2 text-gray-400">Live apps built to learn, ship, and showcase my skills.</p>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {projects.map((project: Project) => (
            <article
              key={project.id}
              className={`glass group overflow-hidden rounded-2xl bg-gradient-to-br ${project.gradient} transition hover:border-brand-accent/50`}
            >
              <div className="p-8">
                <span className="text-4xl">{project.emoji}</span>
                <h3 className="mt-4 text-xl font-bold">{project.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">{project.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.stack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-gray-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-1 text-xs text-gray-500">
                  {project.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                <div className="mt-6 flex gap-3">
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
                  >
                    Live demo →
                  </a>
                  <a
                    href={`${GITHUB_URL}/tree/main/${project.githubPath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
                  >
                    Source code
                  </a>
                </div>
              </div>
            </article>
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
        <h2 className="font-display text-3xl font-bold">Skills</h2>
        <div className="mt-8 flex flex-wrap gap-3">
          {skills.map((skill) => (
            <span
              key={skill}
              className="glass rounded-full px-4 py-2 text-sm text-gray-300"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Contact() {
  return (
    <section id="contact" className="px-6 py-20">
      <div className="mx-auto max-w-6xl text-center">
        <h2 className="font-display text-3xl font-bold">Let's connect</h2>
        <p className="mt-4 text-gray-400">
          Open to software developer roles in Canada. Check out my projects or reach out on GitHub.
        </p>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-accent px-8 py-3 font-semibold text-white transition hover:bg-blue-600"
        >
          github.com/DevMiguelSilva
        </a>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-gray-500">
      © {new Date().getFullYear()} Miguel Silva · Built with React & TypeScript
    </footer>
  )
}
