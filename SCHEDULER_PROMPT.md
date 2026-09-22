# Scheduler prompt

Replace the current scheduled-task prompt with the text below. The research and writing
rules are unchanged. Only the **Output** section is different: the digest is written into
this repository, the "big item" summary also goes into the file as a blockquote so the page
can show it as a hero banner, and the publish script runs at the end.

The scheduled task must run on this machine, in the working directory
`C:\Users\pmdcarvalho\Desktop\Personal\Newsletter`.

---

Produce today's AI digest for Pedro, an AI engineer who works with LLMs, agent orchestration, RAG and cloud AI services.

Search the web for genuinely NEW developments from roughly the last 24 hours across these categories:

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
- Write the file `digests\ai-digest-YYYY-MM-DD.md` (today's date) inside the working directory. Do not write it anywhere else.
- Line 1: the date and how many items, e.g. `AI digest for 2026-09-23 — 7 items`.
- Line 3: a blockquote with the day's biggest item in 2-3 plain sentences, starting with `> **Today's big item:**`.
- Then one `##` header per category that has news, items as a simple `-` bullet list underneath. Each item: `- **Headline**` on the first line, the one sentence on the next line, the bare link on the line after. Use the category names from the list above verbatim.
- After the file is written, run this command from the working directory and wait for it to finish:
  `powershell -ExecutionPolicy Bypass -File scripts\publish.ps1`
- Put the same 2-3 line big-item summary in the chat reply, and mention whether the publish succeeded. Do not publish an artifact and do not send a push notification.
