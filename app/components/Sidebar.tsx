'use client';
import Link from "next/link";
import {usePathname} from 'next/navigation';
import {getValueInStorage} from "@/app/API/localStorage";
// import {FaBars} from "react-icons/fa";
import {useSettingsStore} from "@/app/store/settingsStore";
import {FaBars} from "react-icons/fa";

interface Props {
    collapsed: boolean
    onToggle: () => void
}


const navItems = [
    {href: "/screens", label: "Экраны", icon: "bi bi-display"},
    {href: "/playlists", label: "Плейлисты", icon: "bi bi-collection-play"},
    {href: "/library", label: "Библиотека", icon: "bi bi-music-note-list"},
    {href: "/schedule", label: "Расписание", icon: "bi bi-calendar-week"},
    {href: "/emergency", label: "Сценарии", icon: "bi bi-lightning-charge"},
    {href: "/organization", label: "Организация", icon: "bi bi-building-fill-gear"},

];
export default function Sidebar({collapsed, onToggle}: Props) {
    const pathname = usePathname();
    const organizationId = useSettingsStore(state => state.organizationId)

    if (pathname.startsWith('/auth')) {
        return null
    }

    const width = collapsed ? 46 : 220


    return (

        <div
            className="bg-white shadow-sm d-flex flex-column"
            style={{
                width,
                transition: 'width .3s ease-in-out',
                overflowX: 'hidden',
                height: '100vh',
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 1040
            }}>
            {/* HEADER: бургер */}
            <div
                className="d-flex align-items-center"
                style={{
                    height: 80,
                    borderBottom: '1px solid #eaeaea',
                    // если свернуто — центрируем бургер, иначе — логотип слева, бургер справа
                    justifyContent: collapsed ? 'center' : 'space-between',
                    // когда свернуто — небольшой единый паддинг, когда развернуто — побольше
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
                        // плавно появляем / скрываем
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

                const active = pathname === href;

                return (
                    //кнопки навигации
                    <Link
                        key={href}
                        href={href}

                        className={
                            'text-decoration-none d-flex align-items-center w-100 py-3 ' +
                            (active ? 'bg-light fw-bold text-dark' : 'text-secondary')
                        }
                        style={{
                            textDecoration: 'none',
                            paddingLeft: collapsed ? '0.75rem' : '1.2rem',
                            paddingRight: collapsed ? '0.75rem' : '1.2rem',
                            transition: 'padding 0.3s ease-in-out'
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
                                transition:
                                    'width .3s ease-in-out, ' +
                                    'opacity .3s ease-in-out .1s'
                            }}
                        >
                {label}
              </span>
                    </Link>
                )
            })}
        </div>
    );
};

