"use client";
import { createContext, useContext } from "react";
export const UserContext = createContext<{ name: string }>({ name: "" });
export const useCurrentUser = () => useContext(UserContext);
