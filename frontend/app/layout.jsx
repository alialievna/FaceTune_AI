import "./globals.css";

export const metadata = {
  title: "AI Video — Face Overlay",
  description: "Create videos with face overlay",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
