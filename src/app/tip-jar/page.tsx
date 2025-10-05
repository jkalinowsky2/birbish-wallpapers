// src/app/tip-jar/page.tsx
"use client";

import { useState } from "react";

type Wallet = { label: string; address: string; note?: string };

const WALLETS: Wallet[] = [
    // 🔁 Replace these with your real addresses
    { label: "Ethereum / EVM", address: "0x7F0F062304C41e05D746bC24e90fddCF5247Bd80" },
    { label: "Solana", address: "6FxDqWXV4FSxBcYeeAiZVcbXtbNd2hDRHfF538VAtiUK" },
    // { label: "Bitcoin", address: "YOUR_BTC_ADDRESS_HERE" },
    { label: "Base (EVM)", address: "0x7F0F062304C41e05D746bC24e90fddCF5247Bd80" },
];

export default function TipJarPage() {
    const [copied, setCopied] = useState<string | null>(null);

    const copy = async (addr: string) => {
        try {
            await navigator.clipboard.writeText(addr);
            setCopied(addr);
            setTimeout(() => setCopied(null), 1200);
        } catch {
            // no-op
        }
    };

    return (
        <div className="mx-auto max-w-3xl p-6">
            <h1 className="text-2xl font-semibold mb-2">Tip Jar</h1>
            <p className="text-neutral-600 mb-6">
                My wallpaper and banner builders will always be free to use. <br />
                <br />
                If you&apos;d like the support the costs to create the content, maintain and develop the tools, and host the files, tips are appreciated.
                <br />
                <br />
                Below are my wallet addresses. <br />
                <br />
                Thank you! <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-JK
            </p>

            <div className="rounded-2xl border bg-white shadow-sm divide-y">
                {WALLETS.map((w) => (
                    <div
                        key={w.label}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-4"
                    >
                        {/* Wallet Label */}
                        <div className="font-medium text-sm sm:text-base">{w.label}</div>

                        {/* Wallet Address + Copy Button */}
                        <div className="flex items-center gap-2">
                            <code className="text-[13px] break-all text-neutral-800 bg-neutral-50 px-2 py-1 rounded grow">
                                {w.address}
                            </code>
                            <button
                                className="btn btn-ghost whitespace-nowrap text-sm"
                                onClick={() => copy(w.address)}
                                title="Copy to clipboard"
                            >
                                {copied === w.address ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {/* <div className="rounded-2xl border bg-white shadow-sm divide-y">
                {WALLETS.map((w) => (
                    <div key={w.label} className="flex items-center gap-3 p-4">
                        <div className="min-w-40 font-medium">{w.label}</div>
                        <code className="text-[13px] break-all text-neutral-800 bg-neutral-50 px-2 py-1 rounded grow">
                            {w.address}
                        </code>
                        <button
                            className="btn btn-ghost whitespace-nowrap"
                            onClick={() => copy(w.address)}
                            title="Copy to clipboard"
                        >
                            {copied === w.address ? "Copied!" : "Copy"}
                        </button>
                    </div>
                ))}
            </div> */}

            <p className="text-xs text-neutral-500 mt-4">
                As always, double-check the address matches before sending. Generational Merch is not responsible for lost or transfered funds.
            </p>
        </div>
    );
}