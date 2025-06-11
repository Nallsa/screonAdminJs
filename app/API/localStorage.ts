export function addValueInStorage(key: string, value: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
    }
}

export function getValueInStorage(key: string): string | null {
    if (typeof window === 'undefined') return null;

    const value = localStorage.getItem(key);
    if (value === null || value === 'error') return null;

    return value;
}

export function delValueInStorage(key: string): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
    }
}
