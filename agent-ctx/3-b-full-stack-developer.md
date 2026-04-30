Task ID: 3-b
Agent: full-stack-developer
Task: Update employee API routes for teamLeader support

Work Log:
- Updated GET /api/employees to include teamLeader fields (already included via Prisma findMany without select)
- Updated GET /api/employees/[id] to include teamLeader fields (already included via Prisma findUnique without select)
- Updated POST /api/employees to allow setting isTeamLeader and teamLeaderSiteId with validation
- Updated PUT /api/employees/[id] to handle teamLeader changes with conflict detection

Stage Summary:
- Employee API now supports team leader functionality with conflict detection
