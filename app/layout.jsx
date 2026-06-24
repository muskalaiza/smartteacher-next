
import { Geist, Geist_Mono } from "next/font/google"; 
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SmartTeacherApp",
  description: "Inteligentna aplikacji do generowania materiałów edukacyjnych",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-50`}>
        {/* Usunęliśmy stąd <AppShell>, dzięki czemu LoginForm może wyświetlić się na całym ekranie */}
        {children}
      </body>
    </html>
  );
}


