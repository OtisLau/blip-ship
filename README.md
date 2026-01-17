# Blip Ship - Autonomous CRO Agent

> **Team:** Identity
> **Hackathon:** UofTHacks 2026
> **Challenge:** Shopify Technical Challenge

An AI agent that analyzes user behavior, proposes website improvements, and deploys them—all without the owner writing a single line of code.

## Overview

Small businesses don't know how to harness analytics to improve their websites. Existing tools (Hotjar, GA, etc.) show data but leave owners to figure out what to do with it. Blip Ship closes the full loop:

```
Collect behavior → Analyze issues → Propose fixes → Implement changes → Owner approves → Deploy
```

### The Self-Improving Loop

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  TRACK   │ → │ ANALYZE  │ → │ GENERATE │ → │  PREVIEW │
│ behavior │    │ with AI  │    │  changes │    │ & approve│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     ↑                                               │
     └───────────────── DEPLOY ←────────────────────┘
```

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | **Next.js 14 (App Router)** | Handles frontend + API in one |
| Styling | **Tailwind CSS** | Fast prototyping |
| Database | **JSON files** | No setup, hackathon-friendly |
| AI | **Claude API** | Analysis + suggestion generation |
| Hosting | **Vercel** | Instant deploys |

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd blip-ship
npm install

# Create data files
mkdir -p data
echo '[]' > data/events.json
echo '[]' > data/suggestions.json

# Add your live config to data/config-live.json

# Add ANTHROPIC_API_KEY to .env.local
echo 'ANTHROPIC_API_KEY=your-key' > .env.local

# Run development server
npm run dev
```

## Project Structure

```
/app
  /store                    # Demo store (renders from config)
  /dashboard                # Owner dashboard
  /api
    /events/route.ts        # POST - receive tracking events
    /analytics/route.ts     # GET - aggregated analytics
    /analyze/route.ts       # POST - trigger AI analysis
    /config/route.ts        # GET - site config (live/preview)
    /suggestions/route.ts   # GET/POST - suggestion management

/components
  /store                    # Store UI components
  /dashboard                # Dashboard UI components
  /tracking                 # Event tracking utilities

/lib
  tracker.ts                # Event tracking utilities
  ai.ts                     # AI analysis functions
  db.ts                     # JSON file read/write

/data
  events.json               # Stored events
  config-live.json          # Current live config
  config-preview.json       # Preview config
  suggestions.json          # All suggestions
```

---

# Claude Code Workflows

This project includes pre-configured Claude Code workflows to accelerate development. These are located in `.claude/`.

## How to Use

1. Open this project in Claude Code: `cd ~/repos/blip-ship && claude`
2. Use slash commands directly in the conversation
3. Agents are automatically invoked by Claude when appropriate

---

## Slash Commands

Type these directly in Claude Code to trigger specialized workflows:

### Development

| Command | Description |
|---------|-------------|
| `/implement-code <description>` | Implement a new feature or functionality |
| `/write-tests <target>` | Write tests for specified code |
| `/refactor-code <target>` | Refactor and clean existing code |
| `/scaffold-api <spec>` | Generate API endpoint scaffolding |
| `/migrate-code <from> <to>` | Migrate code between patterns or frameworks |

### Planning & Analysis

| Command | Description |
|---------|-------------|
| `/explain-code <file/function>` | Get detailed code explanation and analysis |
| `/create-issue <description>` | Draft a comprehensive GitHub issue |
| `/assess-debt` | Analyze technical debt and get remediation plan |

### Testing & Quality

| Command | Description |
|---------|-------------|
| `/generate-tests <target>` | Generate comprehensive test harness |
| `/debug-issue <description>` | Debug and diagnose an issue |
| `/analyze-bug <description>` | Smart bug analysis with root cause identification |
| `/trace-error <error>` | Trace an error through the codebase |

### Documentation

| Command | Description |
|---------|-------------|
| `/generate-docs` | Generate project documentation |
| `/enhance-pr` | Improve pull request description |

### Security & Compliance

| Command | Description |
|---------|-------------|
| `/scan-security` | Run security scan and vulnerability assessment |
| `/audit-dependencies` | Audit dependencies for security issues |
| `/audit-accessibility` | Check accessibility compliance |

### Deployment

| Command | Description |
|---------|-------------|
| `/optimize-docker` | Optimize Docker container configuration |
| `/setup-monitoring` | Set up monitoring and observability |
| `/check-deployment` | Generate deployment checklist |

### Example Usage

```
# Implement the event tracking system
/implement-code add click tracking with rage click detection

# Debug a specific issue
/debug-issue events not being saved to JSON file

# Run security scan before deployment
/scan-security
```

---

## Agents

Agents are specialized AI assistants that Claude automatically invokes for complex tasks. You don't call them directly—Claude uses them when appropriate.

### Research Agents

| Agent | When It's Used |
|-------|----------------|
| `codebase-explorer` | Complex tasks requiring understanding of existing code, patterns, or git history |
| `external-context-researcher` | Integrating external APIs, libraries, or unfamiliar frameworks |
| `project-architect` | Starting new projects from scratch, scaffolding structure |

### Documentation Agents

| Agent | When It's Used |
|-------|----------------|
| `docs-weaver` | After implementing features or modifying APIs, generates docs with code examples |
| `project-historian` | After major changes (>500 LOC), creates checkpoint narratives with risk assessment |

### UI Agents

| Agent | When It's Used |
|-------|----------------|
| `browser-navigator` | Automated end-to-end UI testing with Playwright |
| `ux-copy-brainstormer` | Creating or refining user-facing copy, requires brand voice guidelines |

### Backend Agents

| Agent | When It's Used |
|-------|----------------|
| `migration-planner` | Database schema changes, ORM updates, storage migrations |
| `cache-strategy-architect` | Designing caching for repeated expensive operations |
| `performance-profiler` | When latency budgets are exceeded or resource spikes occur |

### Testing Agents

| Agent | When It's Used |
|-------|----------------|
| `backend-test-guardian` | After implementing backend features, when CI tests fail |
| `pre-push-validator` | Before pushing code—runs style, lint, type, test, and build checks |

### Security Agents

| Agent | When It's Used |
|-------|----------------|
| `secrets-env-auditor` | Before commits/pushes/deploys, scans for exposed credentials |
| `security-scanner` | After auth changes, dependency updates, or for scheduled security scans |

### CI/CD Agents

| Agent | When It's Used |
|-------|----------------|
| `cicd-optimizer` | When CI/CD pipeline duration exceeds targets or shows degradation |

---

## Recommended Workflows

### Full Feature Lifecycle
```
codebase-explorer → [implement] → backend-test-guardian → pre-push-validator → docs-weaver
```

### Database Evolution
```
codebase-explorer → migration-planner → [execute] → backend-test-guardian → project-historian
```

### Performance Optimization
```
performance-profiler → cache-strategy-architect → [implement] → backend-test-guardian
```

### Security Hardening
```
security-scanner → [remediate] → secrets-env-auditor → pre-push-validator
```

---

## API Reference

### `POST /api/events`
Receives tracking events from demo store.

### `GET /api/analytics`
Returns aggregated analytics data.

### `POST /api/analyze`
Triggers AI analysis and generates suggestions.

### `GET /api/config?mode=live|preview`
Returns site configuration.

### `GET /api/suggestions`
Lists all AI suggestions.

### `POST /api/suggestions/[id]/accept`
Accepts a suggestion, promotes preview to live.

### `POST /api/suggestions/[id]/reject`
Rejects a suggestion.

---

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `/pre-push-validator` before pushing
4. Create a PR with `/enhance-pr`

---

## License

MIT
