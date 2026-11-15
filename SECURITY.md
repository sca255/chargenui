# Security & Operational Guidelines

This document outlines the security architecture, deployment considerations, and vulnerability reporting procedures for **CharGenUI**.

---

## 1. Self-Hosted Architecture & Deployment Model

CharGenUI is designed and distributed exclusively as **self-hosted, local-first software**. 
- **No Central Service**: The developers do not run, maintain, or monitor a centralized backend, cloud database, user registry, or content-hosting service.
- **Local Control**: All configuration, generated character data, prompt caches, and session logs reside on the operator's machine or self-hosted server environment.
- **Operator Ownership**: Users install and manage their own instance, and maintain full administrative responsibility over the hosting environment, access controls, network perimeter, and runtime configuration.

---

## 2. Network Exposure & Host Binding

### Interface Binding (`0.0.0.0`)
- By default, the CharGenUI HTTP server binds to `0.0.0.0` on port `3333` (configurable via the `PORT` environment variable).
- **Network Implication**: Binding to `0.0.0.0` allows the service to accept incoming connections across all local network interfaces (e.g., LAN, virtual adapters, container bridges, or VPN interfaces). It is **not restricted to `127.0.0.1` (localhost)**.
- **Public Exposure Risks**: If a machine running CharGenUI is directly connected to the public internet, has ports forwarded on a router, or runs on an unfirewalled virtual private server (VPS), the web UI and API endpoints (`/api/*`) will be reachable by remote parties.
- **Deployment Recommendation**:
  - For local-only use, operate behind a firewall or configure a local reverse proxy (e.g. Caddy, Nginx) binding to `127.0.0.1`.
  - If sharing over a local network or VPN (e.g. Tailscale, WireGuard), enforce network-level authentication and ingress firewall rules.
  - Never expose CharGenUI to the public internet without an authenticating reverse proxy, TLS termination, and IP access restrictions.

---

## 3. API Key & Credential Handling

- **Local Storage (`localStorage`)**: In the web UI, third-party API credentials (such as OpenAI, OpenRouter, Anthropic, or Cloudflare API tokens) configured by the user in the Settings modal are stored in the client browser's `localStorage` (`chargen_provider_config`, `chargen_search_config`, `chargen_decision_config`).
- **Environment Variables**: Server-level keys (e.g., `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `DECISION_MODEL_API_KEY`) can optionally be supplied via environment variables or a local `.env` file.
- **Credential Protection**:
  - The `/api/env-keys` endpoint only returns boolean status flags (`hasGemini`, `hasOpenAI`, etc.) indicating presence, and does not disclose raw secret strings.
  - Operators should never commit `.env` files or share browser profiles containing sensitive API keys. `.gitignore` is pre-configured to ignore `.env`, `*.private.json`, and local configurations.

---

## 4. External Provider Data Transmission

CharGenUI provides optional connectors to external third-party AI APIs (including Google Gemini, Anthropic, OpenAI, OpenRouter, and Cloudflare Workers AI):
- When an external cloud provider is selected by the user, submitted character descriptions, generation prompts, and uploaded reference images are transmitted across the network to that provider's API endpoints.
- When local engines (such as `llama-server`, Ollama, ComfyUI, or `sd.cpp`) are configured, inference remains entirely within the local host/network.
- Operators and users are responsible for reviewing what data is submitted to external commercial APIs and verifying that their usage complies with their own privacy requirements and the third-party providers' terms of service.

---

## 5. Subprocess Execution & Plugin Sandboxing

- **Subprocess Spawns**: Tool execution (e.g. `ffmpeg`, `avifenc`, `magick`, `lua`) uses parameterized argument arrays without shell string evaluation (`shell=True` is avoided).
- **JavaScript Plugins**: Custom JS plugins in `plugins/installed/` run inside an isolated Node.js `node:vm` context with a 5000ms execution timeout and strictly allowlisted deterministic globals (`Math`, `Date`, `JSON`, etc.). Filesystem, process, and socket APIs are not exposed to the VM.
- **Lua Plugins**: Lua plugins are dispatched to a separate Lua interpreter subprocess. Operators should inspect third-party `.lua` scripts before placing them in the plugins directory.

---

## 6. Reporting a Security Vulnerability

If you discover a security issue or vulnerability in CharGenUI:
- Please report it responsibly via **GitHub Security Advisories** at:  
  [https://github.com/sca255/chargenui/security/advisories/new](https://github.com/sca255/chargenui/security/advisories/new)
- Alternatively, open an issue labeled `security` on the GitHub issue tracker for non-sensitive public inquiries.
- Please provide a detailed description of the issue, reproduction steps, and potential impact. Reports will be investigated promptly.
