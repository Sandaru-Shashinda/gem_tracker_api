import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { GemProvider } from "./hooks/useGemStore.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GemProvider>
      <App />
    </GemProvider>
  </StrictMode>,
)
