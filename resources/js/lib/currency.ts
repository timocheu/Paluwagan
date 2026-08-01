const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
});

export function parseBch(value: string): number {
    return parseFloat(value.replace(' BCH', '')) || 0;
}

export function formatPeso(bchAmount: number, rate: number): string {
    return pesoFormatter.format(bchAmount * rate);
}

export function pesoFromBchString(value: string, rate: number): string {
    return formatPeso(parseBch(value), rate);
}
