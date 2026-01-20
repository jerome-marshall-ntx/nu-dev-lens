# NuDevLens

## The Problem

In large engineering organizations, **knowledge is scattered**. When you need help with a specific part of the codebase, finding the right person to ask can be surprisingly difficult. Who actually understands the authentication system? Who's been working on the API layer?

Today, answering these questions means **digging through commit histories, searching Slack, or asking around** until you find someone who might know. This wastes time, delays projects, and creates frustration.

At Nutanix, with our large engineering organization and multiple repositories, **knowledge silos have formed naturally** as teams have grown, and valuable expertise has become invisible.

---

## Our Solution

**NuDevLens** uses AI to automatically build a knowledge map of your engineering organization by analyzing GitHub activity.

Instead of manually tracking who knows what, NuDevLens:
- **Reads commit messages and issue discussions** to understand what each person has worked on
- **Summarizes each contributor's expertise** across all their repositories
- **Lets you ask questions in plain English** like "Who's the expert on database optimization?"

The result: **Find the right expert in seconds, not hours.**

---

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   1. INGEST     │────▶│   2. ANALYZE    │────▶│   3. DISCOVER   │
│                 │     │                 │     │                 │
│  Pull commits,  │     │  AI summarizes  │     │  Ask questions  │
│  issues from    │     │  work at every  │     │  in plain       │
│  GitHub         │     │  level          │     │  English        │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Phase 1: Ingest** - We pull commit and issue data from your GitHub repositories.

**Phase 2: Analyze** - AI reads through the raw data and creates summaries at three levels:
- Individual commits and issues
- A contributor's work in each repository
- An overall profile of each contributor's expertise

**Phase 3: Discover** - You can now browse contributor profiles or simply ask: "Who should I talk to about React performance?"

---

## Key Features

- **AI-Generated Contributor Profiles** - Automatically understand what each engineer specializes in
- **Repository Contribution Summaries** - See who worked on what within each repo
- **Natural Language Search** - Ask questions like you would to a colleague
- **Fast Queries** - All analysis is pre-computed, so answers come instantly
- **Clickable Results** - AI responses link directly to contributor profiles

---

## Who Is This For?

- **Engineering Managers** - Quickly find who has expertise in a specific area
- **New Team Members** - Discover who to ask about unfamiliar code
- **Product Managers** - Understand team capabilities and knowledge distribution
- **Anyone** who's ever wondered "Who should I ask about this?"

---

*NuDevLens - Stop searching, start asking.*
