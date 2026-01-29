# NuDevLens - Demo Video Knowledge Dump

> **Purpose**: This document provides all the context needed to create a professional demo video for the Nutanix Hackathon. Target video length: ~5 minutes (2 min content + 2 min demo).

---

## 1. The Problem (What Pain Are We Solving?)

### The Core Issue: Hidden Expertise

In large engineering organizations like Nutanix, **knowledge is scattered and invisible**. When you need help with a specific part of the codebase, finding the right person to ask is surprisingly difficult.

**Common questions that are hard to answer today:**

- "Who actually understands the authentication system?"
- "Who's been working on the API layer?"
- "Who should I ask about database optimization?"

### How People Solve This Today (The Painful Way)

1. **Digging through commit histories** - Manually scrolling through GitHub, trying to figure out who touched what
2. **Searching Slack** - Hoping someone mentioned an expert in a conversation
3. **Asking around** - Playing "telephone" until you find someone who _might_ know
4. **Going through managers** - Finding a manager, waiting for them to respond, getting pointed to someone else, waiting again...

### Why This Matters

- **Time waste**: What should take minutes can take hours or even days
- **Project delays**: Waiting for the right person means work stalls
- **Frustration**: New team members feel lost, not knowing who to ask
- **Knowledge silos**: Expertise becomes trapped with individuals

### Real Pain Point at Nutanix

> _"We work on adding Telemetry to different apps in our organization. Every app has its own codebase with a different team maintaining it. When starting a new project, we first have to find and contact their managers to know who is the point of contact for code-related things, then contact that person to get information about the codebase itself. Sometimes people work across different time zones, so the waiting time can cross even days just to contact the right person."_

---

## 2. Our Solution: NuDevLens

### The One-Liner

**NuDevLens uses AI to automatically build a knowledge map of your engineering organization by analyzing GitHub activity.**

### What It Does (Simple Version)

Instead of manually tracking who knows what, NuDevLens:

1. **Reads** commit messages and code changes to understand what each person has worked on
2. **Summarizes** each contributor's expertise across all their repositories using AI
3. **Lets you ask** questions in plain English like "Who's the expert on database optimization?"

**The result: Find the right expert in seconds, not hours.**

---

## 3. How It Works (The Three Phases)

### Phase 1: Ingest (Collecting the Data)

- We pull commit data from your GitHub repositories
- This includes: who made changes, what files they changed, and what their commit messages said
- We filter out noise (like auto-generated files, images, etc.) to focus on meaningful work

### Phase 2: Analyze (AI Summarization)

The AI reads through all the raw data and creates summaries at three levels:

| Level                   | What It Summarizes                 | Example                                                                                                  |
| ----------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Commits**             | Individual code changes            | "Added authentication middleware to protect admin routes"                                                |
| **Repository Work**     | What a person did in each repo     | "John focused on security features and API development in the Identity repo"                             |
| **Contributor Profile** | Overall expertise across all repos | "John is a full-stack engineer specializing in authentication, security, and React frontend development" |

**Why three levels?** This bottom-up approach builds understanding gradually—like reading individual sentences, then paragraphs, then getting the full story.

### Phase 3: Discover (Search & Chat)

Now you can find experts two ways:

1. **Browse profiles** - See any contributor's AI-generated expertise summary
2. **Ask questions** - Natural language queries like "Who should I talk to about React performance?"

---

## 4. Key Features to Highlight

### Feature 1: AI Chat with Multi-Tool Intelligence

The chat isn't just a simple search—it's a smart assistant that uses **multiple tools** to give you the best answer.

**How it works behind the scenes:**

When you ask "Who is the expert on authentication?", the AI:

1. **Selects the right tools** - Decides it needs both "search by expertise" and "search by commit count"
2. **Runs them together** - Gets qualitative matches (who has relevant skills) AND quantitative data (who has contributed the most)
3. **Combines the results** - Synthesizes everything into one comprehensive answer
4. **Links to profiles** - Makes contributor names clickable so you can explore further

**Available Tools the AI Can Use:**

| Tool                    | What It Does                                         |
| ----------------------- | ---------------------------------------------------- |
| Search Contributors     | Finds people by expertise using meaning-based search |
| Search Repository Works | Finds specific work someone did in a repo            |
| Get Top Contributors    | Ranks people by commit count in a repo               |
| Get Contributor Stats   | Gets detailed stats about a specific person          |
| List Repositories       | Shows all available repos                            |

**Why this matters:** The AI intelligently combines multiple sources of information rather than just doing a simple keyword search. This means higher accuracy and more relevant results.

### Feature 2: Launch Chat from Anywhere

- **Floating button** - Always accessible in the corner of any page
- **Keyboard shortcut** - Quick access for power users
- Chat opens as an overlay, so you don't lose your place

### Feature 3: AI-Generated Contributor Profiles

Each contributor has a rich profile page showing:

- **Expertise summary** - AI-generated description of what they specialize in
- **Repository contributions** - Which repos they've worked on with summaries
- **Recent commits** - Their latest work with AI-generated summaries
- **Activity charts** - Visual representation of their contributions

### Feature 4: Repository Summaries

For each repository, you can see:

- **Key contributors** - Who are the main experts in this repo
- **What they worked on** - AI summaries of each person's contributions
- **Activity timeline** - When work happened

---

## 5. Use Case Personas (Real Scenarios)

### Persona 1: The Telemetry Engineer (Cross-Team Collaboration)

**Who:** Maya, a Telemetry Engineer at Nutanix
**Situation:** Maya's team needs to add telemetry tracking to a new application. She's never worked with this app's codebase before.

**Before NuDevLens:**

1. Maya finds the app's repo but doesn't know who maintains it
2. She messages the engineering manager asking who to talk to
3. Manager responds 6 hours later (different timezone): "Talk to John"
4. Maya messages John, who's on PTO
5. Two days later, John responds and connects her with the right person
6. **Total time: 2-3 days just to find the right contact**

**With NuDevLens:**

1. Maya opens NuDevLens and asks: "Who is the lead developer for the Disaster Recovery?"
2. She gets an instant answer with the contributor's profile and expertise summary
3. She clicks through to see what they've worked on and reaches out directly
4. **Total time: 30 seconds**

---

### Persona 2: The New Team Member (Onboarding)

**Who:** Alex, a new software engineer who just joined Nutanix
**Situation:** Alex is assigned to fix a bug in the identity management system but has no idea where to start or who to ask.

**Before NuDevLens:**

1. Alex spends an hour reading through the codebase
2. Gets stuck and asks in Slack: "Does anyone know about the identity management system?"
3. Gets a few responses pointing to different people
4. Messages each person, waits for responses
5. **Total time: Half a day of confusion and waiting**

**With NuDevLens:**

1. Alex searches: "Who are the experts on identity management and authentication?"
2. Gets a list of contributors with their specific expertise
3. Sees exactly what each person has worked on in that area
4. Reaches out to the most relevant person with specific context
5. **Total time: 2 minutes**

---

### Persona 3: The New Engineering Manager (Inheriting a Team)

**Who:** Sarah, a newly promoted Engineering Manager who just inherited a team of 12 developers
**Situation:** Sarah's previous manager left the company. She now leads a team she's never worked with directly and has no idea who specializes in what.

**Before NuDevLens:**

1. Sarah has no documentation about team members' expertise (it was all in the old manager's head)
2. She schedules 1:1s with all 12 team members to understand their skills — takes 2 weeks
3. A critical bug comes in on day 3, but she doesn't know who to assign it to
4. She asks in the team Slack: "Who knows about the payment integration?" — feels awkward as a new manager
5. **Total time: Weeks to build mental map of team expertise, with blind spots along the way**

**With NuDevLens:**

1. On day one, Sarah opens NuDevLens and searches for each team member's name
2. Instantly sees AI-generated summaries of what each person has worked on and their areas of expertise
3. When the critical bug comes in, she searches: "Who has experience with payment integration?"
4. Gets an immediate answer and assigns the right person confidently
5. **Total time: 15 minutes to understand team capabilities on day one**

---

### Persona 4: The Product Manager (Staffing a Project)

**Who:** David, a Product Manager planning a new feature
**Situation:** The new feature requires expertise in both frontend React performance AND backend API optimization. David needs to staff the project with the right engineers.

**Before NuDevLens:**

1. David asks multiple managers for recommendations
2. Gets biased recommendations based on who each manager knows personally
3. Manager A says "Talk to Mike" but doesn't explain Mike's actual experience
4. David has no way to verify if Mike is truly the best fit or just the most available
5. **Total time: Multiple days of back-and-forth, with uncertainty about the final choice**

**With NuDevLens:**

1. David gets a recommendation from a manager: "Mike would be good for this"
2. He searches for Mike's profile in NuDevLens to verify the recommendation
3. He sees Mike's AI-generated expertise summary and actual contributions — confirms Mike has relevant React experience
4. He then searches: "Who has expertise in API performance and caching?" to find additional team members
5. He discovers someone the managers didn't mention who has deep backend optimization experience
6. David now has a verified, well-rounded team based on actual contribution data — not just opinions
7. **Total time: 10 minutes, with confidence in the staffing decisions**

---

## 6. The Technology

### How We Make Search "Smart"

**Traditional search:** Matches exact keywords

- Search "authentication" → Only finds pages with that exact word
- Miss results that say "login security" or "user verification"

**NuDevLens search:** Understands meaning

- Search "authentication" → Also finds "login flow", "user security", "identity verification"
- The AI understands that these concepts are related

**How?** We convert text into "embeddings" (think of it as a numerical fingerprint that captures meaning). Similar meanings have similar fingerprints, so we can find related content even without exact keyword matches.

### Why Answers Are Fast

All the AI analysis happens **before** you ask a question:

- We pre-process all commits when data is ingested
- Summaries are already generated and stored
- When you search, we're just looking up pre-computed information

This is like having a librarian who's already read and indexed every book, rather than one who reads books on-demand when you ask a question.

---

## 7. Summary Talking Points

### The Problem in One Sentence

Finding the right expert in a large engineering organization wastes hours or days that should take seconds.

### The Solution in One Sentence

NuDevLens uses AI to analyze GitHub activity and create a searchable knowledge map of who knows what.

### Why It's Better Than Alternatives

| Alternative            | Limitation                            | NuDevLens Advantage                |
| ---------------------- | ------------------------------------- | ---------------------------------- |
| Asking around          | Depends on who you know               | Searches across entire org         |
| Reading commit history | Time-consuming, no summaries          | AI-generated expertise summaries   |
| Slack search           | Hit or miss, depends on conversations | Based on actual code contributions |
| Internal wikis         | Always outdated                       | Automatically updated from GitHub  |

### Key Differentiators

1. **Automatic** - No manual data entry or tagging required
2. **AI-Powered** - Uses smart summarization, not just keyword matching
3. **Multi-Tool Intelligence** - Chat uses multiple search strategies for best results
4. **Pre-Computed** - Answers come instantly because analysis is done ahead of time
5. **Actionable** - Links directly to profiles so you can reach out immediately

---

## 8. Demo Flow Suggestion

1. **Open with the problem** (30 seconds)
   - "In large organizations, finding the right expert is surprisingly hard..."

2. **Show the solution** (30 seconds)
   - Quick overview of the dashboard
   - Show the AI chat floating button

3. **Demo: Ask a question** (45 seconds)
   - Type: "Who is the expert on [specific technology]?"
   - Show the AI thinking/using multiple tools
   - Show the clickable results

4. **Demo: Explore a profile** (30 seconds)
   - Click through to a contributor profile
   - Show the AI-generated summary
   - Show their repository contributions

5. **Wrap up with impact** (15 seconds)
   - "What used to take days now takes seconds"

---

## 9. Appendix: Technical Details (For Reference Only)

_Note: This section is for the demo creator's reference. This level of detail may not need to be in the video._

### Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Database:** PostgreSQL with pgvector (for similarity search)
- **AI:** OpenAI-compatible API (Nutanix AI) for text generation, Ollama for embeddings
- **Framework:** T3 Stack with tRPC for type-safe APIs

### AI Tools Available to the Chat

1. `search-contributors` - Semantic search across contributor profiles
2. `search-repository-works` - Semantic search for work in specific repos
3. `get-top-contributors` - Get contributors ranked by commit count
4. `get-contributor-stats` - Get stats for a specific person
5. `list-repositories` - List all available repositories

### Data Pipeline

1. Fetch from GitHub API (commits, contributors, repos)
2. Store in PostgreSQL
3. Generate AI summaries (3 levels: commits → repo work → contributor)
4. Generate embeddings for similarity search
5. Serve through web interface

---

_Document created for NuDevLens Hackathon Demo Video_
