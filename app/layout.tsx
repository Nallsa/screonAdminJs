import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import 'bootstrap/dist/css/bootstrap.css';
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import BootstrapClient from "./components/BootstrapClient";
import React from "react";
import Sidebar from "./components/Sidebar";


const raleway = Raleway({ subsets: ["latin"],weight: ['100', '400', '700'] });

export const metadata: Metadata = {
  title: "ScreonAdmin",
  description: "ScreonAdmin",
};


export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {

  return (
      <html lang="en">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      <BootstrapClient />
      <body className={raleway.className}>
      <div className="d-flex">
        <Sidebar />
        <main style={{ marginLeft: 220, width: '100%' }}>
          {children}
        </main>
      </div>
      <Footer />
      </body>
      </html>
  );
}

