---
Task ID: 1
Agent: Main
Task: Fix super admin menu permissions API & attendance sheet text sizes, push to GitHub

Work Log:
- Investigated the "Only superadmins can manage menu permissions" error
- Root cause: Stale `.next` cache causing Prisma Client to return incorrect data
- Cleared `.next` directory and regenerated Prisma Client with `npx prisma generate`
- Added debug logging to `/api/admin-menu-permissions` PUT route (console.log for requesterId, lookup result, access denied)
- Added `requesterRole` field to frontend request body for additional verification context
- Added client-side validation for `user?.id` before making API calls (shows helpful toast if missing)
- Tested API through Caddy gateway - confirmed 200 OK with correct response
- Fixed attendance sheet text sizes:
  - Subsequent pages heading: changed from 15px to 14px (viewport)
  - Extra employees table headers: added text-[13px] to match main table headers
  - Verified PDF/print CSS already correct: table 12px, th 13px, main heading 16px/14px
- Ran ESLint - no errors
- Committed and pushed to GitHub (commit 9fd74ca)

Stage Summary:
- Super admin menu permissions now working correctly after cache clear
- Attendance sheet text sizes standardized: 12px table contents, 13px headers, 16px first page heading, 14px subsequent pages heading
- Code pushed to GitHub: https://github.com/JYOTHILALREJI/ASM.git
