// src/components/Web3Provider.tsx
"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { ReactNode } from "react";

import {
    getDefaultConfig,
    RainbowKitProvider,
    darkTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const config = getDefaultConfig({
    appName: "Generational Merch",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!, // set this in .env.local
    chains: [sepolia, mainnet], // sepolia first if you want that as default
    ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: "#000000",          // 🖤 black button
                        accentColorForeground: "#ffffff", // white text
                        borderRadius: "medium",
                    })}
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}