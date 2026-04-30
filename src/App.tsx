import { Route, Routes, useLocation } from 'react-router-dom';
import { Home } from './presentation/routes/Home';
import { Practice } from './presentation/routes/Practice';
import { Test } from './presentation/routes/Test';
import { TestResult } from './presentation/routes/TestResult';
import { History } from './presentation/routes/History';
import { TopBar } from './presentation/components/layout/TopBar';
import { Footer } from './presentation/components/layout/Footer';

export function App() {
  const location = useLocation();
  return (
    <div className="app-shell">
      <TopBar />
      <main className="app-main" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/practice/:chapter" element={<Practice />} />
          <Route path="/test/:chapter" element={<Test />} />
          <Route path="/test/:chapter/result/:resultId" element={<TestResult />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
