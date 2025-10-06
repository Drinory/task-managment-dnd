import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TRPCProvider } from '@/lib/trpc/Provider';
import { ToastContainer } from '@/components/ui/toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mini Kanban',
  description: 'A local Kanban board with drag-and-drop',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <TRPCProvider>
            {children}
            <ToastContainer />
          </TRPCProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

