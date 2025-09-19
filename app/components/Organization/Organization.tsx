/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */



export function InitialsAvatar({ text, size }: { text: string; size: number }) {
    const initials = text
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');

    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                backgroundColor: '#DEE4F7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2E3A59',
                fontWeight: 'bold',
                fontSize: size / 4,
            }}
        >
            {initials}
        </div>
    );
}