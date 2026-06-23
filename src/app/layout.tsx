import type { Metadata } from 'next';
import './globals.css';
import { getCurrentUser } from '@/app/actions/auth';
import Navbar from '@/components/Navbar';
import AIChatbot from '@/components/AIChatbot';
import { CurrencyProvider } from '@/components/CurrencyContext';

export const metadata: Metadata = {
  title: "Nexora | AI-Powered Higher Studies Guidance Platform",
  description: "Dream Big. Study Anywhere. Explore universities, scholarships, accommodations, visa checklists, and plan your global education roadmap with the assistance of Llama-3 AI advisor.",
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
        <CurrencyProvider>
          <Navbar user={currentUser} />
          <main className="flex-grow pt-16">
            {children}
          </main>
          <AIChatbot />
        </CurrencyProvider>
      </body>
    </html>
  );
}
