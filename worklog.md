---
Task ID: 1
Agent: Main Agent
Task: Implement comprehensive site, employee, and dashboard improvements

Work Log:
- Updated sites API PUT handler: when deactivating a site, all assigned employees are set to idle (currentSite=null) and team leaders lose their status
- Added unassignedCount to sites API response so frontend knows how many employees were affected
- Updated employee DELETE handler: now also deletes attendance, warnings, fines, leave requests, and cancellation requests for deleted employees
- Added site validation in employee PUT handler: prevents assigning employees to inactive sites
- Added employee status filter to attendance, warnings, fines, leave requests, and cancellation requests GET routes to exclude deleted employees
- Rewrote dashboard page: hides inactive sites from breakdown, shows unassigned/idle employees card on top (clickable to navigate to employees page with idle filter), added View Sites button in breakdown section, updated attendance chart legend from "No Site" to "No Site / Idle"
- Added deactivation confirmation dialog to sites page with proper warning about employee impact
- Updated employee page to support employeeFilter from app store for cross-page filter navigation
- Added navigateToEmployees(filter) and employeeFilter to app store
- Pushed all changes to GitHub

Stage Summary:
- Sites can no longer be deactivated without confirmation showing employee impact
- Deleted employees have all their related data removed from display
- Dashboard shows idle/unassigned employees prominently with click-to-filter
- Inactive sites are hidden from dashboard breakdown
- Employee page supports idle/working filtering from external navigation
- Code pushed to https://github.com/JYOTHILALREJI/ASM.git (commit e9dd617)
