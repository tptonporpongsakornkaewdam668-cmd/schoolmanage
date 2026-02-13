import { useState, useEffect } from 'react';
import { useTerm } from '@/lib/termContext';
import { getTerms, setActiveTerm as setActiveTermService } from '@/lib/services';
import { Term } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function TermSelector() {
    const { activeTerm, setActiveTerm, reloadActiveTerm } = useTerm();
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [terms, setTerms] = useState<Term[]>([]);
    const [loading, setLoading] = useState(false);

    const isStudent = currentUser?.role === 'student';

    const loadTerms = async () => {
        try {
            // Load terms list first
            const data = await getTerms();
            setTerms(data);
        } catch (error) {
            console.error('Error loading terms:', error);
        }
    };

    const loadActiveTermData = async () => {
        try {
            // Then reload active term from database
            await reloadActiveTerm();
        } catch (error) {
            console.error('Error loading active term:', error);
        }
    };

    useEffect(() => {
        loadTerms();
        loadActiveTermData();

        // Listen for custom event when terms are updated
        const handleTermsUpdated = async () => {
            // Reload both terms list and active term
            await loadTerms();
            await loadActiveTermData();
        };

        window.addEventListener('termsUpdated', handleTermsUpdated);

        return () => {
            window.removeEventListener('termsUpdated', handleTermsUpdated);
        };
    }, []);

    const handleTermChange = async (termId: string) => {
        if (!termId || isStudent) return;

        setLoading(true);
        try {
            // Update in database
            await setActiveTermService(termId);

            // Update in context
            const selectedTerm = terms.find(t => t.id === termId);
            if (selectedTerm) {
                setActiveTerm({ ...selectedTerm, isActive: true });
                toast({
                    title: 'สำเร็จ',
                    description: `เปลี่ยนเป็น ${selectedTerm.name} แล้ว`,
                });
            }

            // Reload page to refresh data
            window.location.reload();
        } catch (error) {
            toast({
                title: 'เกิดข้อผิดพลาด',
                description: 'ไม่สามารถเปลี่ยนเทอมได้',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    if (terms.length === 0) {
        return (
            <Badge variant="outline" className="gap-2">
                <Calendar className="h-3 w-3" />
                ยังไม่มีเทอม
            </Badge>
        );
    }

    if (isStudent) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg border border-border">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{activeTerm?.name || 'ไม่ได้เลือกเทอม'}</span>
                <Badge variant="outline" className="text-[10px] ml-1 bg-background flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" />
                    Locked
                </Badge>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select
                value={activeTerm?.id || ''}
                onValueChange={handleTermChange}
                disabled={loading}
            >
                <SelectTrigger className="w-[200px] h-9">
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>กำลังโหลด...</span>
                        </div>
                    ) : (
                        <SelectValue placeholder="เลือกเทอม" />
                    )}
                </SelectTrigger>
                <SelectContent>
                    {terms.map((term) => (
                        <SelectItem key={term.id} value={term.id}>
                            <div className="flex items-center gap-2">
                                <span>{term.name}</span>
                                {term.isActive && (
                                    <Badge variant="default" className="ml-2 bg-green-600 text-xs py-0 px-1">
                                        ปัจจุบัน
                                    </Badge>
                                )}
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
