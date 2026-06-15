import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

const ROUTES = {
  '/':                     () => import('./pages/sinotheni-academy.jsx'),
  '/admin':                () => import('./pages/admin.jsx'),
  '/waiters101':           () => import('./pages/waiters101-lms.jsx'),
  '/foh-mastery':          () => import('./pages/foh-mastery-lms.jsx'),
  '/event-readiness':      () => import('./pages/event-readiness-lms.jsx'),
  '/practical-service':    () => import('./pages/practical-service-lms.jsx'),
  '/wedding-coordination': () => import('./pages/wedding-coordination-lms.jsx'),
  '/accommodation':        () => import('./pages/accommodation-lms.jsx'),
  '/barista101':           () => import('./pages/barista101-lms.jsx'),
  '/barservice101':        () => import('./pages/barservice101-lms.jsx'),
  '/cse101':               () => import('./pages/cse101-lms.jsx'),
  '/housekeepers101':      () => import('./pages/housekeepers101-lms.jsx'),
  '/pcg101':               () => import('./pages/pcg101-lms.jsx'),
  '/receptionist101':      () => import('./pages/receptionist101-lms.jsx'),
  '/wedding-planning':     () => import('./pages/wedding-planning-lms.jsx'),
  '/course-detail':        () => import('./pages/course-detail.jsx'),
};

function App() {
  const [Page, setPage] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const path = window.location.pathname;
    const loader = ROUTES[path] || ROUTES['/'];
    loader()
      .then(mod => setPage(() => mod.default))
      .catch(e => setErr(e.message || String(e)));
  }, []);

  if (err) return (
    <div style={{ fontFamily: 'monospace', padding: 40, color: 'red', background: '#fff', minHeight: '100vh' }}>
      <strong>Page load error:</strong><br />{err}
    </div>
  );

  if (!Page) return (
    <div style={{ fontFamily: 'sans-serif', padding: 40, color: '#888', textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Loading...
    </div>
  );

  return <Page />;
}

createRoot(document.getElementById('root')).render(<App />);
