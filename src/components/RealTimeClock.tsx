import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function RealTimeClock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, []);

    return (
        <div className="flex items-center gap-2 text-primary font-mono font-bold bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 shadow-sm">
            <Clock className="h-4 w-4 animate-pulse" />
            <span className="text-sm">
                {time.toLocaleDateString('th-TH', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                })}
            </span>
        </div>
    );
}
