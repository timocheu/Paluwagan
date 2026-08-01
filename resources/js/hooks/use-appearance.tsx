import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

const listeners = new Set<() => void>();
let currentAppearance: Appearance = 'light';

const applyTheme = (): void => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    applyTheme();
}

export function useAppearance(): UseAppearanceReturn {
    useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'light',
    );

    const updateAppearance = (): void => {
        currentAppearance = 'light';

        applyTheme();
        notify();
    };

    return {
        appearance: currentAppearance,
        resolvedAppearance: 'light',
        updateAppearance,
    } as const;
}
