import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'VILLA ATELIER 雲棧 | 生活如棧，心境若雲',
  description: 'Villa Atelier, 以織物編織生活的萬種姿態',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <body className="bg-[#FAF7F2] text-[#382E2B] font-sans antialiased overflow-x-hidden selection:bg-[#E6D5CC]">
        {children}
      </body>
    </html>
  );
}