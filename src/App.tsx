/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { RouterProvider } from './routes/RouterContext';
import { AppShell } from './components/AppShell';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppShell />
      </RouterProvider>
    </AuthProvider>
  );
}

