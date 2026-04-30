---
Task ID: 1
Agent: Main
Task: Copy existing ASM codebase and set up project with SQLite

Work Log:
- Cloned the ASM repository from GitHub
- Copied all components, stores, hooks, lib files, layout, and API routes
- Adapted Prisma schema from PostgreSQL to SQLite
- Added UniformRegistry model and Employee teamLeader fields
- Ran db:push successfully
- Installed jspdf and bcryptjs dependencies
- Updated app-store to include uniform_registry view
- Updated sidebar with Shirt icon for Uniform Registry
- Updated header with Uniform Registry title
- Updated main page.tsx to integrate UniformRegistryPage
- Fixed API response format consistency between frontend and backend
- Created test data and verified all API endpoints work

Stage Summary:
- Full ASM codebase migrated and running on SQLite
- Uniform Registry feature fully integrated
- All API endpoints tested and working
