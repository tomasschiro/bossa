"use client";

import { useCallback, useEffect, useState } from "react";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("bossa-dark") === "1";
}

export function useDarkMode() {
  const [dark, setDark] = useState(readStored);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem("bossa-dark", next ? "1" : "0");
      return next;
    });
  }, []);

  return { dark, toggle };
}
