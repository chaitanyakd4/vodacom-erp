'use client';
import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Check for updates on every page load
            registration.update();
            console.log('PWA Service Worker registered with scope: ', registration.scope);
          })
          .catch((err) => {
            console.error('PWA Service Worker registration failed: ', err);
          });
      });
    }
  }, []);

  return null;
}