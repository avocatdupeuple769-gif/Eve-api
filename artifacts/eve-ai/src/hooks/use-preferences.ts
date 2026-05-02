import { useState, useEffect } from "react";

interface Preferences {
  language: string;
  voiceEnabled: boolean;
  theme: "dark" | "light" | "system";
}

const defaultPreferences: Preferences = {
  language: "English",
  voiceEnabled: true,
  theme: "dark", // default to dark
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const stored = localStorage.getItem("eve-preferences");
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to load preferences", e);
    }
    return defaultPreferences;
  });

  useEffect(() => {
    try {
      localStorage.setItem("eve-preferences", JSON.stringify(preferences));
    } catch (e) {
      console.error("Failed to save preferences", e);
    }
    
    // Apply theme
    if (preferences.theme === "dark" || (preferences.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      // EVE is fundamentally dark, but if someone forces light:
      document.documentElement.classList.remove("dark");
    }
  }, [preferences]);

  const updatePreferences = (updates: Partial<Preferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  return { preferences, updatePreferences };
}
