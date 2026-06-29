import fs from 'fs';
import path from 'path';

export interface InstallerArtifacts {
  installSh: string;
  installPs1: string;
  uninstallSh: string;
  uninstallPs1: string;
}

export function getInstallerArtifacts(rootDir = process.cwd()): InstallerArtifacts {
  return {
    installSh: path.join(rootDir, 'install.sh'),
    installPs1: path.join(rootDir, 'install.ps1'),
    uninstallSh: path.join(rootDir, 'uninstall.sh'),
    uninstallPs1: path.join(rootDir, 'uninstall.ps1'),
  };
}

export function hasInstallerArtifacts(rootDir = process.cwd()): boolean {
  const artifacts = getInstallerArtifacts(rootDir);
  return Object.values(artifacts).every((artifactPath) => fs.existsSync(artifactPath));
}
