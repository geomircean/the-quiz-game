import { Anton, Libre_Franklin } from "next/font/google";
import { AuthProvider } from '@/context/auth-context';
import { ToastProvider } from '@/context/toast-context';
import "./globals.css";

// Display type (scores, room codes, headers). Body/UI type.
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton", display: "swap" });
const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-libre",
  display: "swap",
});

export const metadata = {
  title: "Team Quiz Show",
  description: "A team quiz show for parties — build quizzes, host live games, play from your phone",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${anton.variable} ${libreFranklin.variable}`}>
      {/* Flat navy backdrop (cast-safe) — the old purple gradient washed out
          when mirrored to a TV. */}
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
