import { ReadyStateMachine } from './lib/ReadyStateMachine';

export type SkillResource = {
  relativePath: string;
  absolutePath: string;
  mimeType: string;
};

export type SkillResourceMap = Map<string, Omit<SkillResource, 'relativePath'>>;

export const assertIsValidResourceType: (
  type: string
) => asserts type is 'script' | 'asset' | 'reference' = (type) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!['script', 'asset', 'reference'].includes(type as any)) {
    throw new Error(`Invalid resource type: ${type}`);
  }
};

export type MapValue<T> = T extends Map<unknown, infer V> ? V : never;
export type MapKey<T> = T extends Map<infer K, unknown> ? K : never;

export type Skill = {
  name: string;
  fullPath: string;
  toolName: string;
  description: string;
  allowedTools?: string[];
  metadata?: Record<string, string>;
  license?: string;
  content: string;
  path: string;
  scripts: SkillResourceMap;
  references: SkillResourceMap;
  assets: SkillResourceMap;
};

export type TextSegment = {
  text: string;
  negated: boolean;
};

export type ParsedSkillQuery = {
  include: string[];
  exclude: string[];
  originalQuery: string[];
  hasExclusions: boolean;
  termCount: number;
};

export type SkillSearchResult = {
  matches: Skill[];
  totalMatches: number;
  totalSkills: number;
  feedback: string;
  query: ParsedSkillQuery;
};

export type SkillRank = {
  skill: Skill;
  nameMatches: number;
  descMatches: number;
  totalScore: number;
};

export type PluginConfig = {
  debug: boolean;
  basePaths: string[];
  promptRenderer: 'json' | 'xml' | 'md';
  modelRenderers?: Record<string, 'json' | 'xml' | 'md'>;
};

export type LogType = 'log' | 'debug' | 'error' | 'warn';
// eslint-disable-next-line no-unused-vars
export type PluginLogger = Record<LogType, (...message: unknown[]) => void>;

// eslint-disable-next-line no-unused-vars
export type SkillSearcher = (query: string | string[]) => SkillSearchResult;

export type SkillRegistryController = {
  ready: ReadyStateMachine;
  skills: Skill[];
  ids: string[];
  clear: () => void;
  // eslint-disable-next-line no-unused-vars
  delete: (key: string) => void;
  // eslint-disable-next-line no-unused-vars
  has: (key: string) => boolean;
  // eslint-disable-next-line no-unused-vars
  get: (key: string) => Skill | undefined;
  // eslint-disable-next-line no-unused-vars
  set: (key: string, skill: Skill) => void;
};

export type SkillRegistryDebugInfo = {
  discovered: number;
  parsed: number;
  rejected: number;
  errors: string[];
};

export type SkillRegistry = {
  initialise: () => Promise<void>;
  config: PluginConfig;
  // eslint-disable-next-line no-unused-vars
  register: (...skillPaths: string[]) => Promise<SkillRegistryDebugInfo>;
  controller: SkillRegistryController;
  // eslint-disable-next-line no-unused-vars
  isSkillPath: (path: string) => boolean;
  // eslint-disable-next-line no-unused-vars
  getToolnameFromSkillPath: (path: string) => string | null;
  search: SkillSearcher;
  debug?: SkillRegistryDebugInfo;
  logger: PluginLogger;
};
