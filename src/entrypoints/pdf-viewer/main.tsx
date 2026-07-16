import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { ViewerApp } from './ViewerApp';
import { initWordHighlighter } from '../../content';
import './style.css';
// Tooltip + highlight styles — declared content scripts don't run on
// extension pages, so the viewer pulls the same features in directly.
import '../../assets/content.css';

initWordHighlighter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ViewerApp />
  </StrictMode>
);
