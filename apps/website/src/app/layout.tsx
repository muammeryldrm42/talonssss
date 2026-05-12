import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Talons — The OpenCode of Crypto Agents",
  description: "Open-source AI agent framework with first-class crypto support. 100+ tools, 22 agents, 12 LLM providers. Multi-LLM. Multi-chain. Self-hosted or cloud.",
  keywords: ["ai agent", "crypto", "solana", "claude", "openai", "ollama", "bags.fm", "pump.fun", "open source", "framework"],
  authors: [{ name: "Talons Protocol" }],
  openGraph: {
    title: "Open Talons — AI Agent Framework",
    description: "Open-source, crypto-first AI agent framework. 100+ tools, 22 agents, 12 LLM providers.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
