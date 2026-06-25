import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TooltipProvider } from './components/ui/Tooltip'
import { DialogProvider } from './components/ui/dialogService'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <DialogProvider>
        <App />
      </DialogProvider>
    </TooltipProvider>
  </StrictMode>,
)
