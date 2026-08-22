import React from 'react';
import type { Metadata } from 'next';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '@/theme/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fastrack Management Services | School Management System & Cloud ERP',
  description:
    'Since 2014, Fastrack Management Services provides simple, reliable, and trusted software solutions in Ghana. Flagship School ERP, IT Consultancy, Database Management, Mobile Apps, Bulk SMS, and Accounting Services.',
  keywords: [
    'School Management System Ghana',
    'Fastrack Management Services',
    'Fastrack EduSuite',
    'School ERP Ghana',
    'Bulk SMS Ghana',
    'IT Consultancy Accra',
    'Mobile Money School Fees',
    'Data Protection Act Ghana',
  ],
  authors: [{ name: 'Fastrack Management Services' }],
  openGraph: {
    title: 'Fastrack Management Services | School Management System & Cloud ERP',
    description:
      'Simple, reliable, and trusted software solutions for schools and enterprises across Ghana and beyond.',
    url: 'https://fastrack.com.gh',
    siteName: 'Fastrack Management Services',
    locale: 'en_GH',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="light">
          <Notifications position="top-right" zIndex={1000} />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
