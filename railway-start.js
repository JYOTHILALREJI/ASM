const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== ASM Railway Startup ===');

// Step 0: Switch to PostgreSQL provider for Railway
console.log('Switching Prisma to PostgreSQL provider...');
try {
  execSync('node scripts/switch-db.js postgresql', { stdio: 'inherit' });
  console.log('Successfully switched to PostgreSQL provider');
} catch (e) {
  console.error('Warning: switch-db failed (schema may already be postgresql):', e.message);
}

// Step 1: Push database schema - CRITICAL for creating tables
// This also runs as preDeployCommand in railway.toml, but we run it again here as safety net
console.log('Pushing database schema to PostgreSQL...');
let schemaPushed = false;
try {
  execSync('npx prisma db push --accept-data-loss 2>&1', { stdio: 'inherit', timeout: 120000 });
  schemaPushed = true;
  console.log('Successfully pushed database schema');
} catch (e) {
  console.error('npx prisma db push failed:', e.message);

  // Try with node_modules/.bin directly
  try {
    const prismaBin = path.join(__dirname, 'node_modules', '.bin', 'prisma');
    if (fs.existsSync(prismaBin)) {
      console.log('Trying with local prisma binary...');
      execSync(`${prismaBin} db push --accept-data-loss 2>&1`, { stdio: 'inherit', timeout: 120000 });
      schemaPushed = true;
      console.log('Successfully pushed database schema (via local binary)');
    }
  } catch (e2) {
    console.error('Local prisma binary also failed:', e2.message);
  }
}

if (!schemaPushed) {
  console.error('WARNING: Could not push database schema. Tables may be missing.');
  console.error('If you see "table does not exist" errors, the AdminMenuPermission table needs to be created manually.');
  console.error('You can run this SQL in your PostgreSQL database:');
  console.error(`
CREATE TABLE IF NOT EXISTS "AdminMenuPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminMenuPermission_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdminMenuPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdminMenuPermission_userId_menuId_key" ON "AdminMenuPermission"("userId","menuId");
CREATE INDEX IF NOT EXISTS "AdminMenuPermission_userId_idx" ON "AdminMenuPermission"("userId");
  `);
}

// Step 2: Generate Prisma client (should already be done during build, but safety net)
console.log('Ensuring Prisma client is generated...');
try {
  execSync('npx prisma generate', { stdio: 'inherit', timeout: 60000 });
  console.log('Prisma client ready');
} catch (e) {
  console.error('Warning: prisma generate failed (client may already exist from build):', e.message);
}

// Step 3: Start the Next.js server
const port = process.env.PORT || 3000;

const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');
if (fs.existsSync(standalonePath)) {
  console.log(`Starting Next.js standalone server on port ${port}...`);

  process.env.HOSTNAME = '0.0.0.0';
  process.env.PORT = port;

  const server = spawn('node', [standalonePath], {
    stdio: 'inherit',
    env: { ...process.env },
    cwd: path.join(__dirname, '.next', 'standalone')
  });

  server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  server.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
    process.exit(code || 0);
  });
} else {
  console.log('Standalone build not found, falling back to npx next start...');
  try {
    execSync(`npx next start -p ${port}`, { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to start Next.js server:', e.message);
    process.exit(1);
  }
}
