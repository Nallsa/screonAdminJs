/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client';
import Link from "next/link";
import {usePathname} from 'next/navigation';
import {FaBars} from "react-icons/fa";
import {useOrganizationStore} from "@/app/store/organizationStore";
import {Grade, useLicenseStore} from "@/app/store/licenseStore";
import React, {useCallback, useEffect, useMemo} from "react";

interface Props {
    collapsed: boolean
    onToggle: () => void,
    className: string,
}


const navItems = [
    {href: "/screens", label: "Экраны", icon: "bi bi-display"},
    {href: "/playlists", label: "Плейлисты", icon: "bi bi-collection-play"},
    {href: "/library", label: "Библиотека", icon: "bi bi-music-note-list"},
    {href: "/schedule", label: "Расписание", icon: "bi bi-calendar-week"},
    {href: "/emergency", label: "Сценарии", icon: "bi bi-lightning-charge"},
    {href: "/organization", label: "Организация", icon: "bi bi-building-fill-gear"},
    {href: "/settings", label: "Настройки", icon: "bi bi-gear"},
    // {href: "/console", label: "Пульт", icon: "bi bi-phone-flip"},

];

function mapHrefToTab(href: string) {
    if (href.startsWith('/organization') || href.startsWith('/org')) return 'org'
    if (href.startsWith('/settings')) return 'settings'
    if (href.startsWith('/screens')) return 'screens'
    if (href.startsWith('/emergency')) return 'emergency'
    return 'other'
}

function isTabEnabled(hasOrg: boolean, grade: Grade, href: string): boolean {
    const tab = mapHrefToTab(href)
    const isOrgTab = tab === 'org'
    const isSettingsTab = tab === 'settings'
    const isScreensTab = tab === 'screens'
    const isEmergencyTab = tab === 'emergency'

    // 1) Нет организации — только "Организации"
    if (!hasOrg) return isOrgTab || isSettingsTab

    // 2) Правила по грейдам
    switch (grade) {
        case Grade.NONE:
            return isOrgTab || isSettingsTab || isScreensTab
        case Grade.BASE:
            return !isEmergencyTab
        case Grade.PRO:
            return true
        default:
            return false
    }
}

export default function Sidebar({collapsed, onToggle, className = ''}: Props) {
    const pathname = usePathname();
    const hasOrg = useOrganizationStore(state => state.hasOrg);
    const screenLicense = useLicenseStore(state => state.screenLicense);

    if (pathname.startsWith('/auth')) {
        return null;
    }

    const width = collapsed ? 46 : 220;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const enabledFor = useCallback(
        (href: string) => isTabEnabled(hasOrg, screenLicense, href),
        [hasOrg, screenLicense]
    );


    return (
        <div
            className={`bg-white shadow-sm d-flex flex-column sidebar ${className}`}
            style={{
                // width,
                transition: 'width .3s ease-in-out',
                overflowX: 'hidden',
                height: '100vh',
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 1040
            }}
        >
            {/* HEADER: бургер */}
            <div
                className="d-flex align-items-center"
                style={{
                    height: 80,
                    borderBottom: '1px solid #eaeaea',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    padding: collapsed ? '0 1.5rem' : '0 0.7rem',
                    transition: 'padding 0.3s ease-in-out, justify-content 0.3s ease-in-out',
                }}
            >
                {/* логотип */}
                <img
                    src="/assets/default-thumbnail.svg"
                    alt="Логотип"
                    style={{
                        width: 132,
                        height: 122,
                        opacity: collapsed ? 0 : 1,
                        transform: collapsed ? 'translateX(-10px)' : 'translateX(0)',
                        transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
                    }}
                />

                {/* кнопка-бургер */}
                <button
                    className="btn btn-outline-secondary"
                    onClick={onToggle}
                >
                    <FaBars/>
                </button>
            </div>

            {navItems.map(({href, label, icon}) => {
                const enabled = isTabEnabled(hasOrg, screenLicense, href) // всегда свежие значения
                const active = enabled && pathname === href

                return (
                    // кнопки навигации
                    <Link
                        key={href}
                        href={href}
                        onClick={(e) => {
                            if (!enabled) e.preventDefault()
                        }}
                        className={
                            'text-decoration-none d-flex align-items-center py-3 ' +
                            (active ? 'bg-light fw-bold text-dark' : 'text-secondary') +
                            (!enabled ? ' disabled' : '')
                        }
                        style={{
                            textDecoration: 'none',
                            paddingLeft: collapsed ? '0.75rem' : '1.2rem',
                            paddingRight: collapsed ? '0.75rem' : '1.2rem',
                            transition: 'padding 0.3s ease-in-out',
                            pointerEvents: enabled ? 'auto' : 'none',
                            opacity: enabled ? 1 : 0.5,
                        }}
                    >
                        <i className={`${icon} fs-5`}></i>
                        <span
                            style={{
                                textDecoration: 'none',
                                display: 'inline-block',
                                width: collapsed ? 0 : `calc(${width}px - 32px)`,
                                paddingLeft: 8,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                opacity: collapsed ? 0 : 1,
                                transition: 'width .3s ease-in-out, opacity .3s ease-in-out .1s'
                            }}
                        >
              {label}
            </span>
                    </Link>
                )
            })}        </div>
    );
};
