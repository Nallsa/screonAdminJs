'use client';
import Link from "next/link";
import {usePathname} from 'next/navigation';

const navItems = [
    {href: "/screens", label: "Экраны", icon: "bi bi-display"},
    {href: "/playlists", label: "Плейлисты", icon: "bi bi-collection-play"},
    {href: "/library", label: "Библиотека", icon: "bi bi-music-note-list"},
    {href: "/schedule", label: "Расписание", icon: "bi bi-calendar3"},
];

const Sidebar = () => {
    const pathname = usePathname();

    return (
        <div className="d-flex flex-column bg-white shadow-sm" style={{width: 220, height: '100vh', position: 'fixed'}}>
            {navItems.map(({href, label, icon}) => (
                <Link key={href} href={href}
                      className={`p-3 d-flex align-items-center text-decoration-none ${pathname === href ? "bg-light fw-bold" : "text-dark"}`}>
                    <i className={`${icon} me-2`}></i>
                    <span>{label}</span>
                </Link>
            ))}
        </div>
    );
};

export default Sidebar;
