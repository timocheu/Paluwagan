import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';

export function ThemeToggle() {
    const { resolvedAppearance, updateAppearance } = useAppearance();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() =>
                updateAppearance(
                    resolvedAppearance === 'dark' ? 'light' : 'dark'
                )
            }
        >
            {resolvedAppearance === 'dark' ? (
                <Sun className="h-5 w-5" />
            ) : (
                <Moon className="h-5 w-5" />
            )}
        </Button>
    );
}