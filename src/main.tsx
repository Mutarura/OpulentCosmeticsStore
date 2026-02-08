import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global Error Handler for "White Screen of Death" debugging
window.addEventListener('error', (event) => {
  const errorMsg = document.createElement('div');
  errorMsg.style.position = 'fixed';
  errorMsg.style.top = '0';
  errorMsg.style.left = '0';
  errorMsg.style.width = '100%';
  errorMsg.style.backgroundColor = '#ffdddd';
  errorMsg.style.color = 'red';
  errorMsg.style.padding = '20px';
  errorMsg.style.zIndex = '9999';
  errorMsg.style.fontFamily = 'monospace';
  errorMsg.style.whiteSpace = 'pre-wrap';
  errorMsg.innerText = `Runtime Error: ${event.message}\n\nFile: ${event.filename}\nLine: ${event.lineno}`;
  document.body.appendChild(errorMsg);
});

// Catch unhandled promise rejections (like async failures)
window.addEventListener('unhandledrejection', (event) => {
  const errorMsg = document.createElement('div');
  errorMsg.style.position = 'fixed';
  errorMsg.style.bottom = '0';
  errorMsg.style.left = '0';
  errorMsg.style.width = '100%';
  errorMsg.style.backgroundColor = '#ffffcc';
  errorMsg.style.color = 'black';
  errorMsg.style.padding = '20px';
  errorMsg.style.zIndex = '9999';
  errorMsg.style.fontFamily = 'monospace';
  errorMsg.innerText = `Unhandled Promise Rejection: ${event.reason}`;
  document.body.appendChild(errorMsg);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
