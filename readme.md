# Sidebets

**On-chain wagers for off-chain chaos — spun up right from your social feed.**

---

## 🛠 Use Case

Sidebets brings **prediction markets to your social graph** — frictionless, fast, and fun.

- You’re in a Telegram group, Discord group or Farcaster thread arguing about whether Trump will tweet tomorrow or if Solana flips Ethereum.
- Someone types `/sidebet 100 USDC Trump tweets tomorrow YES/NO`.
- Instantly, a smart contract gets spun up, and users can join the bet from the chat.
- After the outcome, the market resolves via trusted oracles or a decentralized resolution protocol.

**No dApp-switching, no wallet friction — just pure social betting.**

---

## 🛠️ Tech Stack

| **Frontend** | Mini apps for Farcaster (Warpcast), Telegram bots, Discord bots

Optional web dashboard (Next.js + TailwindCSS) |
| --- | --- |
| **Backend** | Node.js + Vercel functions or Fastify for Telegram webhooks

Redis/PostgreSQL for session/cache/storage |
| **Blockchain / Smart Contracts** | Solidity smart contracts (custom betting market factory)

Hardhat or Foundry for dev/deploy

Monad (EVM-compatible)

USDC or other stablecoins on Monad |
| **Wallet/Auth** | Reown, Privy, or embedded wallet via Telegram login |
| **Oracles / Resolution Layer** | Oracle

Manual resolution via vote or API-triggered settlement |
| **AI Tools** | GPT-4/Claude for generating market descriptions, summaries

v0.dev or Galileo AI for fast frontend scaffolds

Cursor IDE for codegen and smart contract iteration |

---

## 🧱 Dev Sprint Steps

### 1. 💡 Ideation

- Use GPT to explore different user flows for placing a bet via chat interfaces.
- Map possible resolution strategies (centralized API or oracles).
- Define MVP scope: market creation, joining a bet, resolution.

### 2. 🎨 UI/UX Design

- Farcaster Mini App: modal UI for creating/joining sidebets
- Telegram Bot UX: command-based flow (`/sidebet`, inline keyboard)
- Optional web interface for viewing bet history & dashboards
- Use Galileo AI or Figma to prototype quickly

### 3. ⚙️ Scaffolding

- Telegram Bot (Node.js + Telegraf.js or grammY)
- Farcaster Mini App (Next.js)
- Web wallet with embedded auth (Privy or Reown)
- Smart contract factory scaffold in Hardhat/Foundry

### 4. 🔐 Smart Contracts

- **SidebetFactory.sol** – deploys individual bet contracts
- **Sidebet.sol** – handles deposits, odds, lock time, resolution logic
- Support for:
    - YES/NO markets
    - Fixed odds or pari-mutuel
    - Oracle/resolver address

### 5. 🤖 Oracle / Resolution

- MVP: centralized backend resolves based on public API (e.g., sports API, Twitter API)
- Next: integrate Oracle or Snapshot for crowd resolution

### 6. 🔌 Integration

- Telegram: bot to create, join, and resolve bets
- Farcaster: publish bets via Mini App and allow joining via one-tap
- Web: optional dashboard for browsing and tracking bets

### 7. 📣 Marketing

- Launch with weekly viral sidebets: “Will Trump tweet this week?”, “Will BTC hit $75K?”
- Run bet creation contests: "Create the best meme-worthy Sidebet."
- Meme templates, shareable bet receipts (like on Friend.tech or Fantasy)
- Collaborate with crypto influencers and Farcaster pages

---

## 🚀 Hype Hook

> "Turn trash talk into real stakes."
> 
> 
> Drop a `/sidebet` in your group chat — settle it with crypto.
> 
> No spreadsheets. No Discord mods. Just pure, social speculation — on-chain and on demand.
>