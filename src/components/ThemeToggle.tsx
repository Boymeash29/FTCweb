"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => { const saved = localStorage.getItem("theme"); const isLight = saved === "light"; setLight(isLight); document.documentElement.dataset.theme = isLight ? "light" : "dark"; }, []);
  function toggle() { const next = !light; setLight(next); document.documentElement.dataset.theme = next ? "light" : "dark"; localStorage.setItem("theme", next ? "light" : "dark"); }
  return <button type="button" className="icon-button" onClick={toggle} aria-label={`Switch to ${light ? "dark" : "light"} theme`} title="Toggle color theme">{light ? <Moon size={17} /> : <Sun size={17} />}</button>;
}
