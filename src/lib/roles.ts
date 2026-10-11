import type { UserResponse } from "@/services/types/api";
import type { Actor } from "@/types/domain";

/** Role identifiers used by the backend (`users.role`). */
export const ROLES = {
  admin: "admin",
  complianceOfficer: "compliance_officer",
  complianceAnalyst: "compliance_analyst",
  auditor: "auditor",
} as const;

/** Display labels for backend roles. Unknown roles fall back to a title-cased identifier. */
const ROLE_LABELS: Record<string, string> = {
  [ROLES.admin]: "Administrator",
  [ROLES.complianceOfficer]: "Compliance Officer",
  [ROLES.complianceAnalyst]: "Compliance Analyst",
  [ROLES.auditor]: "Auditor",
};

export function roleLabel(role: string): string {
  return (
    ROLE_LABELS[role] ??
    role
      .split("_")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

/** Permission strings checked by the backend. Mirrors app/core/auth.py ROLE_PERMISSIONS. */
export const PERMISSIONS = {
  runPipeline: "pipeline:run",
  uploadDocuments: "documents:upload",
  editObligations: "obligations:edit",
  verifyMappings: "mappings:verify",
  signOffGaps: "gaps:signoff",
  dismissGaps: "gaps:dismiss",
  createRemediations: "remediations:create",
  approveRemediations: "remediations:approve",
  manageUsers: "users:manage",
} as const;

/** True when the user holds the permission. users:manage implies every permission, as on the server. */
export function hasPermission(
  user: Pick<UserResponse, "permissions">,
  permission: string,
): boolean {
  return (
    user.permissions.includes(permission) || user.permissions.includes(PERMISSIONS.manageUsers)
  );
}

/** How the signed-in user is shown in the UI. */
export function toActor(user: UserResponse): Actor {
  return {
    id: user.id,
    name: user.full_name,
    role: roleLabel(user.role),
    initials: user.initials,
  };
}
