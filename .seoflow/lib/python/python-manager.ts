import { exec, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execPromise = promisify(exec);

export interface PythonOptions {
  scriptName: string;
  args?: string[];
  timeout?: number;
  workingDir?: string;
  pythonPath?: string;
}

export interface PythonResult {
  stdout: string;
  stderr: string;
  code: number;
  error?: any;
}

export class PythonManager {
  private static pythonPath: string = 'python3';
  private static virtualEnvPath: string | null = null;
  private static initialized: boolean = false;

  /**
   * Initialize Python manager with configuration
   */
  static initialize(config?: { pythonPath?: string; virtualEnvPath?: string }): void {
    if (config?.pythonPath) {
      PythonManager.pythonPath = config.pythonPath;
    }

    if (config?.virtualEnvPath) {
      PythonManager.virtualEnvPath = config.virtualEnvPath;
    }

    PythonManager.initialized = true;
  }

  /**
   * Get the Python interpreter path (including virtual environment if configured)
   */
  static getPythonPath(): string {
    if (PythonManager.virtualEnvPath) {
      if (process.platform === 'win32') {
        return path.join(PythonManager.virtualEnvPath, 'Scripts', 'python.exe');
      } else {
        return path.join(PythonManager.virtualEnvPath, 'bin', 'python');
      }
    }

    return PythonManager.pythonPath;
  }

  /**
   * Check if Python is available
   */
  static isPythonAvailable(): boolean {
    try {
      execSync(`${this.getPythonPath()} --version`, { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a specific Python package is installed
   */
  static isPackageInstalled(packageName: string): boolean {
    try {
      execSync(`${this.getPythonPath()} -c "import ${packageName}"`, { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Run a Python script with optional arguments
   */
  static run(options: PythonOptions): PythonResult {
    const { scriptName, args = [], timeout = 60000, workingDir = process.cwd() } = options;

    const scriptPath = path.resolve(workingDir, 'python', `${scriptName}.py`);

    if (!fs.existsSync(scriptPath)) {
      return {
        stdout: '',
        stderr: `Script not found: ${scriptPath}`,
        code: 1,
        error: new Error(`Script not found: ${scriptPath}`),
      };
    }

    const pythonPath = this.getPythonPath();
    const command = `${pythonPath} "${scriptPath}" ${args.join(' ')}`;

    try {
      const result = execSync(command, {
        encoding: 'utf8',
        cwd: workingDir,
        timeout,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return {
        stdout: result,
        stderr: '',
        code: 0,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        code: error.status || 1,
        error,
      };
    }
  }

  /**
   * Run a Python script asynchronously
   */
  static async runAsync(options: PythonOptions): Promise<PythonResult> {
    const { scriptName, args = [], timeout = 60000, workingDir = process.cwd() } = options;

    const scriptPath = path.resolve(workingDir, 'python', `${scriptName}.py`);

    if (!fs.existsSync(scriptPath)) {
      return Promise.resolve({
        stdout: '',
        stderr: `Script not found: ${scriptPath}`,
        code: 1,
        error: new Error(`Script not found: ${scriptPath}`),
      });
    }

    const pythonPath = this.getPythonPath();
    const command = `${pythonPath} "${scriptPath}" ${args.join(' ')}`;

    try {
      const result = await execPromise(command, {
        cwd: workingDir,
        timeout,
      });

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        code: 0,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        code: error.code || 1,
        error,
      };
    }
  }

  /**
   * Run pip commands
   */
  static runPip(command: string): PythonResult {
    const pipCommand = `${this.getPythonPath()} -m pip ${command}`;

    try {
      const result = execSync(pipCommand, { encoding: 'utf8' });
      return {
        stdout: result,
        stderr: '',
        code: 0,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        code: error.status || 1,
        error,
      };
    }
  }

  /**
   * Install dependencies from requirements.txt
   */
  static installDependencies(requirementsPath: string = 'python/requirements.txt'): PythonResult {
    if (!fs.existsSync(requirementsPath)) {
      return {
        stdout: '',
        stderr: `Requirements file not found: ${requirementsPath}`,
        code: 1,
        error: new Error(`Requirements file not found: ${requirementsPath}`),
      };
    }

    return this.runPip(`install -r "${requirementsPath}"`);
  }

  /**
   * Check if all required dependencies are installed
   */
  static checkDependencies(): { missing: string[]; installed: string[] } {
    const requirementsPath = 'python/requirements.txt';
    if (!fs.existsSync(requirementsPath)) {
      return { missing: ['requirements.txt file not found'], installed: [] };
    }

    const requirements = fs.readFileSync(requirementsPath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split(/[<>=]/)[0].trim());

    const missing: string[] = [];
    const installed: string[] = [];

    requirements.forEach(packageName => {
      if (this.isPackageInstalled(packageName)) {
        installed.push(packageName);
      } else {
        missing.push(packageName);
      }
    });

    return { missing, installed };
  }
}

// Initialize with default configuration
PythonManager.initialize();

export default PythonManager;
