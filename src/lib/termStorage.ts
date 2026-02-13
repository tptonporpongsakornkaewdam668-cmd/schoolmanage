import { Term } from './types';
import { getActiveTerm } from './services';

const ACTIVE_TERM_KEY = 'class_companion_active_term';

export async function getActiveTermStorage(): Promise<Term | null> {
    try {
        // First, check database for active term
        const activeTerm = await getActiveTerm();
        if (activeTerm) {
            // Save to localStorage for faster subsequent loads
            localStorage.setItem(ACTIVE_TERM_KEY, JSON.stringify(activeTerm));
            return activeTerm;
        }

        // Fallback to localStorage
        const stored = localStorage.getItem(ACTIVE_TERM_KEY);
        if (stored) {
            return JSON.parse(stored) as Term;
        }
    } catch (error) {
        console.error('Failed to get active term from storage:', error);
    }
    return null;
}

export function setActiveTermStorage(term: Term): void {
    try {
        localStorage.setItem(ACTIVE_TERM_KEY, JSON.stringify(term));
    } catch (error) {
        console.error('Failed to set active term in storage:', error);
    }
}

export function clearActiveTermStorage(): void {
    try {
        localStorage.removeItem(ACTIVE_TERM_KEY);
    } catch (error) {
        console.error('Failed to clear active term from storage:', error);
    }
}
