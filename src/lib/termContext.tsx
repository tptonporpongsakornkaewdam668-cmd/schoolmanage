import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Term } from './types';
import { getActiveTermStorage, setActiveTermStorage } from './termStorage';

interface TermContextType {
    activeTerm: Term | null;
    setActiveTerm: (term: Term) => void;
    reloadActiveTerm: () => Promise<void>;
    isLoading: boolean;
}

const TermContext = createContext<TermContextType | undefined>(undefined);

export function TermProvider({ children }: { children: ReactNode }) {
    const [activeTerm, setActiveTermState] = useState<Term | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadActiveTerm = async () => {
        try {
            const term = await getActiveTermStorage();
            if (term) {
                setActiveTermState(term);
            }
        } catch (error) {
            console.error('Failed to load active term:', error);
        }
    };

    useEffect(() => {
        // Load active term from storage on mount
        const initLoad = async () => {
            await loadActiveTerm();
            setIsLoading(false);
        };
        initLoad();
    }, []);

    const setActiveTerm = (term: Term) => {
        setActiveTermState(term);
        setActiveTermStorage(term);
    };

    const reloadActiveTerm = async () => {
        await loadActiveTerm();
    };

    return (
        <TermContext.Provider value={{ activeTerm, setActiveTerm, reloadActiveTerm, isLoading }}>
            {children}
        </TermContext.Provider>
    );
}

export function useTerm() {
    const context = useContext(TermContext);
    if (context === undefined) {
        throw new Error('useTerm must be used within a TermProvider');
    }
    return context;
}
