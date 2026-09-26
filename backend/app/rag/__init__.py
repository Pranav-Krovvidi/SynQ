# backend/app/rag/__init__.py
# Retrieval-Augmented Generation pipeline — implemented in WS-6 and WS-7.
#
# Public modules:
#   app.rag.prompts         — prompt templates
#   app.rag.retriever       — hybrid semantic + keyword retrieval with RRF
#   app.rag.context_builder — assemble chunks into labeled context string
#   app.rag.llm_client      — watsonx.ai streaming LLM wrapper
#   app.rag.citations       — [SOURCE N] citation extraction
#   app.rag.pipeline        — full SSE event generator (RAG + BYC)
