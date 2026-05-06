"use client";

import { useEffect, useState } from "react";

let deferredPrompt: any = null;

export default function AdminPWAInstall() {
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      deferredPrompt = e;
      setInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;

    console.log("Install result:", result.outcome);

    deferredPrompt = null;
    setInstallable(false);
  };

  if (!installable) return null;

  return (
    <button onClick={handleInstall}>
      Install Admin App
    </button>
  );
}