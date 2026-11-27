import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { createAppServices } from './infrastructure/createAppServices';
import { initNativeShell } from './infrastructure/platform/nativeShell';
import './ui/styles/fonts.css';
import './ui/styles/tokens.css';
import './ui/styles/base.css';

initNativeShell();
const services = createAppServices();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>
);
