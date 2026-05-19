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

---
Task ID: 2
Agent: Main
Task: Implement role-based access control for normal admins (Dashboard + Uniform Registry only)

Work Log:
- Added `roles: ['super_admin']` to all sidebar nav items except Dashboard and Uniform Registry
- Added `ADMIN_ALLOWED_VIEWS` constant in page.tsx with ['dashboard', 'uniform_registry']
- Added useEffect to redirect normal admins to dashboard if they try accessing restricted views
- Added render-time check to block restricted views for normal admins

Stage Summary:
- Normal admins can only see Dashboard and Uniform Registry in sidebar
- Normal admins are automatically redirected if they try to access restricted pages
- Super admins have full access to all pages

---
Task ID: 3
Agent: Main
Task: Implement Team Leader dropdown in Uniform Registry with site-based filtering and change confirmation

Work Log:
- Added new state variables: currentTeamLeader, siteEmployees, isChangingTeamLeader, changeLeaderConfirmOpen, isSettingTeamLeader
- Modified findTeamLeaderForSite to also set currentTeamLeader employee object and siteEmployees array
- Created TeamLeaderCombobox component with three states:
  - No site selected: disabled with "Select a site first..." message
  - Team leader exists: shows current leader + "Change Team Leader..." option
  - No team leader OR in change mode: shows all site employees in searchable dropdown
- Added handleTeamLeaderSelect function that calls API to set/remove team leader
- Added Change Team Leader confirmation dialog (AlertDialog)
- Removed old team leader confirmation dialog (pendingTeamLeaderData/teamLeaderConfirmOpen)
- Replaced static Team Leader display in Create Dialog with TeamLeaderCombobox
- Added helpful hint messages for no leader / no employees scenarios
- Updated handleSiteSelect, openCreateDialog, openRenewDialog, resetForm to handle new state
- Removed team leader confirmation logic from handleCreateEntry (team leader now set explicitly via dropdown)

Stage Summary:
- Team Leader is now a searchable dropdown instead of static text
- When no team leader exists for a site: all site employees are shown for selection
- When team leader exists: only the leader is shown with a "Change Team Leader..." option
- Changing team leader requires confirmation via AlertDialog popup
- After confirmation, all site employees are shown to select a new leader
- Team leader assignment is saved immediately via API when selected from dropdown
- Previous team leader is automatically removed when a new one is assigned

---
Task ID: 4
Agent: Main
Task: Add site active/inactive toggle, tabs, attendance sheet with PDF/print, and admin account

Work Log:
- Updated Prisma Site model with `isActive` (Boolean, default true), `clientName` (String?), `projectName` (String?) fields
- Ran `prisma db push` and `prisma generate` to sync schema and regenerate client
- Added admin account to database: asm@test.com / 123456 (role: admin)
- Copied logo_asm.png to public/ folder for attendance sheet header
- Installed html2canvas-pro for PDF generation
- Updated Sites API (GET/POST/PUT) to handle new fields (clientName, projectName, isActive)
- Completely rewrote Sites page with:
  - Active/Inactive tabs using shadcn/ui Tabs component
  - Power/PowerOff toggle button on each site card
  - Attendance Sheet button on each site card
  - Updated Add/Edit dialogs with Client Name and Project Name fields
  - Badge counts on tab labels
- Created AttendanceSheet component (`src/components/attendance/attendance-sheet.tsx`) with:
  - Full-screen overlay with A4-like paper document
  - Company header "ARABIAN SHIELD MANPOWER" with ASM logo
  - "DAILY ATTENDANCE" title bar
  - Client Name, Project Name, Date, Strength info section
  - Editable table (Sl. No, NAME, CODE, TRADE, SIGNATURE columns)
  - Team Leader first with "POSITION / TEAM LEADER" trade format
  - Supervisor second with "POSITION / SUPERVISOR" trade format
  - Inline editable cells (click to edit name, code, trade)
  - PDF download using html2canvas-pro + jspdf (landscape A4)
  - Direct print using window.print() with @media print CSS
  - Empty rows padded to minimum 20 rows
  - Total footer row

Stage Summary:
- Sites have active/inactive toggle with separate tabs
- Each site card has attendance sheet button
- Add/Edit site dialogs include Client Name and Project Name
- Full attendance sheet component with editable table, PDF download, and print
- Admin account (asm@test.com / 123456) added to database
- All API endpoints tested and working
- No lint errors
