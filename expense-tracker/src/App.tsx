import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BudgetProvider } from './hooks/useBudget'
import { BudgetPage } from './pages/BudgetPage'
import { CardsPage } from './pages/CardsPage'
import { OverviewPage } from './pages/OverviewPage'

export default function App() {
  return (
    <BudgetProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<OverviewPage />} />
            <Route path="budget" element={<BudgetPage />} />
            <Route path="cards" element={<CardsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </BudgetProvider>
  )
}
