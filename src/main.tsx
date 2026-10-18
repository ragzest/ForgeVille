import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('ForgeVille: #root element is missing from index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
