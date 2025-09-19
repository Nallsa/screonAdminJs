/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

import { Raleway } from "next/font/google";
import "./globals.css";
import 'bootstrap/dist/css/bootstrap.css';

const raleway = Raleway({ subsets: ["latin"], weight: ['100', '400', '700'] });

export const metadata = {
    title: "ScreonAdmin",
    description: "ScreonAdmin",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        </head>
        <body className={raleway.className}>
        {children}
        </body>
        </html>
    );
}