import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  About,
  Contact,
  Footer,
  Header,
  Hero,
  Projects,
  Skills,
} from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <About />
        <Projects />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </div>
  </StrictMode>
)
