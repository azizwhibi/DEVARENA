# GoogleGuard AI: Engineering Governance & Agent Rules (AGENTS.md)

**Project:** GoogleGuard AI (Google Workspace Security, DLP & Onboarding Copilot)  
**Target Organization:** GoogleGuard Enterprise GmbH  
**Primary Architect:** Antigravity AI Engineering Assistant  
**Installed Skill Packs & MCPs:** `addyosmani/agent-skills`, `DietrichGebert/ponytail`, `Graphify MCP`  
**Reference Documents:** [`plan.md`](file:///D:/buenaai/plan.md), [`SPEC.md`](file:///D:/buenaai/SPEC.md), [`TODO.md`](file:///D:/buenaai/TODO.md)  

---

## 1. Prime Directives for All Agents

Every AI agent, subagent, and human engineer working on this repository MUST strictly comply with the following eleven immutable rules:

### Rule 1: Spec & Plan First (No Guesswork)
- Never write application implementation code before [`SPEC.md`](file:///D:/buenaai/SPEC.md) and [`TODO.md`](file:///D:/buenaai/TODO.md) are established and approved.
- Use `/agent-skills:spec-driven-development` and `/agent-skills:planning-and-task-breakdown` to initialize and update specifications.
- All code additions must map directly to an active task ID in [`TODO.md`](file:///D:/buenaai/TODO.md).

### Rule 2: Mandatory Graphify Context Across the Entire Session
- **No Blind File Grepping:** Every agent and subagent spawned in Antigravity MUST query the **Graphify** knowledge graph (`graphify-mcp`) before proposing architectural changes, tracing dependencies, or modifying interfaces.
- **Session-Wide Graph Sync:** At the start of every session and after completing any task in `TODO.md`, synchronize and query the Graphify knowledge graph to map multi-modal relationships across `plan.md`, `SPEC.md`, `src/ports/`, `src/services/`, and `src/adapters/`.
- **Blast-Radius Assessment:** Before editing any shared port or model, use Graphify to inspect upstream/downstream edges and verify static change impact rather than relying on raw token-heavy `grep` or file reads.

### Rule 3: Ponytail Coding Discipline (Write Code Like a "Lazy Senior Dev")
- **Activate `ponytail` for All Implementation:** All code generation and refactoring MUST adhere strictly to the **Ponytail** skill ruleset:
  1. **Trace the Real Flow First:** Follow the actual execution path (via Graphify + existing code) before writing a single line.
  2. **Smallest Correct Change:** Stop at the smallest, simplest code change that satisfies the failing test and specification. The best code is the code you never had to write.
  3. **Zero Speculative Abstractions:** Do not invent premature base classes, generic wrappers, unrequested config flags, or "just-in-case" helper utilities.
  4. **Preserve Explicit Safety Floors:** Never strip existing error handling, type guards, or security validations during refactoring, and never touch unrelated lines of code in the same diff.

### Rule 4: GDPR / DSGVO Zero Raw PII Logging
- **Strictly Prohibited:** Never emit unmasked personal identifiable information (PII)—such as German IBANs, tax identification numbers (`Steuer-ID`), passport numbers, salaries, or unredacted document bodies—to `stdout`, `stderr`, application logs, or database records.
- **Mandatory Masking:** Pass all incoming text through the regex pre-screener (`PIIPreFilter`) to tokenize sensitive values (e.g., `[REDACTED_IBAN_1]`, `DE89...XXXX`) prior to logging, LLM prompt injection, or storage.
- **Audit Storage:** The SQLite audit store (`audit_logs.db`) must store exclusively SHA-256 hashes of scanned files and redacted risk classifications.

### Rule 5: Least Privilege OAuth Scopes
- Only request read-only OAuth scopes (`https://www.googleapis.com/auth/drive.readonly`, `https://www.googleapis.com/auth/spreadsheets.readonly`) for scanning operations.
- Write/update scopes are strictly segregated to provisioning operations and must never be requested in default scanning flows.

### Rule 6: Mandatory Test-Driven Development (TDD)
- Invoke `/agent-skills:test-driven-development` and `/agent-skills:incremental-implementation` for every task.
- Development follows the strict **Red-Green-Refactor** cycle:
  1. **Red:** Write a failing unit or contract test in `tests/`.
  2. **Verify Red:** Run `pytest <test_file> -v` and confirm it fails for the expected reason.
  3. **Green (via Ponytail):** Write the minimal implementation code required to make the test pass.
  4. **Verify Green:** Run `pytest <test_file> -v` and confirm it passes.
  5. **Refactor:** Clean up types and docstrings while keeping tests green and diffs minimal.
- Every service in `src/services/` and adapter in `src/adapters/` must maintain >= 90% test coverage.

### Rule 7: Strict Hexagonal (Ports & Adapters) Boundary
- Domain business logic in `src/services/` MUST depend only on abstract interfaces in `src/ports/` and data models in `src/models/`.
- Domain services must **never** import concrete adapters (`google_live_adapter.py`, `mock_admin_adapter.py`, `audit_store.py`) directly.
- Concrete adapters are instantiated and wired via `src/adapters/factory.py` driven by environment configuration.

### Rule 8: Zero-Billing Hybrid Strategy
- The application is designed to operate 100% on free tiers with zero cloud billing dependencies.
- `WORKSPACE_MODE` defaults to `MOCK`, utilizing `fixtures/` JSON contracts to simulate Google Workspace Enterprise Admin SDK Directory and Cloud Identity DLP APIs.
- Live APIs (Google Drive, Google Sheets, Google AI Studio Gemini 2.5 Flash) must fail gracefully or fall back to mock data if credentials or network connectivity are unavailable.

### Rule 9: Addy Osmani Subagent Pack & Verification Loops
- Never rely on a single monolithic agent thread to both write and approve code. Orchestrate the **`addyosmani/agent-skills` subagent pack** across every phase:
  1. **Ideate & Plan:** Use `/agent-skills:spec-driven-development` and `/agent-skills:planning-and-task-breakdown` to lock exit criteria before implementation.
  2. **Implement (Builder Subagent + Ponytail):** Delegate atomic slices using `/agent-skills:incremental-implementation` paired with the `ponytail` skill.
  3. **Test Verification (`test-engineer` subagent):** Spawn the `test-engineer` persona from the Addy Osmani pack to verify mock contract fidelity against Google Workspace Admin SDK schemas and edge cases.
  4. **Security Gate (`security-auditor` subagent):** Spawn `security-auditor` to audit OAuth2 scopes, verify `PIIPreFilter` tokenization, check `.agents/mcp_config.json` tool permissions, and ensure zero secret leakage.
  5. **Five-Axis Code Review (`code-reviewer` subagent / `/agent-skills:code-review`):** Spawn `code-reviewer` before marking any `TODO.md` task complete to verify hexagonal boundaries, Pydantic v2 strictness, and Ponytail minimal-diff compliance.

### Rule 10: Mandatory Review Receipts (Exit Criteria)
- Every subagent or skill execution must conclude by emitting a structured **Review Receipt** before requesting human approval in the Antigravity Artifact Review (`Ctrl+R`) screen:
  - **Graphify Nodes/Edges Consulted:** Which modules and relationships were traced.
  - **Files Changed:** Exact list of created/modified files.
  - **Commands Run & Output:** Exact `pytest` / linter commands executed and their pass/fail status.
  - **Ponytail Check:** Confirmation that no unrequested abstractions or out-of-scope refactors were introduced.
  - **Open Risks:** Any remaining assumptions or edge cases.

### Rule 11: Phase Transition Gate (Run, Human Approval, Git Push)
- Before proceeding to any subsequent phase in [`TODO.md`](file:///D:/buenaai/TODO.md):
  1. **Run the Project:** Execute the full test suite (`pytest -v`) and verify the application services run cleanly to demonstrate complete runtime integrity.
  2. **Ask Human for Approval:** Present the run results and review receipt, and explicitly request human approval before advancing.
  3. **Git Commit & Push:** Once human approval is received, stage all relevant changes, commit with an atomic message, and push to the remote repository.
  4. **Advance to Next Phase:** Only after git push is confirmed complete may work on the next phase begin.