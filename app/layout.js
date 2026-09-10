import "./globals.css";
import { Toaster } from "sonner";

export const metadata = { title: { default: "GerakBelajar", template: "%s · GerakBelajar" }, description: "LMS video untuk belajar, membandingkan, dan mereview gerakan olahraga." };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body><Toaster richColors position="top-right" />{children}</body>
    </html>
  );
}
