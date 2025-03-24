'use client';

import React, { createContext, useContext } from 'react';

interface DashboardContextType {
  token?: string;
}

const DashboardContext = createContext<DashboardContextType>({});

export const useDashboard = () => useContext(DashboardContext);

export function DashboardProvider({
  children,
  initialToken,
}: {
  children: React.ReactNode;
  initialToken?: string;
}) {
  return (
    <DashboardContext.Provider value={{ token: initialToken }}>
      {children}
    </DashboardContext.Provider>
  );
}
