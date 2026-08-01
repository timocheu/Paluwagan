import { Head, Link } from '@inertiajs/react';
import type { MouseEvent } from 'react';
import {
    ArrowRight,
    CheckCircle2,
    Database,
    FileText,
    Layers,
    Lock,
    Play,
    ShieldCheck,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react';

const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Security', href: '#security' },
    { label: 'About', href: '#about' },
];

const features = [
    {
        icon: FileText,
        title: 'Transparent Contributions',
        description:
            'Every contribution is recorded and verifiable.',
    },
    {
        icon: ShieldCheck,
        title: 'Smart Contract Security',
        description:
            'Automated fund management powered by CashScript.',
    },
    {
        icon: Users,
        title: 'Community Savings',
        description:
            'Create and manage blockchain-based savings groups.',
    },
];

const steps = [
    {
        number: '01',
        title: 'Create Group',
        description:
            'Set up a savings circle with your members, contribution amount, and schedule.',
    },
    {
        number: '02',
        title: 'Members Contribute',
        description:
            'Everyone sends their contribution to the shared pot on the Bitcoin Cash network.',
    },
    {
        number: '03',
        title: 'Smart Contract Verifies',
        description:
            'CashScript contracts verify every payment automatically — no middleman required.',
    },
    {
        number: '04',
        title: 'Automatic Payout',
        description:
            'The pot is released to the next recipient on schedule, recorded on-chain forever.',
    },
];

const trustMetrics = [
    {
        value: '100%',
        label: 'On-Chain Contributions',
    },
    {
        value: '24/7',
        label: 'Fund Visibility',
    },
    {
        value: 'Automated',
        label: 'Payout Verification',
    },
];

function scrollToSection(event: MouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault();

    const target = document.querySelector(href);

    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function Logo() {
    return (
        <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#635BFF]">
                <Wallet className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-[#0A2540]">
                Paluwagan
            </span>
        </Link>
    );
}

function Navigation() {
    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-[#0A2540]/5 bg-[#F6F9FC]/80 backdrop-blur-xl">
            <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
                <Logo />

                <div className="hidden items-center gap-8 md:flex">
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            onClick={(e) => scrollToSection(e, link.href)}
                            className="text-sm font-medium text-[#0A2540]/70 transition-colors hover:text-[#0A2540]"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/batches"
                        className="hidden items-center gap-2 rounded-lg border border-[#0A2540]/10 bg-white px-4 py-2 text-sm font-medium text-[#0A2540] transition-colors hover:border-[#0A2540]/20 sm:inline-flex"
                    >
                        Manager
                        <ArrowRight className="h-4 w-4" strokeWidth={2} />
                    </Link>
                    <Link
                        href="/batches"
                        className="rounded-lg bg-[#0A2540] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0A2540]/90"
                    >
                        Launch App
                    </Link>
                </div>
            </nav>
        </header>
    );
}

function Hero() {
    return (
        <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(circle at top left, #c4b5fd, transparent 35%), radial-gradient(circle at top right, #93c5fd, transparent 35%), #f8fafc',
                }}
            />
            <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2 lg:px-8">
                <div>
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0A2540]/10 bg-white/70 px-3 py-1 text-sm text-[#0A2540]/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#635BFF]" />
                        Powered by Bitcoin Cash smart contracts
                    </div>

                    <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-[#0A2540] sm:text-5xl lg:text-[64px]">
                        Modernizing Group Savings Through Blockchain Technology
                    </h1>

                    <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#0A2540]/70">
                        A transparent and secure platform for community savings,
                        powered by Bitcoin Cash smart contracts.
                    </p>

                    <div className="mt-10 flex flex-wrap items-center gap-4">
                        <Link
                            href="/batches"
                            className="inline-flex items-center gap-2 rounded-lg bg-[#635BFF] px-6 py-3.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-[#635BFF]/90"
                        >
                            Get Started
                            <ArrowRight className="h-4 w-4" strokeWidth={2} />
                        </Link>
                        <a
                            href="#how-it-works"
                            onClick={(e) => scrollToSection(e, '#how-it-works')}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#0A2540]/10 bg-white px-6 py-3.5 text-base font-medium text-[#0A2540] transition-colors hover:border-[#0A2540]/20"
                        >
                            <Play className="h-4 w-4" strokeWidth={2} />
                            View Demo
                        </a>
                    </div>
                </div>

                <DashboardPreview />
            </div>
        </section>
    );
}

function DashboardPreview() {
    return (
        <div className="relative">
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-[#00D4FF]/20 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-[#635BFF]/20 blur-2xl" />

            <div className="relative rounded-2xl border border-[#0A2540]/10 bg-white p-8 shadow-2xl shadow-[#0A2540]/10">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-[#0A2540]/60">
                            Total Pot Balance
                        </p>
                        <p className="mt-1 text-4xl font-semibold tracking-tight text-[#0A2540]">
                            ₱125,000
                        </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#635BFF]/10">
                        <TrendingUp
                            className="h-6 w-6 text-[#635BFF]"
                            strokeWidth={2}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-[#0A2540]/5 bg-[#F6F9FC] px-4 py-3">
                        <div className="flex items-center gap-3">
                            <Users className="h-4 w-4 text-[#635BFF]" />
                            <span className="text-sm text-[#0A2540]/70">
                                Members
                            </span>
                        </div>
                        <span className="text-sm font-semibold text-[#0A2540]">
                            12
                        </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-[#0A2540]/5 bg-[#F6F9FC] px-4 py-3">
                        <div className="flex items-center gap-3">
                            <Layers className="h-4 w-4 text-[#00D4FF]" />
                            <span className="text-sm text-[#0A2540]/70">
                                Next Payout
                            </span>
                        </div>
                        <span className="text-sm font-semibold text-[#0A2540]">
                            Aug 15
                        </span>
                    </div>
                    <div className="rounded-xl border border-[#0A2540]/5 bg-[#F6F9FC] px-4 py-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-[#0A2540]/70">
                                Progress
                            </span>
                            <span className="text-sm font-semibold text-[#0A2540]">
                                80%
                            </span>
                        </div>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#0A2540]/10">
                            <div className="h-full w-[80%] rounded-full bg-[#635BFF]" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Features() {
    return (
        <section id="features" className="scroll-mt-16 bg-white py-24 lg:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-4xl font-semibold tracking-tight text-[#0A2540] lg:text-5xl">
                        Everything your savings group needs
                    </h2>
                    <p className="mt-4 text-lg text-[#0A2540]/70">
                        Built on Bitcoin Cash, designed for communities.
                    </p>
                </div>

                <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="rounded-2xl border border-[#0A2540]/5 bg-[#F6F9FC] p-8 transition-shadow hover:shadow-lg hover:shadow-[#0A2540]/5"
                        >
                            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                <feature.icon
                                    className="h-6 w-6 text-[#635BFF]"
                                    strokeWidth={1.75}
                                />
                            </div>
                            <h3 className="text-xl font-semibold tracking-tight text-[#0A2540]">
                                {feature.title}
                            </h3>
                            <p className="mt-3 leading-relaxed text-[#0A2540]/70">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function HowItWorks() {
    return (
        <section id="how-it-works" className="scroll-mt-16 bg-[#F6F9FC] py-24 lg:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-4xl font-semibold tracking-tight text-[#0A2540] lg:text-5xl">
                        How it works
                    </h2>
                    <p className="mt-4 text-lg text-[#0A2540]/70">
                        From group creation to automatic payout in four simple
                        steps.
                    </p>
                </div>

                <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
                    {steps.map((step, index) => (
                        <div key={step.number} className="relative">
                            <p className="text-6xl font-semibold tracking-tight text-[#635BFF]/20">
                                {step.number}
                            </p>
                            <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#0A2540]">
                                {step.title}
                            </h3>
                            <p className="mt-3 leading-relaxed text-[#0A2540]/70">
                                {step.description}
                            </p>
                            {index < steps.length - 1 && (
                                <ArrowRight className="absolute top-2 -right-5 hidden h-5 w-5 text-[#0A2540]/20 lg:block" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Security() {
    return (
        <section id="security" className="scroll-mt-16 bg-white py-24 lg:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                    <div>
                        <h2 className="text-4xl font-semibold tracking-tight text-[#0A2540] lg:text-5xl">
                            Built for transparency and accountability.
                        </h2>
                        <p className="mt-6 text-lg leading-relaxed text-[#0A2540]/70">
                            No hidden ledgers, no trust required. Every
                            contribution and payout is recorded on the Bitcoin
                            Cash blockchain for anyone to verify.
                        </p>

                        <div className="mt-10 space-y-5">
                            {[
                                {
                                    title: 'Fully auditable ledger',
                                    description:
                                        'Every contribution is public and permanent.',
                                },
                                {
                                    title: 'Custody-free by design',
                                    description:
                                        'Funds live in smart contracts, never on our servers.',
                                },
                                {
                                    title: 'Verifiable payouts',
                                    description:
                                        'Each payout is a signed on-chain transaction.',
                                },
                            ].map((item) => (
                                <div
                                    key={item.title}
                                    className="flex items-start gap-3"
                                >
                                    <CheckCircle2
                                        className="mt-0.5 h-5 w-5 shrink-0 text-[#635BFF]"
                                        strokeWidth={2}
                                    />
                                    <div>
                                        <p className="font-medium text-[#0A2540]">
                                            {item.title}
                                        </p>
                                        <p className="text-[#0A2540]/70">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -top-8 -left-8 h-24 w-24 rounded-full bg-[#635BFF]/10 blur-2xl" />
                        <div className="rounded-2xl border border-[#0A2540]/10 bg-[#F6F9FC] p-8">
                            <div className="mb-8 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <ShieldCheck
                                        className="h-5 w-5 text-[#635BFF]"
                                        strokeWidth={2}
                                    />
                                </div>
                                <div>
                                    <p className="font-semibold text-[#0A2540]">
                                        Smart Contract Status
                                    </p>
                                    <p className="text-sm text-emerald-600">
                                        Active &amp; verified
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { label: 'Total locked', value: '9.6 BCH' },
                                    { label: 'Active members', value: '12' },
                                    { label: 'Next recipient', value: 'Member 3' },
                                ].map((row) => (
                                    <div
                                        key={row.label}
                                        className="flex items-center justify-between rounded-xl border border-[#0A2540]/5 bg-white px-4 py-3"
                                    >
                                        <span className="text-sm text-[#0A2540]/70">
                                            {row.label}
                                        </span>
                                        <span className="text-sm font-semibold text-[#0A2540]">
                                            {row.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ProductShowcase() {
    return (
        <section id="about" className="scroll-mt-16 bg-[#F6F9FC] py-24 lg:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-4xl font-semibold tracking-tight text-[#0A2540] lg:text-5xl">
                        Your whole savings circle, one dashboard
                    </h2>
                    <p className="mt-4 text-lg text-[#0A2540]/70">
                        Track the pot, contributions, members, and payouts from
                        a single view.
                    </p>
                </div>

                <div className="relative mt-16">
                    <div className="absolute -top-10 left-1/2 h-40 w-[80%] -translate-x-1/2 rounded-full bg-[#635BFF]/10 blur-3xl" />

                    <div className="relative rounded-t-2xl border border-[#0A2540]/10 bg-[#0A2540]">
                        <div className="flex items-center gap-2 px-6 py-4">
                            <div className="flex gap-1.5">
                                <span className="h-3 w-3 rounded-full bg-[#0A2540]/30" />
                                <span className="h-3 w-3 rounded-full bg-[#0A2540]/30" />
                                <span className="h-3 w-3 rounded-full bg-[#0A2540]/30" />
                            </div>
                            <div className="mx-auto flex items-center gap-2 rounded-lg bg-white/10 px-4 py-1 text-sm text-white/70">
                                <Lock className="h-3.5 w-3.5" />
                                app.paluwagan.ph/dashboard
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-b-2xl border border-t-0 border-[#0A2540]/10 bg-white p-8">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            <div className="rounded-2xl border border-[#0A2540]/5 bg-[#F6F9FC] p-6">
                                <div className="flex items-center gap-2 text-sm text-[#0A2540]/60">
                                    <Database className="h-4 w-4 text-[#635BFF]" />
                                    Total Pot Balance
                                </div>
                                <p className="mt-3 text-3xl font-semibold tracking-tight text-[#0A2540]">
                                    ₱125,000
                                </p>
                            </div>
                            <div className="rounded-2xl border border-[#0A2540]/5 bg-[#F6F9FC] p-6">
                                <div className="flex items-center gap-2 text-sm text-[#0A2540]/60">
                                    <FileText className="h-4 w-4 text-[#00D4FF]" />
                                    Contribution History
                                </div>
                                <p className="mt-3 text-3xl font-semibold tracking-tight text-[#0A2540]">
                                    48 payments
                                </p>
                            </div>
                            <div className="rounded-2xl border border-[#0A2540]/5 bg-[#F6F9FC] p-6">
                                <div className="flex items-center gap-2 text-sm text-[#0A2540]/60">
                                    <Users className="h-4 w-4 text-[#635BFF]" />
                                    Active Members
                                </div>
                                <p className="mt-3 text-3xl font-semibold tracking-tight text-[#0A2540]">
                                    12
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function FooterCta() {
    return (
        <section className="bg-[#0A2540] py-24 lg:py-32">
            <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
                <h2 className="text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                    Ready to modernize community savings?
                </h2>
                <p className="mt-6 text-lg text-white/70">
                    Create your first savings circle today. Transparent,
                    secure, and powered by Bitcoin Cash.
                </p>
                <div className="mt-10">
                    <Link
                        href="/batches"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#635BFF] px-7 py-3.5 text-base font-medium text-white shadow-lg shadow-[#635BFF]/25 transition-colors hover:bg-[#635BFF]/90"
                    >
                        Launch App
                        <ArrowRight className="h-4 w-4" strokeWidth={2} />
                    </Link>
                </div>
            </div>
        </section>
    );
}

function Footer() {
    return (
        <footer className="border-t border-white/10 bg-[#0A2540] pb-12">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row lg:px-8">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#635BFF]">
                        <Wallet className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                    </div>
                    <span className="font-semibold text-white">Paluwagan</span>
                </div>
                <div className="flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            onClick={(e) => scrollToSection(e, link.href)}
                            className="text-sm text-white/60 transition-colors hover:text-white"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
                <p className="text-sm text-white/40">
                    © {new Date().getFullYear()} Paluwagan
                </p>
            </div>
        </footer>
    );
}

export default function Home() {
    return (
        <>
            <Head title="Paluwagan — Modern Group Savings" />

            <div className="min-h-screen bg-[#F6F9FC]">
                <Navigation />
                <main>
                    <Hero />
                    <Features />
                    <HowItWorks />
                    <Security />
                    <ProductShowcase />
                    <FooterCta />
                </main>
                <Footer />
            </div>
        </>
    );
}
