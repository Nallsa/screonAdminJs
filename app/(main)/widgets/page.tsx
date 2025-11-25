"use client";

import { useMemo, useState } from "react";
import "./widgets.css";

const WIDGETS = [
    {
        id: "weather",
        name: "Weather",
        category: "Инфо",
        description: "Компактный виджет прогноза погоды на сегодня и несколько дней.",
        tags: ["погода", "temperature", "forecast"],
        preview: "☀️ Сегодня: +21° · Ясно\n🌧 Завтра: +18° · Небольшой дождь",
    },
    {
        id: "clock",
        name: "Clock",
        category: "Инфо",
        description: "Цифровые часы с текущим временем и датой.",
        tags: ["time", "часы"],
        preview: "14:27\nПн, 24 ноября",
    },
    {
        id: "notes",
        name: "Notes",
        category: "Продуктивность",
        description: "Мини-виджет для быстрых заметок прямо на дашборде.",
        tags: ["todo", "заметки", "notes"],
        preview: "• Созвон с командой\n• Проверить отчёты\n• Купить кофе",
    },
    {
        id: "quote",
        name: "Quote of the day",
        category: "Фан",
        description: "Каждый день новая мотивационная цитата.",
        tags: ["цитаты", "motivation"],
        preview: "“The future depends on what you do today.”",
    },
    {
        id: "stats",
        name: "KPI Stats",
        category: "Аналитика",
        description: "Ключевые метрики: конверсии, лиды, выручка — в одном месте.",
        tags: ["analytics", "dashboard", "stats"],
        preview: "CTR: 4.2% · Leads: 128 · MRR: $12k",
    },
];

export default function WidgetsPage() {
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState(WIDGETS[0]?.id ?? null);

    const filteredWidgets = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return WIDGETS;
        return WIDGETS.filter((w) => {
            const haystack = (
                w.name +
                " " +
                w.category +
                " " +
                w.description +
                " " +
                w.tags.join(" ")
            ).toLowerCase();
            return haystack.includes(q);
        });
    }, [search]);

    const selectedWidget = useMemo(
        () =>
            WIDGETS.find((w) => w.id === selectedId) ??
            filteredWidgets[0] ??
            null,
        [selectedId, filteredWidgets]
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
            <div className="mx-auto max-w-7xl px-4 py-8 lg:py-10">
                {/* Header */}
                <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="mt-3 text-2xl font-semibold md:text-3xl">
                            Библиотека UI-виджетов
                        </h1>
                    </div>

                    {/* Поиск */}
                    <div className="w-full max-w-xs">
                        <label className="mb-1 block text-xs font-medium text-slate-400">
                            Поиск по названию, описанию или тегам
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Поиск"
                                className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 px-9 py-2 text-sm outline-none shadow-lg shadow-black/40 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Найдено: {filteredWidgets.length} виджет(ов)
                        </p>
                    </div>
                </header>

                {/* Content */}
                <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
                    {/* Левая часть — сетка виджетов */}
                    <section>
                        {filteredWidgets.length === 0 ? (
                            <div
                                className="d-flex align-items-center justify-content-center text-muted small"
                                style={{ height: 140 }}
                            >
                                Ничего не найдено по запросу «{search}».
                            </div>
                        ) : (
                            <div className="row g-3">
                                {filteredWidgets.map((widget) => {
                                    const isActive = widget.id === selectedWidget?.id;

                                    return (
                                        <div className="col-12 col-sm-6 col-xl-3 mb-2" key={widget.id}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedId(widget.id)}
                                                className="btn p-0 w-100 text-start border-0 bg-transparent"
                                            >
                                                <div
                                                    className={
                                                        "card widget-card h-100 position-relative overflow-hidden " +
                                                        (isActive ? "widget-card-active" : "")
                                                    }
                                                >
                                                    <div className="widget-card-accent" />

                                                    <div className="card-body d-flex flex-column py-2 px-3">
                                                        <div className="d-flex align-items-start justify-content-between mb-1">
                                                            <div className="d-flex align-items-start gap-2">
                                                                <div className="widget-icon d-flex align-items-center justify-content-center">
                                                                    {widget.id === "weather" && (
                                                                        <i className="bi bi-cloud-sun" />
                                                                    )}
                                                                    {widget.id === "clock" && (
                                                                        <i className="bi bi-clock-history" />
                                                                    )}
                                                                    {widget.id === "notes" && (
                                                                        <i className="bi bi-journal-text" />
                                                                    )}
                                                                    {widget.id === "quote" && (
                                                                        <i className="bi bi-chat-quote" />
                                                                    )}
                                                                    {widget.id === "stats" && (
                                                                        <i className="bi bi-bar-chart-line" />
                                                                    )}
                                                                    {!["weather", "clock", "notes", "quote", "stats"].includes(
                                                                        widget.id
                                                                    ) && <i className="bi bi-grid-3x3-gap" />}
                                                                </div>
                                                                <div>
                                                                    <h2
                                                                        className="fw-semibold mb-0"
                                                                        style={{ fontSize: "0.9rem" , color: "white" }}
                                                                    >
                                                                        {widget.name}
                                                                    </h2>
                                                                    <span
                                                                        className="badge rounded-pill bg-dark text-white-50 mt-1"
                                                                        style={{ fontSize: "0.6rem" }}
                                                                    >
                                    {widget.category}
                                  </span>
                                                                </div>
                                                            </div>

                                                            <span
                                                                className={
                                                                    "small " +
                                                                    (isActive ? "text-success" : "text-muted")
                                                                }
                                                                style={{ fontSize: "0.7rem" }}
                                                            >
                                {isActive ? "Выбран" : "Выбрать"}
                              </span>
                                                        </div>

                                                        <p
                                                            className="text-muted mb-1"
                                                            style={{ fontSize: "0.75rem" }}
                                                        >
                                                            {widget.description}
                                                        </p>

                                                        <div className="widget-preview mb-1">
                                                            <pre className="mb-0">{widget.preview}</pre>
                                                        </div>

                                                        <div className="mt-auto pt-1 d-flex flex-wrap gap-1">
                                                            {widget.tags.map((tag) => (
                                                                <span
                                                                    key={tag}
                                                                    className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis"
                                                                    style={{ fontSize: "0.65rem" }}
                                                                >
                                  #{tag}
                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Правая часть — подробный предпросмотр */}
                    {/*<aside className="lg:sticky lg:top-24">*/}
                    {/*    <div*/}
                    {/*        className={*/}
                    {/*            "widget-preview-panel flex h-full flex-col p-5 " +*/}
                    {/*            (selectedWidget ? "widget-preview-panel-active" : "")*/}
                    {/*        }*/}
                    {/*    >*/}
                    {/*        {selectedWidget ? (*/}
                    {/*            <>*/}
                    {/*                /!* Заголовок + иконка *!/*/}
                    {/*                <div className="widget-preview-header mb-4 flex items-start justify-between gap-3">*/}
                    {/*                    <div className="flex items-start gap-3">*/}
                    {/*                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-lg shadow-black/50">*/}
                    {/*                            {selectedWidget.id === "weather" && (*/}
                    {/*                                <i className="bi bi-cloud-sun text-lg text-emerald-300" />*/}
                    {/*                            )}*/}
                    {/*                            {selectedWidget.id === "clock" && (*/}
                    {/*                                <i className="bi bi-clock-history text-lg text-emerald-300" />*/}
                    {/*                            )}*/}
                    {/*                            {selectedWidget.id === "notes" && (*/}
                    {/*                                <i className="bi bi-journal-text text-lg text-emerald-300" />*/}
                    {/*                            )}*/}
                    {/*                            {selectedWidget.id === "quote" && (*/}
                    {/*                                <i className="bi bi-chat-quote text-lg text-emerald-300" />*/}
                    {/*                            )}*/}
                    {/*                            {selectedWidget.id === "stats" && (*/}
                    {/*                                <i className="bi bi-bar-chart-line text-lg text-emerald-300" />*/}
                    {/*                            )}*/}
                    {/*                            {!["weather", "clock", "notes", "quote", "stats"].includes(*/}
                    {/*                                selectedWidget.id*/}
                    {/*                            ) && (*/}
                    {/*                                <i className="bi bi-grid-3x3-gap text-lg text-emerald-300" />*/}
                    {/*                            )}*/}
                    {/*                        </div>*/}

                    {/*                        <div>*/}
                    {/*                            <h2 className="text-xl font-semibold tracking-tight">*/}
                    {/*                                {selectedWidget.name}*/}
                    {/*                            </h2>*/}
                    {/*                            <p className="mt-1 text-xs text-slate-400">*/}
                    {/*                                {selectedWidget.description}*/}
                    {/*                            </p>*/}
                    {/*                        </div>*/}
                    {/*                    </div>*/}

                    {/*                    <span className="widget-meta-badge mt-1 inline-flex items-center rounded-full bg-slate-900/90 px-3 py-1 text-[11px] text-slate-200 border border-slate-700">*/}
                    {/*  {selectedWidget.category}*/}
                    {/*</span>*/}
                    {/*                </div>*/}

                    {/*                /!* Карточка предпросмотра *!/*/}
                    {/*                <div className="widget-preview-card rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-900 to-slate-950 p-4 mb-4">*/}
                    {/*                    <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">*/}
                    {/*  <span className="font-medium uppercase tracking-wide">*/}
                    {/*    Предпросмотр виджета*/}
                    {/*  </span>*/}
                    {/*                        <span className="font-mono text-[10px] text-slate-500">*/}
                    {/*    ID: {selectedWidget.id}*/}
                    {/*  </span>*/}
                    {/*                    </div>*/}

                    {/*                    <div className="widget-preview-content rounded-xl border border-slate-700/80 bg-slate-950/95 px-4 py-3 text-sm text-slate-100 whitespace-pre-line font-mono text-[12px] leading-relaxed">*/}
                    {/*                        {selectedWidget.preview}*/}
                    {/*                    </div>*/}
                    {/*                </div>*/}

                    {/*                /!* Метаданные *!/*/}
                    {/*                <div className="space-y-3 text-xs text-slate-400 mb-4">*/}
                    {/*                    <div>*/}
                    {/*                        <span className="font-medium text-slate-300">Категория:</span>{" "}*/}
                    {/*                        <span>{selectedWidget.category}</span>*/}
                    {/*                    </div>*/}
                    {/*                    <div>*/}
                    {/*                        <span className="font-medium text-slate-300">Теги:</span>*/}
                    {/*                        <div className="mt-1 flex flex-wrap gap-1.5">*/}
                    {/*                            {selectedWidget.tags.map((tag) => (*/}
                    {/*                                <span*/}
                    {/*                                    key={tag}*/}
                    {/*                                    className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] text-slate-200 border border-slate-700/80"*/}
                    {/*                                >*/}
                    {/*        #{tag}*/}
                    {/*      </span>*/}
                    {/*                            ))}*/}
                    {/*                        </div>*/}
                    {/*                    </div>*/}
                    {/*                </div>*/}

                    {/*                /!* Кнопка действия *!/*/}
                    {/*                <div className="mt-auto pt-2">*/}
                    {/*                    <button*/}
                    {/*                        type="button"*/}
                    {/*                        onClick={() => {*/}
                    {/*                            console.log("Selected widget:", selectedWidget);*/}
                    {/*                        }}*/}
                    {/*                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"*/}
                    {/*                    >*/}
                    {/*                        <i className="bi bi-plus-circle" />*/}
                    {/*                        Использовать этот виджет*/}
                    {/*                    </button>*/}
                    {/*                </div>*/}
                    {/*            </>*/}
                    {/*        ) : (*/}
                    {/*            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-500">*/}
                    {/*                <span className="text-2xl">📦</span>*/}
                    {/*                <p>Выбери виджет слева, чтобы увидеть предпросмотр.</p>*/}
                    {/*            </div>*/}
                    {/*        )}*/}
                    {/*    </div>*/}
                    {/*</aside>*/}
                </div>
            </div>
        </div>
    );
}
