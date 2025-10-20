## Complete Conceptual Knowledge Map

### **Architecture: The Three-Phase System**

**Phase 1: Data Ingestion**

- **Input:** JSON file from GitHub (using existing Python script or similar)
- **Process:** Parse JSON → Insert into PostgreSQL via Drizzle ORM
- **Output:** Database with raw data, empty summary fields
- **Key concept:** This is a one-time bulk load. Design for idempotency (can run multiple times safely)

**Phase 2: AI Summarization (CLI Tool)**

- **Input:** Database records with empty summaries
- **Process:** Level 1 → Level 2 → Level 3 (sequential phases, parallel within phases)
- **Output:** Database with all summary fields populated
- **Key concept:** This is expensive and slow. Design for resumability (if it crashes, can continue where it left off)

**Phase 3: API Serving + Frontend**

- **Input:** User requests
- **Process:** Fast database reads, stream LLM responses for queries
- **Output:** Rendered UI with pre-computed summaries
- **Key concept:** This is fast and cheap. No AI processing except chat queries.

---

### **Data Model: Understanding the Relationships**

**The Core Entities:**

1. **Repository** - A GitHub repo

   - Has many contributors (through RepositoryWork)
   - Summary: "What is this repo about?"

2. **Contributor** - A GitHub user

   - Has many repository contributions (through RepositoryWork)
   - Summary: "Who is this person as an engineer?" (Level 3)

3. **RepositoryWork** - The join table with business logic

   - Belongs to one Repository and one Contributor
   - Has many Issues and Commits
   - Summary: "What did this person do in THIS repo?" (Level 2)

4. **Issue** - A GitHub issue the contributor worked on

   - Belongs to one RepositoryWork
   - Contains raw JSON data from GitHub
   - Summary: "What was this issue about technically?" (Level 1)

5. **Commit** - A code commit by the contributor
   - Belongs to one RepositoryWork
   - Contains raw JSON including diff patches
   - Summary: "What technical change did this commit make?" (Level 1)

**Critical relationship understanding:**

- Issues and Commits don't directly belong to Contributors
- They belong to the RepositoryWork (the specific relationship)
- This allows the same contributor to have different summaries in different repos

---

### **AI Processing Pipeline: The Dependency Chain**

**Level 1: Atomic Summaries (Parallelizable)**

Process all Issues:

- Input: `issue.raw_data` (JSON with title, body, labels, state)
- LLM Task: Extract technical facts
- Output: 2-3 sentence summary → `issue.summary`
- Temperature: 0.3 (factual)
- Max tokens: ~100

Process all Commits:

- Input: `commit.raw_data` (JSON with message, files_changed, diff_patch)
- LLM Task: Describe technical change, mention specific functions/files
- Output: 1-2 sentence summary → `commit.summary`
- Temperature: 0.3 (factual)
- Max tokens: ~100

**Why parallel works:** Each issue/commit is independent. No commit summary depends on another commit summary.

**Level 2: Repository Work Synthesis (Parallelizable after Level 1)**

Process all RepositoryWork:

- Input: All issue.summary + all commit.summary for this specific RepositoryWork
- LLM Task: Identify patterns, group types of work, describe focus areas
- Output: 2-4 sentence synthesis → `repository_work.summary`
- Temperature: 0.4 (pattern recognition)
- Max tokens: ~250

**Why parallel works:** Each RepositoryWork is independent. One person's work in Repo A doesn't affect another person's work in Repo B.

**Level 3: Contributor Profile (Parallelizable after Level 2)**

Process all Contributors:

- Input: All repository_work.summary for this contributor across ALL repos
- LLM Task: Infer overall expertise, identify specializations, assess breadth vs depth
- Output: 3-5 sentence profile → `contributor.summary`
- Temperature: 0.5 (inferential)
- Max tokens: ~350

**Why parallel works:** Each contributor's profile is independent.

**The Dependency:**

```
Level 1 (all done) → Level 2 (all done) → Level 3 (all done)
```

You cannot start Level 2 until ALL Level 1 is complete. You cannot start Level 3 until ALL Level 2 is complete.

---

### **CLI Tool Architecture Concepts**

**The Tool's Responsibilities:**

1. **Database Connection Management**

   - Open connection, process items, close cleanly
   - Handle connection pooling for parallel processing

2. **Work Distribution**

   - Identify items with empty summaries
   - Divide work among parallel workers (e.g., 8 workers)
   - Each worker processes a subset independently

3. **Progress Tracking**

   - Count total items to process
   - Report progress every 10% or 100 items
   - Show elapsed time, estimated remaining time

4. **Error Handling**

   - API rate limits → log and continue with next item
   - API timeouts → log and continue
   - Network errors → retry or skip
   - Database errors → fail fast (data corruption risk)

5. **Resumability**
   - Only process items where summary is empty or null
   - If tool crashes, next run picks up where it left off
   - Idempotent: safe to run multiple times

**Parallelization Strategy:**

- Use Promise.all for batching (e.g., 8 concurrent requests)
- Be respectful of API rate limits
- Consider exponential backoff if rate limited

---

### **Natural Language Query System Concepts**

**The Chat Query Flow:**

1. **User Input:** "Who's the expert on React components?"

2. **Context Assembly:**

   - Query database for ALL data
   - Format into structured prompt:

     ```
     Repositories: [list all with summaries]
     Contributors: [list all with:
       - Overall summary
       - For each repo they worked on:
         - Work summary
         - Key issue summaries
         - Key commit summaries
     ]

     User Question: {user's question}
     ```

3. **LLM Reasoning:**

   - The LLM reads the entire knowledge graph
   - Identifies contributors whose summaries match the query
   - Explains its reasoning
   - Uses `<contributor id="X">Name</contributor>` markup

4. **Streaming Response:**

   - Backend streams tokens as they arrive from LLM
   - Frontend renders incrementally
   - User sees "thinking" in real-time

5. **Frontend Parsing:**
   - Detect `<contributor id="X">` tags in markdown
   - Convert to clickable links
   - Links navigate to contributor detail page

**Key insight:** You're not searching text. You're giving the LLM a structured knowledge base and asking it to reason about it. The summaries make this feasible within token limits.

---

### **Database Design Considerations**

**Schema Fields to Track:**

Every entity needs:

- `id` (primary key)
- `created_at` (when record was created)
- `updated_at` (when record was last modified)
- `summary` (text field, initially empty/null)

**Why timestamps matter:**

- Track data freshness
- Show "last updated" in UI
- Enable incremental updates (only process new data)

**Why default empty summaries:**

- CLI tool can query for `WHERE summary IS NULL OR summary = ''`
- Makes resumability trivial
- Clear indicator of processing state

**JSON Fields:**

- Store raw GitHub API responses in `raw_data` JSON field
- Preserves original data for re-processing
- Allows future enhancements without re-fetching from GitHub

---

### **API Design Concepts**

**Endpoint 1: GET /api/data**

- Returns: Entire knowledge graph (repositories + contributors with nested data)
- Use: Frontend loads once on mount, caches in memory
- Performance: Acceptable for small-to-medium orgs (< 1000 contributors)
- Future: Add pagination/filtering for larger scale

**Endpoint 2: POST /api/chat (streaming)**

- Input: User's question
- Process: Assemble context + call LLM + stream response
- Output: Server-Sent Events or chunked response
- Use: Natural language expert discovery

**Endpoint 3: GET /api/contributors/:id**

- Returns: Single contributor with all details
- Use: Detail page (if not using cached data from /api/data)
- Optional: If frontend already has all data in memory

**Design philosophy:** Start simple (one big query), optimize later (pagination, filtering) if needed.

---

### **Frontend State Management Concepts**

**The Data Loading Pattern:**

1. **On App Mount:**

   - Fetch from `/api/data`
   - Store in memory (React state/context or TanStack Router loader)
   - Set loading state to false

2. **Throughout App:**

   - All pages read from in-memory data
   - No additional API calls for basic navigation
   - Fast, offline-capable browsing

3. **For Chat:**
   - Separate API call to `/api/chat` with streaming
   - Independent from cached data

**Why this works:**

- Data changes infrequently (only when summaries regenerated)
- Single load + client-side filtering is faster than multiple API calls
- Simplifies code (no loading states on every page)

---

### **Vercel AI SDK Integration Concepts**

**For Summary Generation (CLI Tool):**

Use `generateText()` for non-streaming, complete responses:

- Input: System prompt + formatted data
- Output: Complete summary string
- Store in database

**For Chat Queries (API Endpoint):**

Use `streamText()` for real-time responses:

- Input: System prompt + entire knowledge graph + user question
- Output: Stream of text chunks
- Forward to frontend via HTTP streaming

**Key differences:**

- CLI tool doesn't need streaming (no user waiting)
- Chat needs streaming (user experience)
- Both use same LLM, different SDK methods

---

### **Cost and Performance Mental Models**

**One-Time Costs (Phase 2 - CLI Tool):**

- If you have 1000 commits, 500 issues, 100 RepositoryWorks, 50 contributors
- Total LLM calls: 1000 + 500 + 100 + 50 = 1,650 calls
- Average input: ~500 tokens, output: ~150 tokens
- Total: ~1 million tokens (~$0.50-$5 depending on model)
- Time: 1-4 hours depending on parallelization and rate limits

**Ongoing Costs (Phase 3 - Runtime):**

- Each chat query: ~10,000-50,000 tokens (entire knowledge graph)
- Cost per query: ~$0.01-$0.10
- Database reads: negligible cost
- Hosting: normal web app costs

**Optimization strategy:**

- Pre-compute everything possible (Phase 2)
- Serve cached data at runtime (Phase 3)
- Only use LLM for chat queries (can't be pre-computed)

---

### **Type Safety Strategy**

**The Flow of Types:**

1. **Define database schema** (Drizzle): This is source of truth
2. **Infer TypeScript types** from schema: Drizzle does this automatically
3. **Export types** to shared package: Available to API and frontend
4. **API responses** use these types: Type-safe serialization
5. **Frontend consumes** with full type info: Type-safe components

**Key concept:** You define the shape once (in database schema). TypeScript ensures consistency everywhere else automatically.

**Benefits:**

- Refactor database → TypeScript errors show what breaks
- IDE autocomplete works everywhere
- No runtime "undefined property" errors (caught at compile time)
- API contracts enforced at compile time

---

### **Error Handling Philosophy**

**During Data Ingestion (Phase 1):**

- Fail fast on schema errors (data corruption risk)
- Log malformed JSON, skip record, continue
- Validate required fields before inserting

**During AI Processing (Phase 2):**

- Gracefully handle API failures
- Log errors, continue with next item
- Don't fail entire batch because one item fails
- Mark failed items somehow (null summary vs empty string vs error message)

**During Runtime (Phase 3):**

- Show friendly error messages to users
- Retry failed API calls (chat queries)
- Fallback to cached data if possible
- Never crash the app

---

### **The Minimal Viable Product (MVP) Scope**

Based on your choices, here's what you're building:

**In Scope:**

1. Database schema with 5 tables (Repository, Contributor, RepositoryWork, Issue, Commit)
2. CLI tool to ingest JSON → PostgreSQL
3. CLI tool to generate summaries (3 levels, parallel processing)
4. API endpoint to serve all data
5. API endpoint to handle chat queries (streaming)
6. Frontend: Dashboard with stats
7. Frontend: Contributor list page
8. Frontend: Contributor detail page
9. Frontend: Repository list page
10. Frontend: Repository detail page
11. Frontend: Chat interface (floating widget)

**Out of Scope (explicitly deferred):**

- Graph visualization
- Voice chat integration
- Admin dashboard for triggering summaries
- Background job processing
- Incremental updates (always full regeneration)

---

## Final Conceptual Checklist

Before you start building, ensure you understand:

- ✅ **The three phases** are separate systems (ingestion → processing → serving)
- ✅ **The hierarchical summarization** builds knowledge bottom-up (atomic → synthesis → profile)
- ✅ **The join table has business logic** (RepositoryWork.summary is critical)
- ✅ **Level dependencies** prevent parallel processing across levels
- ✅ **CLI tools are separate** from the web application
- ✅ **Summaries are pre-computed**, not generated on-demand
- ✅ **Chat queries use entire knowledge graph** as LLM context
- ✅ **Custom markup** creates interactivity in LLM responses
- ✅ **Type safety flows** from database schema through the entire stack
- ✅ **Error handling differs** between phases (fail fast vs. graceful degradation)
