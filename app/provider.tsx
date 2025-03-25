'use client';

import React, { createContext, useContext } from 'react';

interface DashboardContextType {
  token?: string;
}

const DashboardContext = createContext<DashboardContextType>({});

export const useDashboard = () => useContext(DashboardContext);

export const useFetch = (url: string) => {
  const { token } = useDashboard();
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
};

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
