import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // S'assurer que le nom correspond à votre fichier CSS

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}