import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nexus Marketing IA',
  description: 'Marketing Operating System da Nexus Digital'
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="pt-BR"><body>{children}</body></html>;
}
