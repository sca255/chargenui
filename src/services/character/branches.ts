import type {
  RoleplayCharacter,
  CharacterBranchCommit,
  CharacterBranch,
  CharacterBranchesData,
} from "../../types/character";

export interface CreateBranchOptions {
  name: string;
  fromCommitId?: string;
  description?: string;
}

export interface CommitOptions {
  message: string;
  author?: string;
  character: RoleplayCharacter;
}

export interface MergeResult {
  mergedCharacter: RoleplayCharacter;
  conflictFields: string[];
  autoResolvedFields: string[];
  commitId: string;
}

/**
 * Initializes branches data structure if not present.
 */
export function ensureBranchesData(character: RoleplayCharacter): CharacterBranchesData {
  const extensions = character.extensions || {};
  const chargenui = extensions.chargenui || { schemaVersion: 3 };

  if (chargenui.branches && chargenui.branches.branches && chargenui.branches.commits) {
    return chargenui.branches;
  }

  const initialCommitId = `commit_init_${Date.now()}`;
  const initialSnapshot: Partial<RoleplayCharacter> = {
    name: character.name,
    personality: character.personality,
    description: character.description,
    scenario: character.scenario,
    first_mes: character.first_mes,
    alternate_greetings: [...(character.alternate_greetings || [])],
    tags: [...(character.tags || [])],
    creator_notes: character.creator_notes,
    post_history_instructions: character.post_history_instructions,
  };

  const initialCommit: CharacterBranchCommit = {
    commitId: initialCommitId,
    message: "Initial commit",
    timestamp: new Date().toISOString(),
    author: "system",
    snapshot: initialSnapshot,
  };

  const mainBranch: CharacterBranch = {
    name: "main",
    createdAt: new Date().toISOString(),
    headCommitId: initialCommitId,
    description: "Default main canonical storyline",
  };

  const branchesData: CharacterBranchesData = {
    currentBranch: "main",
    branches: {
      main: mainBranch,
    },
    commits: {
      [initialCommitId]: initialCommit,
    },
  };

  if (!character.extensions) character.extensions = {};
  if (!character.extensions.chargenui) character.extensions.chargenui = { schemaVersion: 3 };
  character.extensions.chargenui.branches = branchesData;

  return branchesData;
}

/**
 * Lists all branches and current active branch.
 */
export function listBranches(character: RoleplayCharacter): {
  currentBranch: string;
  branches: CharacterBranch[];
} {
  const data = ensureBranchesData(character);
  return {
    currentBranch: data.currentBranch,
    branches: Object.values(data.branches),
  };
}

/**
 * Creates a new branch pointing to the specified commit (or the current head).
 */
export function createBranch(
  character: RoleplayCharacter,
  options: CreateBranchOptions
): { updatedCharacter: RoleplayCharacter; branch: CharacterBranch } {
  const data = ensureBranchesData(character);
  const { name, fromCommitId, description } = options;

  if (data.branches[name]) {
    throw new Error(`Branch '${name}' already exists.`);
  }

  const currentBranchObj = data.branches[data.currentBranch];
  const targetCommitId = fromCommitId || currentBranchObj?.headCommitId;

  if (!targetCommitId || !data.commits[targetCommitId]) {
    throw new Error(`Target commit '${targetCommitId}' not found.`);
  }

  const newBranch: CharacterBranch = {
    name,
    createdAt: new Date().toISOString(),
    headCommitId: targetCommitId,
    description: description || `Branch off ${targetCommitId}`,
  };

  data.branches[name] = newBranch;

  const updatedChar: RoleplayCharacter = {
    ...character,
    extensions: {
      ...character.extensions,
      chargenui: {
        ...(character.extensions?.chargenui || { schemaVersion: 3 }),
        branches: data,
      },
    },
  };

  return { updatedCharacter: updatedChar, branch: newBranch };
}

/**
 * Creates a commit on the current active branch.
 */
export function commitChanges(
  character: RoleplayCharacter,
  options: CommitOptions
): { updatedCharacter: RoleplayCharacter; commit: CharacterBranchCommit } {
  const data = ensureBranchesData(character);
  const currentBranch = data.branches[data.currentBranch];

  if (!currentBranch) {
    throw new Error(`Current branch '${data.currentBranch}' does not exist.`);
  }

  const commitId = `commit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const snapshot: Partial<RoleplayCharacter> = {
    name: options.character.name,
    personality: options.character.personality,
    description: options.character.description,
    scenario: options.character.scenario,
    first_mes: options.character.first_mes,
    alternate_greetings: [...(options.character.alternate_greetings || [])],
    tags: [...(options.character.tags || [])],
    creator_notes: options.character.creator_notes,
    post_history_instructions: options.character.post_history_instructions,
  };

  const newCommit: CharacterBranchCommit = {
    commitId,
    parentCommitId: currentBranch.headCommitId,
    message: options.message,
    timestamp: new Date().toISOString(),
    author: options.author || "user",
    snapshot,
  };

  data.commits[commitId] = newCommit;
  currentBranch.headCommitId = commitId;

  const updatedChar: RoleplayCharacter = {
    ...options.character,
    extensions: {
      ...options.character.extensions,
      chargenui: {
        ...(options.character.extensions?.chargenui || { schemaVersion: 3 }),
        branches: data,
      },
    },
  };

  return { updatedCharacter: updatedChar, commit: newCommit };
}

/**
 * Checks out a branch or commit, restoring the card state from that point in history.
 */
export function checkoutBranchOrCommit(
  character: RoleplayCharacter,
  targetNameOrCommitId: string
): RoleplayCharacter {
  const data = ensureBranchesData(character);

  let targetCommitId: string | undefined;
  let newCurrentBranch = data.currentBranch;

  if (data.branches[targetNameOrCommitId]) {
    newCurrentBranch = targetNameOrCommitId;
    targetCommitId = data.branches[targetNameOrCommitId].headCommitId;
  } else if (data.commits[targetNameOrCommitId]) {
    targetCommitId = targetNameOrCommitId;
  }

  if (!targetCommitId || !data.commits[targetCommitId]) {
    throw new Error(`Branch or commit '${targetNameOrCommitId}' not found.`);
  }

  const commit = data.commits[targetCommitId];
  data.currentBranch = newCurrentBranch;

  // Apply snapshot to character
  const restored: RoleplayCharacter = {
    ...character,
    ...commit.snapshot,
    extensions: {
      ...character.extensions,
      chargenui: {
        ...(character.extensions?.chargenui || { schemaVersion: 3 }),
        branches: data,
      },
    },
  };

  return restored;
}

/**
 * Computes difference between two snapshots or between current character and target commit.
 */
export function getDiff(
  fromSnap: Partial<RoleplayCharacter>,
  toSnap: Partial<RoleplayCharacter>
): Record<string, { from: any; to: any }> {
  const diffs: Record<string, { from: any; to: any }> = {};
  const allKeys = new Set([...Object.keys(fromSnap), ...Object.keys(toSnap)]);

  for (const key of allKeys) {
    if (key === "extensions") continue;
    const fromVal = (fromSnap as any)[key];
    const toVal = (toSnap as any)[key];

    if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
      diffs[key] = { from: fromVal, to: toVal };
    }
  }

  return diffs;
}

/**
 * Merges source branch into target branch (defaults to currentBranch).
 */
export function mergeBranches(
  character: RoleplayCharacter,
  sourceBranchName: string,
  targetBranchName?: string,
  mergeMessage?: string
): MergeResult {
  const data = ensureBranchesData(character);
  const targetName = targetBranchName || data.currentBranch;

  const sourceBranch = data.branches[sourceBranchName];
  const targetBranch = data.branches[targetName];

  if (!sourceBranch) throw new Error(`Source branch '${sourceBranchName}' not found.`);
  if (!targetBranch) throw new Error(`Target branch '${targetName}' not found.`);

  const sourceCommit = data.commits[sourceBranch.headCommitId];
  const targetCommit = data.commits[targetBranch.headCommitId];

  if (!sourceCommit || !targetCommit) {
    throw new Error("Unable to locate commit heads for merge.");
  }

  const conflictFields: string[] = [];
  const autoResolvedFields: string[] = [];
  const mergedSnapshot: Partial<RoleplayCharacter> = { ...targetCommit.snapshot };

  // Field by field merge
  const fieldsToCheck: Array<keyof RoleplayCharacter> = [
    "name",
    "description",
    "personality",
    "scenario",
    "first_mes",
    "creator_notes",
    "post_history_instructions",
  ];

  for (const field of fieldsToCheck) {
    const targetVal = targetCommit.snapshot[field];
    const sourceVal = sourceCommit.snapshot[field];

    if (sourceVal !== undefined && sourceVal !== targetVal) {
      if (!targetVal) {
        (mergedSnapshot as any)[field] = sourceVal;
        autoResolvedFields.push(field);
      } else {
        // Concatenate / combine gracefully or flag
        if (typeof targetVal === "string" && typeof sourceVal === "string") {
          // If differing substantially, adopt source or append
          (mergedSnapshot as any)[field] = `${targetVal}\n\n[Merged from ${sourceBranchName}]:\n${sourceVal}`;
          autoResolvedFields.push(field);
        } else {
          conflictFields.push(field);
        }
      }
    }
  }

  // Tags merge: union
  const mergedTags = Array.from(
    new Set([...(targetCommit.snapshot.tags || []), ...(sourceCommit.snapshot.tags || [])])
  );
  mergedSnapshot.tags = mergedTags;
  autoResolvedFields.push("tags");

  // Alternate greetings merge: union
  const mergedAlts = Array.from(
    new Set([
      ...(targetCommit.snapshot.alternate_greetings || []),
      ...(sourceCommit.snapshot.alternate_greetings || []),
    ])
  );
  mergedSnapshot.alternate_greetings = mergedAlts;
  autoResolvedFields.push("alternate_greetings");

  // Create merge commit
  const mergeCommitId = `commit_merge_${Date.now()}`;
  const commit: CharacterBranchCommit = {
    commitId: mergeCommitId,
    parentCommitId: targetBranch.headCommitId,
    message: mergeMessage || `Merge branch '${sourceBranchName}' into '${targetName}'`,
    timestamp: new Date().toISOString(),
    author: "merge-tool",
    snapshot: mergedSnapshot,
  };

  data.commits[mergeCommitId] = commit;
  targetBranch.headCommitId = mergeCommitId;

  const mergedCharacter: RoleplayCharacter = {
    ...character,
    ...mergedSnapshot,
    extensions: {
      ...character.extensions,
      chargenui: {
        ...(character.extensions?.chargenui || { schemaVersion: 3 }),
        branches: data,
      },
    },
  };

  return {
    mergedCharacter,
    conflictFields,
    autoResolvedFields,
    commitId: mergeCommitId,
  };
}
