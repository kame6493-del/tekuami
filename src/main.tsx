import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ArtSheet } from './dev/ArtSheet';
import { IconArt, PieceArt } from './dev/IconArt';
import './index.css';

// ?art=1 は絵の見本(ブラウザでの確認用)
const artMode = new URLSearchParams(location.search).get('art');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{artMode === 'icon' ? <IconArt /> : artMode === 'piece' ? <PieceArt /> : artMode ? <ArtSheet /> : <App />}</StrictMode>,
);
