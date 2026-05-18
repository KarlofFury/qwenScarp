import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QwenScraper',
  description: 'Web scraper powered by Qwen AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
