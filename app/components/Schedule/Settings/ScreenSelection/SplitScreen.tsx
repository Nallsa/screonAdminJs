import React from "react";


export type ZoneIndex = 0 | 1 | 2 | 3;
export type SplitCount = 1 | 2 | 4;

type Rect = { top: number | string; left: number | string; width: number | string; height: number | string };

type SplitScreenProps = {
    count: SplitCount;
    value?: ZoneIndex | null;
    onChange?: (z: ZoneIndex | null) => void;
    showLabels?: boolean;
    radius?: number;
    lineThickness?: number;
    width?: number | string;
    height?: number | string;
    style?: React.CSSProperties;
};

const ZONES_BY_COUNT: Record<SplitCount, readonly ZoneIndex[]> = {
    1: [0],
    2: [0, 1],
    4: [0, 1, 2, 3],
} as const;

const AREAS_BY_COUNT: Record<SplitCount, readonly Rect[]> = {
    1: [{top: 0, left: 0, width: "100%", height: "100%"}],
    2: [
        {top: 0, left: 0, width: "50%", height: "100%"},       // левая (0)
        {top: 0, left: "50%", width: "50%", height: "100%"},   // правая (1)
    ],
    4: [
        {top: 0, left: 0, width: "50%", height: "50%"},        // ВЛ (0)
        {top: 0, left: "50%", width: "50%", height: "50%"},    // ВП (1)
        {top: "50%", left: 0, width: "50%", height: "50%"},    // НЛ (2)
        {top: "50%", left: "50%", width: "50%", height: "50%"} // НП (3)
    ],
} as const;

export default function SplitScreen({
                                        count,
                                        value,
                                        onChange,
                                        showLabels = true,
                                        radius = 12,
                                        lineThickness = 2,
                                        width = 260,
                                        height = 150,
                                        style,
                                    }: SplitScreenProps) {
    const [internalSelected, setInternalSelected] = React.useState<ZoneIndex | null>(null);
    const selected: ZoneIndex | null = value ?? internalSelected;

    const setSelected = (idx: ZoneIndex) => {
        if (value === undefined) setInternalSelected(idx);
        onChange?.(idx);
    };

    const lineColor = "var(--bs-primary, #0d6efd)";

    const boxStyle: React.CSSProperties = {
        position: "relative",
        width,
        ...(height ? {height} : {aspectRatio: "16 / 9"}),
        aspectRatio: "16 / 9",
        border: "2px solid var(--bs-border-color, #dee2e6)",
        borderRadius: radius,
        background: "rgba(0,0,0,0.02)",
        overflow: "hidden",
        userSelect: "none",
    };

    const vLine: React.CSSProperties = {
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
    const hLine: React.CSSProperties = {
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

    const zones = React.useMemo<readonly ZoneIndex[]>(() => ZONES_BY_COUNT[count], [count]);
    const areas = React.useMemo<readonly Rect[]>(() => AREAS_BY_COUNT[count], [count]);

    const areaCornerRadius = (idx: ZoneIndex): React.CSSProperties => {
        if (count === 1) return {borderRadius: radius};
        if (count === 2) {
            return idx === 0
                ? {borderTopLeftRadius: radius, borderBottomLeftRadius: radius}
                : {borderTopRightRadius: radius, borderBottomRightRadius: radius};
        }
        switch (idx) {
            case 0:
                return {borderTopLeftRadius: radius};
            case 1:
                return {borderTopRightRadius: radius};
            case 2:
                return {borderBottomLeftRadius: radius};
            case 3:
                return {borderBottomRightRadius: radius};
        }
    };

    const baseArea: React.CSSProperties = {
        position: "absolute",
        cursor: "pointer",
        outline: "none",
        transition: "background 120ms ease, box-shadow 120ms ease",
        zIndex: 1,
    };

    const labelStyle: React.CSSProperties = {
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
            {count >= 2 && <div style={vLine}/>}
            {count === 4 && <div style={hLine}/>}

            {zones.map((z) => {
                const a = areas[z];
                const isActive = selected === z;
                return (
                    <div
                        key={z}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isActive}
                        aria-label={`Область ${z + 1} из ${zones.length}`}
                        onClick={() => setSelected(z)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelected(z);
                            }
                        }}
                        style={{
                            ...baseArea,
                            ...a,
                            ...areaCornerRadius(z),
                            background: isActive ? "rgba(13,110,253,0.08)" : "transparent",
                            boxShadow: isActive ? "inset 0 0 0 3px var(--bs-primary, #0d6efd)" : "none",
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
                                <span>{z + 1}</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
