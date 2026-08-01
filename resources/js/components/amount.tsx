import { usePage } from '@inertiajs/react';
import { pesoFromBchString } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface AmountProps {
    value: string;
    className?: string;
    subClassName?: string;
}

export function Amount({ value, className, subClassName }: AmountProps) {
    const rate = usePage().props.currency.rate;

    return (
        <span className={cn('inline-flex flex-col', className)}>
            <span>{value}</span>
            {rate > 0 ? (
                <span className={cn('text-xs font-normal text-muted-foreground', subClassName)}>
                    ≈ {pesoFromBchString(value, rate)}
                </span>
            ) : null}
        </span>
    );
}
