import React, { CSSProperties, useMemo, useState } from "react";

type SplitCount = 1 | 2 | 4;

type SplitScreenProps = {
    count: SplitCount;
    value?: number | null;
    onChange?: (index: number) => void;
    showLabels?: boolean;
    radius?: number;
    lineThickness?: number;
};

export default function SplitScreen({
                                count,
                                value,
                                onChange,
                                showLabels = true,
                                radius = 12,
                                lineThickness = 2,
                            }: SplitScreenProps) {
    const [internalSelected, setInternalSelected] = useState<number | null>(null);
    const selected = value ?? internalSelected;

    const setSelected = (idx: number) => {
        if (value === undefined) setInternalSelected(idx);
        onChange?.(idx);
    };

    const lineColor = "var(--bs-primary, #0d6efd)";

    const boxStyle: CSSProperties = {
        position: "relative",
        width: "100%",
        maxWidth: 900,
        aspectRatio: "16 / 9",
        border: "2px solid var(--bs-border-color, #dee2e6)",
        borderRadius: radius,
        background: "rgba(0,0,0,0.02)",
        overflow: "hidden",
        userSelect: "none",
    };

    const vLine: CSSProperties = {
        position: "absolute",
        top: radius,
        bottom: radius,
        left: "50%",
        width: lineThickness,
        transform: "translateX(-50%)",
        background: lineColor,
        borderRadius: 9999,
        pointerEvents: "none",
        zIndex: 2,
    };
    const hLine: CSSProperties = {
        position: "absolute",
        left: radius,
        right: radius,
        top: "50%",
        height: lineThickness,
        transform: "translateY(-50%)",
        background: lineColor,
        borderRadius: 9999,
        pointerEvents: "none",
        zIndex: 2,
    };

    const areas = useMemo(() => {
        if (count === 1) {
            return [{ top: 0, left: 0, width: "100%", height: "100%" }];
        }
        if (count === 2) {
            return [
                { top: 0, left: 0, width: "50%", height: "100%" },      // левая
                { top: 0, left: "50%", width: "50%", height: "100%" },  // правая
            ];
        }
        return [
            { top: 0, left: 0, width: "50%", height: "50%" },         // ВЛ
            { top: 0, left: "50%", width: "50%", height: "50%" },     // ВП
            { top: "50%", left: 0, width: "50%", height: "50%" },     // НЛ
            { top: "50%", left: "50%", width: "50%", height: "50%" }, // НП
        ];
    }, [count]);

    const areaCornerRadius = (idx: number): CSSProperties => {
        if (count === 1) return { borderRadius: radius };
        if (count === 2) {
            return idx === 0
                ? { borderTopLeftRadius: radius, borderBottomLeftRadius: radius }
                : { borderTopRightRadius: radius, borderBottomRightRadius: radius };
        }
        switch (idx) {
            case 0: return { borderTopLeftRadius: radius };
            case 1: return { borderTopRightRadius: radius };
            case 2: return { borderBottomLeftRadius: radius };
            case 3: return { borderBottomRightRadius: radius };
            default: return {};
        }
    };

    const baseArea: CSSProperties = {
        position: "absolute",
        cursor: "pointer",
        outline: "none",
        transition: "background 120ms ease, box-shadow 120ms ease",
        zIndex: 1,
    };

    const labelStyle: CSSProperties = {
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        fontWeight: 600,
        color: "rgba(0,0,0,0.55)",
        pointerEvents: "none",
    };

    return (
        <div style={boxStyle} role="group" aria-label="Разделение экрана">
            {count >= 2 && <div style={vLine} />}
            {count === 4 && <div style={hLine} />}

            {areas.map((a, idx) => {
                const isActive = selected === idx;
                return (
                    <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isActive}
                        aria-label={`Область ${idx + 1} из ${areas.length}`}
                        onClick={() => setSelected(idx)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelected(idx);
                            }
                        }}
                        style={{
                            ...baseArea,
                            ...a,
                            ...areaCornerRadius(idx),
                            background: isActive ? "rgba(13,110,253,0.08)" : "transparent",
                            boxShadow: isActive
                                ? "inset 0 0 0 3px var(--bs-primary, #0d6efd)"
                                : "none",
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive) (e.currentTarget.style.background = "rgba(13,110,253,0.05)");
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive) (e.currentTarget.style.background = "transparent");
                        }}
                    >
                        {showLabels && (
                            <div style={labelStyle}>
                                <span>{idx + 1}</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}