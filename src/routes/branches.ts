import type { RequestHandler } from "../utils/router";
import type { RoleplayCharacter } from "../types/character";
import {
  ensureBranchesData,
  listBranches,
  createBranch,
  commitChanges,
  checkoutBranchOrCommit,
  getDiff,
  mergeBranches,
} from "../services/character/branches";
import { getSavedCard, saveCardRecord } from "../services/character/card-storage";

export const branchesRoutes: RequestHandler[] = [
  {
    method: "GET",
    path: "/api/characters/:id/branches",
    handler: async (req, params) => {
      const record = await getSavedCard(params.id);
      if (!record || !record.character) {
        return Response.json({ error: "Character not found" }, { status: 404 });
      }
      const branchesInfo = listBranches(record.character);
      const branchesData = ensureBranchesData(record.character);
      return Response.json({
        ...branchesInfo,
        commits: branchesData.commits,
      });
    },
  },
  {
    method: "POST",
    path: "/api/characters/:id/branches",
    handler: async (req, params) => {
      const record = await getSavedCard(params.id);
      if (!record || !record.character) {
        return Response.json({ error: "Character not found" }, { status: 404 });
      }
      const body = (await req.json().catch(() => ({}))) as {
        name: string;
        fromCommitId?: string;
        description?: string;
      };
      if (!body.name) {
        return Response.json({ error: "Branch name is required" }, { status: 400 });
      }

      try {
        const { updatedCharacter, branch } = createBranch(record.character, {
          name: body.name,
          fromCommitId: body.fromCommitId,
          description: body.description,
        });
        await saveCardRecord(updatedCharacter, record.avatarBase64, record.id);
        return Response.json({ success: true, branch });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    },
  },
  {
    method: "POST",
    path: "/api/characters/:id/commits",
    handler: async (req, params) => {
      const record = await getSavedCard(params.id);
      if (!record || !record.character) {
        return Response.json({ error: "Character not found" }, { status: 404 });
      }
      const body = (await req.json().catch(() => ({}))) as {
        message: string;
        author?: string;
        character?: RoleplayCharacter;
      };
      if (!body.message) {
        return Response.json({ error: "Commit message is required" }, { status: 400 });
      }

      const charToCommit = body.character || record.character;
      try {
        const { updatedCharacter, commit } = commitChanges(charToCommit, {
          message: body.message,
          author: body.author,
          character: charToCommit,
        });
        await saveCardRecord(updatedCharacter, record.avatarBase64, record.id);
        return Response.json({ success: true, commit });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    },
  },
  {
    method: "POST",
    path: "/api/characters/:id/checkout",
    handler: async (req, params) => {
      const record = await getSavedCard(params.id);
      if (!record || !record.character) {
        return Response.json({ error: "Character not found" }, { status: 404 });
      }
      const body = (await req.json().catch(() => ({}))) as {
        target: string; // branch name or commitId
      };
      if (!body.target) {
        return Response.json({ error: "Target branch or commit is required" }, { status: 400 });
      }

      try {
        const restored = checkoutBranchOrCommit(record.character, body.target);
        await saveCardRecord(restored, record.avatarBase64, record.id);
        return Response.json({ success: true, character: restored });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    },
  },
  {
    method: "POST",
    path: "/api/characters/:id/merge",
    handler: async (req, params) => {
      const record = await getSavedCard(params.id);
      if (!record || !record.character) {
        return Response.json({ error: "Character not found" }, { status: 404 });
      }
      const body = (await req.json().catch(() => ({}))) as {
        sourceBranch: string;
        targetBranch?: string;
        mergeMessage?: string;
      };
      if (!body.sourceBranch) {
        return Response.json({ error: "Source branch is required" }, { status: 400 });
      }

      try {
        const result = mergeBranches(
          record.character,
          body.sourceBranch,
          body.targetBranch,
          body.mergeMessage
        );
        await saveCardRecord(result.mergedCharacter, record.avatarBase64, record.id);
        return Response.json({
          success: true,
          mergedCharacter: result.mergedCharacter,
          conflictFields: result.conflictFields,
          autoResolvedFields: result.autoResolvedFields,
          commitId: result.commitId,
        });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    },
  },
  {
    method: "POST",
    path: "/api/characters/:id/diff",
    handler: async (req, params) => {
      const record = await getSavedCard(params.id);
      if (!record || !record.character) {
        return Response.json({ error: "Character not found" }, { status: 404 });
      }
      const body = (await req.json().catch(() => ({}))) as {
        fromCommitId: string;
        toCommitId?: string; // if omitted, compares to current character state
      };

      const branchesData = ensureBranchesData(record.character);
      const fromCommit = branchesData.commits[body.fromCommitId];
      if (!fromCommit) {
        return Response.json({ error: `Commit '${body.fromCommitId}' not found` }, { status: 404 });
      }

      const toSnap = body.toCommitId
        ? branchesData.commits[body.toCommitId]?.snapshot
        : record.character;

      if (!toSnap) {
        return Response.json({ error: `Commit '${body.toCommitId}' not found` }, { status: 404 });
      }

      const diff = getDiff(fromCommit.snapshot, toSnap);
      return Response.json({ diff });
    },
  },
];
