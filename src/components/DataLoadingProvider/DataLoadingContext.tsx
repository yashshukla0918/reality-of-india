import React, { createContext, useState, type ReactNode } from "react";

export interface DataLoadingContextType {
  isLoading: boolean;
  error: string | null;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  isDarkMode: boolean;
  setIsDarkMode: (darkMode: boolean) => void;
}

export const DataLoadingContext = createContext<DataLoadingContextType | undefined>(
  undefined
);

export function DataLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  return (
    <DataLoadingContext.Provider
      value={{ isLoading, error, setIsLoading, setError, isDarkMode, setIsDarkMode }}
    >
      {children}
    </DataLoadingContext.Provider>
  );
}

export function useDataLoading() {
  const context = React.useContext(DataLoadingContext);
  if (!context) {
    throw new Error("useDataLoading must be used within DataLoadingProvider");
  }
  return context;
}
