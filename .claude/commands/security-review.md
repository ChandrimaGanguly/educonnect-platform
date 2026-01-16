Load @/openspec/agents/security-auditor.md and perform a security review of the changed files.

Focus on files modified since the last commit or merge to main:
!`git diff --name-only origin/HEAD...`

If no files have changed, review the most recently modified security-sensitive files (auth, database, API routes).
