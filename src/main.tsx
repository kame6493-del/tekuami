import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// ?art=... は絵の見本(ブラウザでの確認用)。アプリ本体とは別に読み込む
const artMode = new URLSearchParams(location.search).get('art');
const Root = artMode ? lazy(() => import('./dev/ArtSheet').then((m) => ({ default: m.ArtSheet }))) : lazy(() => import('./App'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div className="boot" />}>
      <Root />
    </Suspense>
  </StrictMode>,
);
