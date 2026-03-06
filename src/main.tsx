import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import NotionCallback from './components/Notioncallback.tsx'
import WidgetView from './components/Widgetview.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/notion/callback" element={<NotionCallback />} />
        <Route path="/widget/:userId" element={<WidgetView />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw-notifications.js').catch(console.error)
}