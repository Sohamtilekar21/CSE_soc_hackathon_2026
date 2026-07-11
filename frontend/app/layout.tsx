import { AuthProvider } from "@/context/AuthContext";
import { Providers } from "./providers";
import "./globals.css";

export const metadata = {
  title: "Image Classifier",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
