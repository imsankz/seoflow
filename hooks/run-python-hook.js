import { spawnSync } from 'node:child_process';

const [, , scriptPath, targetPath] = process.argv;

if (!scriptPath || !targetPath) {
  process.exit(0);
}

const result = spawnSync(process.execPath, [scriptPath, targetPath], {
  encoding: 'utf8',
  stdio: 'pipe',
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

process.exit(result.status ?? 0);
