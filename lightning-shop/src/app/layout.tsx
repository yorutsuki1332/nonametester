import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'LIGHTNING | 日常選品與飾品',
  description: '日常的美好，源於細節，輕巧點綴你的每一天。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="bg-white text-[#333333] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}