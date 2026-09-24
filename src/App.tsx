/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { RouterProvider } from './routes/RouterContext';
import { AppShell } from './components/AppShell';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider>
          <AppShell />
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

