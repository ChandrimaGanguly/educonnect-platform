Load @/openspec/agents/security-auditor.md and perform a quick security scan focusing on:

Priority files:
- Authentication: src/routes/auth.ts, src/services/auth.service.ts
- Database: src/database/**, knexfile.ts
- API routes: src/routes/**
- Configuration: .env.example, src/config/**
- Python services: python-services/**/main.py

Focus on:
1. Exposed credentials or API keys
2. SQL injection vulnerabilities
3. Authentication/authorization bypasses
4. Input validation issues
5. Insecure configurations
