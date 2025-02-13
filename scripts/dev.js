const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
    frontend: '\x1b[36m', // Cyan
    backend: '\x1b[32m',  // Green
    error: '\x1b[31m',    // Red
    reset: '\x1b[0m'      // Reset
};

function startService(name, command, args, cwd) {
    console.log(`${colors[name]}Starting ${name}...${colors.reset}`);

    const process = spawn(command, args, {
        cwd: path.join(__dirname, '..', cwd),
        shell: true,
        stdio: 'pipe'
    });

    process.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
            console.log(`${colors[name]}[${name}] ${line}${colors.reset}`);
        });
    });

    process.stderr.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
            console.log(`${colors.error}[${name} ERROR] ${line}${colors.reset}`);
        });
    });

    process.on('error', (error) => {
        console.error(`${colors.error}Failed to start ${name}:${colors.reset}`, error);
    });

    process.on('close', (code) => {
        if (code !== 0) {
            console.log(`${colors.error}${name} process exited with code ${code}${colors.reset}`);
        }
    });

    return process;
}

// Check if .env exists in backend
const fs = require('fs');
if (!fs.existsSync(path.join(__dirname, '../backend/.env'))) {
    console.log(`${colors.error}Warning: backend/.env file not found${colors.reset}`);
    console.log('Please create backend/.env from backend/.env.example and add your Firebase credentials');
}

// Start both services
const backend = startService('backend', 'npm', ['run', 'dev'], 'backend');
const frontend = startService('frontend', 'npm', ['start'], 'frontend');

// Handle process termination
function cleanup() {
    console.log('\nShutting down services...');
    backend.kill();
    frontend.kill();
    process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup); 