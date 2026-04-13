// Script to build Next.js for mobile with static export
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Copy mobile config to next.config.js temporarily
const mobileConfigPath = path.join(__dirname, 'next.config.mobile.js')
const mainConfigPath = path.join(__dirname, 'next.config.js')
const backupConfigPath = path.join(__dirname, 'next.config.js.backup')

try {
  // Backup original config
  if (fs.existsSync(mainConfigPath)) {
    fs.copyFileSync(mainConfigPath, backupConfigPath)
  }

  // Copy mobile config
  fs.copyFileSync(mobileConfigPath, mainConfigPath)

  console.log('Building Next.js app for mobile (static export)...')
  execSync('next build', { stdio: 'inherit', cwd: __dirname })

  console.log('Build complete! Output is in the "out" directory.')
} catch (error) {
  console.error('Build failed:', error.message)
  process.exit(1)
} finally {
  // Restore original config
  if (fs.existsSync(backupConfigPath)) {
    fs.copyFileSync(backupConfigPath, mainConfigPath)
    fs.unlinkSync(backupConfigPath)
  }
}
