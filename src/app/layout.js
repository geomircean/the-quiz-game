import { Inter } from "next/font/google";
import { AuthProvider } from '@/context/auth-context';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Raul's Random Quiz Questions",
  description: "Local game to play with friends at parties",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* The app-wide backdrop lives here so pages don't each repaint it. */}
      <body className={`${inter.className} min-h-screen bg-gradient-to-b from-purple-950 to-indigo-950`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
