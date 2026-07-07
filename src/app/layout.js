import { Inter } from "next/font/google";
import { AuthProvider } from '@/context/auth-context';
import { ToastProvider } from '@/context/toast-context';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Team Quiz Show",
  description: "A team quiz show for parties — build quizzes, host live games, play from your phone",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* The app-wide backdrop lives here so pages don't each repaint it. */}
      <body className={`${inter.className} min-h-screen bg-gradient-to-b from-purple-950 to-indigo-950`}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
