"use client";

import { useEffect, useState } from "react";

let deferredPrompt: any = null;

export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault(); // stop auto prompt
      deferredPrompt = e;
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return null;

    deferredPrompt.prompt();

    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setIsInstallable(false);

    return choice.outcome; // "accepted" | "dismissed"
  };

  return { isInstallable, install };
}