import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface ExtensionDefinition {
  id: string;
  name: string;
  description: string;
  category: 'data' | 'crawl' | 'images' | 'monitoring' | 'tech';
  installHint: string;
}

export interface ExtensionInstallState {
  id: string;
  status: 'available' | 'installed' | 'disabled' | 'unavailable';
  installedAt?: string;
  rootDir: string;
}

export interface InstallExtensionResult {
  installed: boolean;
  extensionId: string;
  status: 'installed' | 'available' | 'disabled' | 'unavailable';
  state: ExtensionInstallState;
}

const SUPPORTED_EXTENSIONS: ExtensionDefinition[] = [
  {
    id: 'dataforseo',
    name: 'DataForSEO',
    description: 'Live SERP, keyword, backlink, and on-page data via DataForSEO.',
    category: 'data',
    installHint: 'Add your DataForSEO credentials to .env.local or the MCP configuration.',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    description: 'Full-site crawling, sitemap discovery, and content extraction.',
    category: 'crawl',
    installHint: 'Connect the Firecrawl MCP server or install the optional extension bundle.',
  },
  {
    id: 'banana',
    name: 'Claude Banana',
    description: 'AI image generation for OG images, hero images, and schema assets.',
    category: 'images',
    installHint: 'Install the nanobanana MCP server and configure your image generation endpoint.',
  },
  {
    id: 'ahrefs',
    name: 'Ahrefs',
    description: 'Backlink, rank, and competitor visibility data from Ahrefs.',
    category: 'data',
    installHint: 'Provide your Ahrefs API credentials through the configured environment variables.',
  },
  {
    id: 'seranking',
    name: 'SE Ranking',
    description: 'Visibility tracking, keyword rank data, and AI-share-of-voice reports.',
    category: 'monitoring',
    installHint: 'Enable the SE Ranking integration and add the required API tokens.',
  },
  {
    id: 'profound',
    name: 'Profound',
    description: 'LLM citation and brand mention monitoring across AI answer surfaces.',
    category: 'monitoring',
    installHint: 'Connect the Profound tracker and configure the reporting endpoint.',
  },
  {
    id: 'bing',
    name: 'Bing Webmaster',
    description: 'Bing indexing, URL submission, and site ownership verification support.',
    category: 'tech',
    installHint: 'Add Bing Webmaster credentials and verify ownership for the target domain.',
  },
  {
    id: 'indexnow',
    name: 'IndexNow',
    description: 'Ping search engines when new content is published.',
    category: 'tech',
    installHint: 'Set the publishing index host and key in your site configuration.',
  },
  {
    id: 'unlighthouse',
    name: 'Unlighthouse',
    description: 'Bulk Lighthouse auditing for content and technical performance review.',
    category: 'monitoring',
    installHint: 'Install the Unlighthouse CLI and point it at your site URLs.',
  },
];

function resolveRootDir(rootDir?: string): string {
  const base = rootDir || process.cwd();
  return path.resolve(base);
}

function getStateFilePath(rootDir?: string): string {
  const resolvedRootDir = resolveRootDir(rootDir);
  return path.join(resolvedRootDir, '.seoflow', 'extensions.json');
}

function findExtensionBundleRoot(extensionId: string, rootDir?: string): string | null {
  const candidates = [
    path.resolve(resolveRootDir(rootDir), 'extensions', extensionId),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'extensions', extensionId),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'extensions', extensionId),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function provisionExtensionBundle(extensionId: string, rootDir?: string): void {
  const resolvedRootDir = resolveRootDir(rootDir);
  const sourceDir = findExtensionBundleRoot(extensionId, resolvedRootDir);
  if (!sourceDir) return;

  const destinationDir = path.join(resolvedRootDir, '.seoflow', 'extensions', extensionId);
  fs.mkdirSync(path.dirname(destinationDir), { recursive: true });
  fs.rmSync(destinationDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, destinationDir, { recursive: true });
}

function readState(rootDir?: string): Record<string, ExtensionInstallState> {
  const statePath = getStateFilePath(rootDir);
  if (!fs.existsSync(statePath)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8')) as Record<string, ExtensionInstallState>;
    return parsed;
  } catch {
    return {};
  }
}

function writeState(rootDir: string, state: Record<string, ExtensionInstallState>): void {
  const statePath = getStateFilePath(rootDir);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

export function getSupportedExtensions(): ExtensionDefinition[] {
  return SUPPORTED_EXTENSIONS.map((ext) => ({ ...ext }));
}

export function getExtensionState(rootDir?: string, extensionId?: string): ExtensionInstallState | Record<string, ExtensionInstallState> {
  const resolvedRootDir = resolveRootDir(rootDir);
  const state = readState(resolvedRootDir);

  if (extensionId) {
    const definition = SUPPORTED_EXTENSIONS.find((ext) => ext.id === extensionId);
    if (!definition) {
      return { id: extensionId, status: 'unavailable', rootDir: resolvedRootDir };
    }
    return state[extensionId] || { id: extensionId, status: 'available', rootDir: resolvedRootDir };
  }

  return state;
}

export function installExtension(extensionId: string, options: { rootDir?: string } = {}): InstallExtensionResult {
  const resolvedRootDir = resolveRootDir(options.rootDir);
  const definition = SUPPORTED_EXTENSIONS.find((ext) => ext.id === extensionId);

  if (!definition) {
    const unavailableState: ExtensionInstallState = {
      id: extensionId,
      status: 'unavailable',
      rootDir: resolvedRootDir,
    };
    return { installed: false, extensionId, status: 'unavailable', state: unavailableState };
  }

  const state = readState(resolvedRootDir);
  const nextState: ExtensionInstallState = {
    id: extensionId,
    status: 'installed',
    installedAt: new Date().toISOString(),
    rootDir: resolvedRootDir,
  };

  state[extensionId] = nextState;
  writeState(resolvedRootDir, state);
  provisionExtensionBundle(extensionId, resolvedRootDir);

  return { installed: true, extensionId, status: 'installed', state: nextState };
}

export function formatExtensionStatus(rootDir?: string): string[] {
  const supported = getSupportedExtensions();
  const state = getExtensionState(rootDir) as Record<string, ExtensionInstallState>;

  return supported.map((extension) => {
    const current = state[extension.id];
    const status = current?.status || 'available';
    const installedLabel = status === 'installed' ? 'installed' : status;
    return `- ${extension.id}: ${installedLabel} — ${extension.description}`;
  });
}
