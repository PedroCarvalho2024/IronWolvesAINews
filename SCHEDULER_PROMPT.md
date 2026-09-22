# Scheduler prompt

Replace the current scheduled-task prompt with the text below. The research and writing
rules are unchanged. Only the **Output** section is different: the digest is written into
this repository, the "big item" summary also goes into the file as a blockquote so the page
can show it as a hero banner, and the publish script runs at the end.

The task is registered in the Claude desktop app as `ironwolves-ai-digest`, daily at 09:30
(the app adds a fixed delay of a few minutes). It runs on Pedro's machine while the app is open;
if the app is closed at 09:30 the run happens at next launch. Task file:
`C:\Users\pmdcarvalho\.claude\scheduled-tasks\ironwolves-ai-digest\SKILL.md`.

---

Produce today's AI digest for Pedro, an AI engineer who works with LLMs, agent orchestration, RAG and cloud AI services. The digest feeds the IronWolves team newsletter page.

All file paths below are relative to the repository folder `C:\Users\pmdcarvalho\Desktop\Personal\Newsletter`. Work inside that folder.

Use web search and web fetch tools for the research. Search the web for genuinely NEW developments from roughly the last 24 hours across these categories:

1. New model launches — frontier labs (OpenAI, Anthropic, Google, Meta, Mistral, xAI) and notable open-source releases (Qwen, DeepSeek, Llama, etc.)
2. New techniques / papers — prompting, fine-tuning, RAG improvements, agent architectures, evals (check arXiv, Hugging Face papers, major AI research blogs)
3. Interesting GitHub repos — trending or newly released repos for agent frameworks, RAG tooling, MCP servers, orchestration libraries
4. Ontologies & knowledge graphs for AI — semantic web / KG research applied to LLMs and knowledge representation
5. RAG / vector DB tooling — new vector databases, retrieval techniques, embedding models
6. Agent orchestration frameworks — updates to LangChain, LangGraph, Google ADK, CrewAI, AutoGen, and the MCP (Model Context Protocol) ecosystem
7. Cloud AI service updates — Azure OpenAI, Vertex AI, AWS Bedrock, Anthropic API changes
8. AI security & compliance — prompt injection research, GDPR / EU AI Act developments

Research rules:
- Run multiple targeted web searches per category; do not rely on a single search. Get the actual date of each item and discard anything older than ~48 hours.
- Verify each item against its primary source (the lab's blog, the arXiv abstract, the repo, the release notes) before including it. Never invent an item, a link or a version number.
- SKIP any category with nothing genuinely new. Do not pad. A short digest with four real items beats eight categories of filler.
- Maximum 3 items per category — keep only the ones that actually matter.

WRITING STYLE — this is the most important part. Write it as if explaining to a junior software developer:
- Plain, simple English. Short sentences. No hype, no marketing language, no words like "groundbreaking", "revolutionary", "game-changing", "leverage", "paradigm".
- Assume the reader knows how to code but may not know AI jargon. The first time a term like RAG, quantisation, MoE, distillation or eval harness appears, explain it in three or four words in brackets — e.g. "RAG (feeding docs to an LLM)".
- Each item is exactly two lines: a bold one-line headline, then ONE short sentence saying what it is and why a developer might care. Then the link. No third sentence.
- No nested bullets, no tables, no long paragraphs. The whole digest should be readable in under two minutes.

Output — follow this exactly, the newsletter page parses it:
- Write the file `digests\ai-digest-YYYY-MM-DD.md` (today's local date) inside the repository folder. Do not write it anywhere else. If a file for today already exists, overwrite it.
- Line 1: the date and how many items, e.g. `AI digest for 2026-09-23 — 7 items`.
- Line 3: a blockquote with the day's biggest item in 2-3 plain sentences, starting with `> **Today's big item:**`.
- Then one `##` header per category that has news, items as a simple `-` bullet list underneath. Each item: `- **Headline**` on the first line, the one sentence indented on the next line, the bare link indented on the line after. Use the category names from the list above verbatim (the text before the em dash, e.g. `## New model launches`).
- Example of one item:
  - **Example Lab releases ExampleModel 3**
    A mid-size open-weights model with a longer context window (how much text it can read at once), useful if you self-host.
    https://example.com/examplemodel-3
- After the file is written, run this command from the repository folder and wait for it to finish:
  `powershell -ExecutionPolicy Bypass -File scripts\publish.ps1`
  It builds the page, commits the new digest and pushes to GitHub. GitHub Actions then deploys it to https://pedrocarvalho2024.github.io/IronWolvesAINews. If the command fails, include the error text in the chat reply.
- Finish with a chat reply containing the same 2-3 line big-item summary and one line saying whether the publish succeeded. Do not publish an artifact and do not send a push notification.
