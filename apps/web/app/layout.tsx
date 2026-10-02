import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cryptonion | Autonomous Clinical AI Employee & Telephony Platform',
  description: 'Enterprise-grade healthcare AI workforce platform powered by real-time clinical voice intelligence, multi-tenant RBAC, and RAG knowledge search.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="relative min-h-screen bg-background overflow-x-hidden">
          {/* Even.in Signature Electric Blue & Vitality Emerald Ambient Backdrop */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-[#0055FF]/18 via-[#00C853]/08 to-transparent blur-[160px] pointer-events-none rounded-full -z-10" />
          <div className="absolute top-[450px] right-[-100px] w-[600px] h-[600px] bg-[#0055FF]/10 blur-[180px] pointer-events-none rounded-full -z-10" />
          {children}
        </div>
      </body>
    </html>
  );
}
