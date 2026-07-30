import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Commentez ces lignes temporairement pour tester :
// import { registerSW } from 'virtual:pwa-register'
// registerSW({
//     immediate: true
// })

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)