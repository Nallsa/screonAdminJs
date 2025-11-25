"use client";

import React, {ChangeEvent, useEffect, useState} from "react";
import {DeviceStatus, ScreenData} from "@/public/types/interfaces";
import {useScreensStore} from "@/app/store/screensStore";
import "../../../public/css/styles.css"; // 👈 добавь вот так


/* ==== Типы ==== */

interface ConsoleInputProps {
    sendToBackend: (text: string) => void;
}

interface RoundButtonProps {
    label: string;
    background: string;
    onClick: () => void;
}

interface RoundMiniButtonProps {
    label: string;
    onClick: () => void;
}

interface RectButtonProps {
    text: string;
    onClick: () => void;
    width?: number | string;
    height?: number;
}

interface ScreenDropdownProps {
    screens: ScreenData[];
    onScreenSelected?: (screen: ScreenData) => void;
}

/* ==== Страница (аналог ConsoleScreen.Content) ==== */

const ConsolePage: React.FC = () => {
    // как в Kotlin: val screens by childScreensViewModel.filteredScreens.collectAsState()
    const screens = useScreensStore(s => s.activeScreens);

    // remote / key / text из стора (аналог методов ChildScreensViewModel)
    const sendKeyClick = useScreensStore(s => s.sendKeyClick);
    const sendTextEvent = useScreensStore(s => s.sendTextEvent);
    const connectWsForScreen = useScreensStore(s => s.connectWsForScreen);
    const live = useScreensStore(s => s.statusByScreen);
    const isScreenOnline = useScreensStore(s => s.isScreenOnline);
    const [onlineScreens, setOnlineScreens] = useState<ScreenData[]>([]);


    useEffect(() => {
        // берём только те экраны, для которых isScreenOnline(id) === true
        const onlyOnline = screens.filter(scr => isScreenOnline(scr.id));
        setOnlineScreens(onlyOnline);
    }, [screens, live, isScreenOnline]);


    useEffect(() => {
    }, [screens]);

    // при монтировании страницы — гарантируем подключение WS (аналог первого connectWsForScreen в VM)
    useEffect(() => {
        void connectWsForScreen();
    }, [connectWsForScreen]);

    const handleScreenSelected = (screen: ScreenData) => {
        // Дополнительный колбэк, если понадобится
        console.log("[setSelectedScreen from UI]", screen);
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <div
                style={{
                    width: 260,
                    height: 520,
                    backgroundColor: "#1E1E1E",
                    borderRadius: 32,
                    padding: 20,
                    color: "#ffffff",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Внутренняя колонка */}
                <div
                    className="console-scroll"

                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        overflowY: "auto",
                        gap: 16,
                    }}
                >
                    {/* ВЕРХНИЕ КНОПКИ (Power, Mute) */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                        }}
                    >
                        <RoundButton
                            label="Power"
                            background="#EF5350"
                            onClick={() => void sendKeyClick("POWER")}
                        />
                        <RoundButton
                            label="Mute"
                            background="#424242"
                            onClick={() => void sendKeyClick("MUTE")}
                        />
                    </div>

                    {/* ГРОМКОСТЬ */}
                    <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                        <span style={{fontSize: 12, color: "#D3D3D3"}}>VOLUME</span>

                        <div
                            style={{
                                display: "flex",
                                gap: 12,
                                width: "100%",
                            }}
                        >
                            <RectButton
                                text="-"
                                onClick={() => void sendKeyClick("VOLUME_DOWN")}
                            />
                            <RectButton
                                text="+"
                                onClick={() => void sendKeyClick("VOLUME_UP")}
                            />
                        </div>
                    </div>

                    {/* ДРОПДАУН ЭКРАНОВ (аналог ScreenDropdown(screens = screens)) */}
                    <ScreenDropdown
                        screens={onlineScreens}
                        onScreenSelected={handleScreenSelected}
                    />

                    {/* D-PAD (навигация) */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 12,
                        }}
                    >
                        <RoundMiniButton
                            label="▲"
                            onClick={() => void sendKeyClick("DPAD_UP")}
                        />

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                            }}
                        >
                            <RoundMiniButton
                                label="◀"
                                onClick={() => void sendKeyClick("DPAD_LEFT")}
                            />

                            <RectButton
                                text=""
                                onClick={() => void sendKeyClick("DPAD_CENTER")}
                                height={44}
                                width={64}
                            />

                            <RoundMiniButton
                                label="▶"
                                onClick={() => void sendKeyClick("DPAD_RIGHT")}
                            />
                        </div>

                        <RoundMiniButton
                            label="▼"
                            onClick={() => void sendKeyClick("DPAD_DOWN")}
                        />
                    </div>

                    {/* НИЖНИЙ РЯД + инпут */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            marginTop: 20,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                width: "100%",
                                gap: 8,
                            }}
                        >
                            <RectButton
                                text="Back"
                                onClick={() => void sendKeyClick("BACK")}
                            />
                        </div>

                        <ConferenceInput/>

                        <ConsoleInput
                            sendToBackend={(text) => {
                                // Kotlin: childScreensViewModel.sendTextEvent(text)
                                void sendTextEvent(text);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConsolePage;

/* ===== Компоненты ===== */

const ConsoleInput: React.FC<ConsoleInputProps> = ({sendToBackend}) => {
    const [text, setText] = useState<string>("");
    const [expanded, setExpanded] = useState<boolean>(true);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setText(value);
        sendToBackend(value); // как в Kotlin: sendTextEvent(newValue)
    };

    return (
        <div style={{width: "100%"}}>
            {/* Заголовок-индикатор */}
            <div
                onClick={() => setExpanded((prev) => !prev)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                    cursor: "pointer",
                }}
            >
                <span style={{color: "#D3D3D3", fontSize: 12}}>Console input</span>
                <span style={{color: "#D3D3D3", fontSize: 16}}>
                    {expanded ? "▾" : "▴"}
                </span>
            </div>

            {expanded && (
                <input
                    type="text"
                    value={text}
                    onChange={handleChange}
                    placeholder="Введите команду..."
                    style={{
                        width: "100%",
                        height: 40,
                        boxSizing: "border-box",
                        borderRadius: 12,
                        border: "1px solid #555555",
                        backgroundColor: "transparent",
                        color: "#FFFFFF",
                        padding: "8px 10px",
                        fontSize: 13,
                        outline: "none",
                    }}
                />
            )}
        </div>
    );
};

const RoundButton: React.FC<RoundButtonProps> = ({
                                                     label,
                                                     background,
                                                     onClick,
                                                 }) => {
    return (
        <button
            onClick={onClick}
            style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: "none",
                backgroundColor: background,
                color: "#FFFFFF",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                whiteSpace: "nowrap",
            }}
        >
            {label}
        </button>
    );
};

const RoundMiniButton: React.FC<RoundMiniButtonProps> = ({
                                                             label,
                                                             onClick,
                                                         }) => {
    return (
        <button
            onClick={onClick}
            style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "none",
                backgroundColor: "#424242",
                color: "#FFFFFF",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
            }}
        >
            {label}
        </button>
    );
};

const RectButton: React.FC<RectButtonProps> = ({
                                                   text,
                                                   onClick,
                                                   width = "100%",
                                                   height = 44,
                                               }) => {
    const widthValue = typeof width === "number" ? `${width}px` : width;

    return (
        <button
            onClick={onClick}
            style={{
                width: widthValue,
                height,
                borderRadius: 12,
                border: "none",
                backgroundColor: "#333333",
                color: "#FFFFFF",
                cursor: "pointer",
                padding: 0,
                fontSize: 14,
            }}
        >
            {text}
        </button>
    );
};


const ConferenceInput: React.FC = () => {
    const sendConference = useScreensStore(s => s.sendConference);
    const [text, setText] = useState<string>("");

    const onSend = () => {
        const v = text.trim();
        if (!v) return;
        void sendConference(v);
    };

    return (
        <div style={{width: "100%", marginTop: 8}}>
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
            }}>
                <span style={{color: "#D3D3D3", fontSize: 12}}>Ссылка на конференцию</span>
            </div>

            <div style={{display: "flex",}}>
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    style={{
                        flex: 1,
                        maxWidth: 160,
                        height: 40,
                        boxSizing: "border-box",
                        borderRadius: 12,
                        border: "1px solid #555555",
                        backgroundColor: "transparent",
                        color: "#FFFFFF",
                        padding: "8px 10px",
                        fontSize: 13,
                        outline: "none",
                        marginRight: 8,
                    }}
                />

                <button
                    onClick={onSend}
                    style={{
                        flex: 1,
                        width: 100,
                        height: 40,
                        borderRadius: 12,
                        border: "none",
                        backgroundColor: "#198754",
                        color: "#FFFFFF",
                        cursor: "pointer",
                        fontSize: 13,
                    }}
                >
                    Старт
                </button>
            </div>
        </div>
    );
};


/* ==== ScreenDropdown с логикой как в Kotlin ==== */
const ScreenDropdown: React.FC<ScreenDropdownProps> = ({
                                                           screens,
                                                           onScreenSelected,
                                                       }) => {
    const [expanded, setExpanded] = useState<boolean>(false);

    const selectedScreen = useScreensStore(s => s.selectedScreen);
    const setSelectedScreen = useScreensStore(s => s.setSelectedScreen);
    const successConnectScreen = useScreensStore(s => s.successConnectScreen);

    const hasScreens = Array.isArray(screens) && screens.length > 0;

    const handleClickItem = (screen: ScreenData) => {
        setSelectedScreen(screen);
        setExpanded(false);
        onScreenSelected?.(screen);
    };

    // 🔹 Если нет онлайн-экранов — показываем только надпись и всё
    if (!hasScreens) {
        return (
            <div style={{width: "100%"}}>
                <span style={{fontSize: 12, color: "#D3D3D3"}}>SCREEN</span>
                <div style={{height: 4}}/>

                <div
                    style={{
                        width: "100%",
                        minHeight: 44,
                        borderRadius: 12,
                        backgroundColor: "#262626",
                        border: "1px solid #555555",
                        padding: "0 12px",
                        display: "flex",
                        alignItems: "center",
                        boxSizing: "border-box",
                    }}
                >
                    <span
                        style={{
                            fontSize: 13,
                            color: "#888888",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        Нет онлайн экранов
                    </span>
                </div>
            </div>
        );
    }

    // 🔹 Обычный вариант, когда онлайн-экраны есть
    return (
        <div style={{width: "100%"}}>
            <span style={{fontSize: 12, color: "#D3D3D3"}}>SCREEN</span>
            <div style={{height: 4}}/>

            <div style={{position: "relative"}}>
                {/* Заголовок дропдауна */}
                <div
                    onClick={() => {
                        if (hasScreens) setExpanded((prev) => !prev);
                    }}
                    style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: "#262626",
                        border: "1px solid #555555",
                        padding: "0 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        boxSizing: "border-box",
                        cursor: "pointer",
                    }}
                >
                    <div style={{flex: 1, minWidth: 0}}>
                        <div
                            style={{
                                fontSize: 13,
                                color: "#FFFFFF",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {selectedScreen?.name || "Select screen"}
                        </div>

                        {selectedScreen && (
                            <div
                                style={{
                                    fontSize: 10,
                                    color: "#AAAAAA",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {selectedScreen.model} • {selectedScreen.serialNumber}
                            </div>
                        )}
                    </div>

                    <span style={{color: "#D3D3D3", marginLeft: 8}}>
                        {expanded ? "▴" : "▾"}
                    </span>
                </div>

                {/* Список */}
                {expanded && (
                    <div
                        style={{
                            position: "absolute",
                            top: "calc(100% + 4px)",
                            left: 0,
                            right: 0,
                            backgroundColor: "#FFFFFF",
                            borderRadius: 8,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                            maxHeight: 200,
                            overflowY: "auto",
                            zIndex: 100,
                        }}
                    >
                        {screens.map((screen) => (
                            <div
                                key={screen.id ?? screen.serialNumber ?? screen.name}
                                onClick={() => handleClickItem(screen)}
                                style={{
                                    padding: "8px 12px",
                                    fontSize: 13,
                                    color: "#000000",
                                    cursor: "pointer",
                                }}
                            >
                                {screen.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* статус подключения */}
            {selectedScreen && successConnectScreen && (
                <div
                    style={{
                        marginTop: 6,
                        fontSize: 11,
                        color: "#4CAF50",
                    }}
                >
                    Статус подключения к экрану: подключено
                </div>
            )}
        </div>
    );
};
