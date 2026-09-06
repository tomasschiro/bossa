"use client";
import { createContext, useContext } from "react";
export const NaipesContext = createContext<string[]>([]);
export const useNaipes = () => useContext(NaipesContext);
