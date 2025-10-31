import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { WalletButton } from "@/components/WalletButton";
import { TabNavigation, FaucetButton } from "@/components/TabNavigation";

export const metadata: Metadata = {
  title: "HushVault - Private Group Savings",
  description: "HushVault - Confidential group savings pools powered by FHE technology",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      </head>
      <body className="bg-primary text-foreground antialiased">
        <div className="fixed inset-0 w-full h-full bg-primary z-[-20] min-w-[850px]" />
        
        <main className="flex flex-col w-full min-h-screen" suppressHydrationWarning>
          <Providers>
            {/* Header */}
            <header className="fixed top-0 left-0 w-full h-fit py-5 flex justify-center items-center bg-header text-white z-50">
              <div className="w-[90%] flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <h1 className="text-4xl font-bold text-white">
                    HushVault
                  </h1>
                  <TabNavigation />
                </div>
                <div className="flex items-center gap-4">
                  <FaucetButton />
                  <WalletButton />
                </div>
              </div>
            </header>

            {/* Main */}
            <div className="main flex-1 w-full overflow-y-auto pt-20 bg-secondary">
              <div className="w-[80%] mx-auto px-3 md:px-6">
                {children}
              </div>
            </div>
          </Providers>
        </main>
      </body>
    </html>
  );
}
