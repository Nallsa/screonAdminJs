'use client'


import BootstrapClient from "@/app/components/BootstrapClient";
import Sidebar from "@/app/components/Sidebar";
import Footer from "@/app/components/Footer";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <BootstrapClient />
            <div className="d-flex">
                <Sidebar />
                <main style={{ marginLeft: 220, width: '100%' }}>
                    {children}
                </main>
            </div>
            <Footer />
        </>
    )
}
