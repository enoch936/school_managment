import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '../constants/permissions';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Requires the caller to hold every listed permission (AND semantics).
 * Permissions are resolved server-side from the database, never from client input.
 */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
