import type { Metadata } from 'next';
import './globals.css';
import { getCurrentUser } from '@/app/actions/auth';
import Navbar from '@/components/Navbar';
import AIChatbot from '@/components/AIChatbot';
import { CurrencyProvider } from '@/components/CurrencyContext';
import { ToastProvider } from '@/components/ToastContext';

// This layout uses cookies() for auth — force dynamic rendering across all pages
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Nexora | AI-Powered Higher Studies Guidance Platform",
  description: "Dream Big. Study Anywhere. Explore universities, scholarships, accommodations, visa checklists, and plan your global education roadmap with the assistance of Llama-3 AI advisor.",
  icons: {
    icon: '/images/logo.png',
    shortcut: '/images/logo.png',
    apple: '/images/logo.png',
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen flex flex-col">
        <ToastProvider>
          <CurrencyProvider>
            <Navbar user={currentUser} />
            <main className="flex-grow pt-16">
              {children}
            </main>
            {(!currentUser || currentUser.role === 'student') && <AIChatbot />}
          </CurrencyProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

