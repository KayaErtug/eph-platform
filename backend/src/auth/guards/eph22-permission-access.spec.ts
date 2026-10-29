import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AdminController } from '../../admin/admin.controller';
import { AdminAnnouncementsController } from '../../admin/announcements/admin-announcements.controller';
import { ApplicationsController } from '../../applications/applications.controller';
import { KontorController } from '../../kontor/kontor.controller';
import { LeadsController } from '../../leads/leads.controller';
import { NominationsController } from '../../nominations/nominations.controller';
import { OrganizationController } from '../../organization/organization.controller';
import { UnitsController } from '../../units/units.controller';
import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { resolvePermission } from '../permission.resolver';
import { PermissionGuard } from './permission.guard';
import { RolesGuard } from './roles.guard';

// SQL is read, never executed. Model INSERT ... ON CONFLICT DO NOTHING against
// the anonymous read-only production snapshot of 2026-10-29 18:37 UTC.
const sql = readFileSync(join(__dirname, '../../../prisma/migrations/20261029100000_eph22_admin_permission_catalog/migration.sql'), 'utf8');
const definitions = [...sql.matchAll(/gen_random_uuid\(\)::text, '([A-Z_]+)'[^\n]+?, (true|false), (true|false), (true|false), (true|false), CURRENT_TIMESTAMP/g)].map(match => ({
  id: match[1], key: match[1], defaultEnabled: match[2] === 'true',
  delegable: match[3] === 'true', superAdminOnly: match[4] === 'true', active: match[5] === 'true',
  defaultNumericLimit: null, metadata: null,
}));
const adminInsert = sql.slice(sql.indexOf("'ADMIN'::\"Role\""));
const insertedKeys = [...adminInsert.slice(adminInsert.indexOf(' IN (')).matchAll(/'([A-Z_]+)'/g)].map(match => match[1]);
const previouslyDenied = new Set(['USER_DELETE', 'ROLE_CHANGE', 'CAPABILITY_MANAGE']);
const existingEnabled = ['DOCUMENT_VIEW', 'DOCUMENT_APPROVE', 'DOCUMENT_REJECT', 'REPORT_VIEW', 'USER_APPROVE', 'USER_SUSPEND', 'TRIAL_EXTEND'];
const controllers = [AdminController, AdminAnnouncementsController, ApplicationsController, KontorController, LeadsController, NominationsController, OrganizationController, UnitsController];
const endpoints = controllers.flatMap(controller => Object.getOwnPropertyNames(controller.prototype)
  .filter(name => Reflect.hasMetadata(METHOD_METADATA, controller.prototype[name]))
  .map(name => ({ controller, name, handler: controller.prototype[name], key: Reflect.getMetadata(REQUIRED_PERMISSION_KEY, controller.prototype[name]) as string | undefined })));
const protectedEndpoints = endpoints.filter(endpoint => endpoint.key);

describe('EPH-22 migration and endpoint access regression', () => {
  const reflector = new Reflector();
  let prisma: any;
  let policies: Map<string, any>;
  let catalog: Map<string, any>;
  let override: any;
  const context = (endpoint: typeof endpoints[number], role: Role) => ({
    getHandler: () => endpoint.handler, getClass: () => endpoint.controller,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'anonymous-admin', role } }) }),
  }) as unknown as ExecutionContext;

  beforeEach(() => {
    catalog = new Map(definitions.map(definition => [definition.key, { ...definition }]));
    policies = new Map();
    override = null;
    for (const key of [...existingEnabled, ...previouslyDenied]) {
      catalog.get(key).defaultEnabled = !previouslyDenied.has(key);
      policies.set(key, { enabled: !previouslyDenied.has(key), numericLimit: key === 'TRIAL_EXTEND' ? 1 : null, metadata: null });
    }
    for (const key of insertedKeys) {
      if (!policies.has(key) && !catalog.get(key)?.superAdminOnly) policies.set(key, { enabled: true });
    }
    prisma = {
      permissionDefinition: { findUnique: jest.fn(async ({ where }) => catalog.get(where.key)) },
      rolePermissionPolicy: { findUnique: jest.fn(async ({ where }) => policies.get(where.role_permissionId.permissionId) || null) },
      userPermissionOverride: { findUnique: jest.fn(async () => override) },
    };
  });

  it('migration only inserts; ADMIN policy covers exactly the new guarded keys', () => {
    expect(definitions).toHaveLength(36);
    expect(protectedEndpoints.length).toBeGreaterThan(50);
    expect(new Set(insertedKeys)).toEqual(new Set(protectedEndpoints.map(endpoint => endpoint.key)));
    const statements = sql.replace(/--[^\n]*/g, '').split(/;\s*(?=INSERT|$)/).map(value => value.trim()).filter(Boolean);
    expect(statements).toHaveLength(3);
    for (const statement of statements) {
      expect(statement).toMatch(/^INSERT INTO/);
      expect(statement).toMatch(/ON CONFLICT\s*\([^)]*\)\s*DO NOTHING$/);
    }
    for (const endpoint of protectedEndpoints) {
      const guards = [...(Reflect.getMetadata(GUARDS_METADATA, endpoint.controller) || []), ...(Reflect.getMetadata(GUARDS_METADATA, endpoint.handler) || [])];
      expect(guards).toContain(PermissionGuard);
      expect(guards).toContain(RolesGuard);
    }
  });

  it.each(protectedEndpoints.filter(endpoint => !previouslyDenied.has(endpoint.key!)).map(endpoint => [endpoint.controller.name, endpoint.name, endpoint] as const))(
    'migration sonrası ADMIN rolü önceki uçlarına erişir: %s.%s', async (_controller, _name, endpoint) => {
      const ctx = context(endpoint, Role.ADMIN);
      expect(new RolesGuard(reflector).canActivate(ctx)).toBe(true);
      await expect(new PermissionGuard(reflector, prisma).canActivate(ctx)).resolves.toBe(true);
    },
  );

  it.each([...previouslyDenied])('mevcut kapalı politika değişmez: %s', async key => {
    expect(policies.get(key).enabled).toBe(false);
    expect((await resolvePermission(prisma, 'admin', Role.ADMIN, key)).enabled).toBe(false);
  });

  it('TRIAL_EXTEND existing numeric limit survives; active override still wins', async () => {
    expect((await resolvePermission(prisma, 'admin', Role.ADMIN, 'TRIAL_EXTEND')).numericLimit).toBe(1);
    override = { enabled: false, numericLimit: null, validFrom: null, validUntil: null };
    expect((await resolvePermission(prisma, 'admin', Role.ADMIN, 'USER_VIEW')).enabled).toBe(false);
    override = { ...override, validUntil: new Date(0) };
    expect((await resolvePermission(prisma, 'admin', Role.ADMIN, 'USER_VIEW')).enabled).toBe(true);
  });

  it.each(definitions.filter(definition => definition.superAdminOnly))('superAdminOnly anahtarlarda ADMIN 403 alır: $key', async definition => {
    policies.set(definition.key, { enabled: true });
    override = { enabled: true, validFrom: null, validUntil: null };
    const handler = () => undefined;
    Reflect.defineMetadata(REQUIRED_PERMISSION_KEY, definition.key, handler);
    const ctx = context({ controller: AdminController, name: definition.key, handler, key: definition.key }, Role.ADMIN);
    await expect(new PermissionGuard(reflector, prisma).canActivate(ctx)).rejects.toMatchObject({ status: 403 });
  });

  it.each(endpoints.map(endpoint => [endpoint.controller.name, endpoint.name, endpoint] as const))(
    'SUPER_ADMIN her uca erişir (rol + yetki guard): %s.%s', async (_controller, _name, endpoint) => {
      const ctx = context(endpoint, Role.SUPER_ADMIN);
      expect(new RolesGuard(reflector).canActivate(ctx)).toBe(true);
      await expect(new PermissionGuard(reflector, prisma).canActivate(ctx)).resolves.toBe(true);
      expect(prisma.permissionDefinition.findUnique).not.toHaveBeenCalled();
    },
  );

  it('SUPER_ADMIN catalog keys bypass disabled definitions, policies and overrides', async () => {
    for (const definition of definitions) {
      catalog.get(definition.key).active = false;
      policies.set(definition.key, { enabled: false });
      override = { enabled: false };
      expect((await resolvePermission(prisma, 'super', Role.SUPER_ADMIN, definition.key)).enabled).toBe(true);
    }
  });

  it('existing SUPER_ADMIN-only routes reject ADMIN at the roles guard', () => {
    const guard = new RolesGuard(reflector);
    for (const name of ['getUserMembershipPackages', 'updateUserMembership', 'getSystemSettings', 'updateSystemSetting', 'getPermissionDefinitions', 'getUserPermissionProfile', 'setUserPermissionsBulk', 'updateUserPermissionOverride', 'deleteUserPermissionOverride']) {
      const endpoint = endpoints.find(item => item.controller === AdminController && item.name === name)!;
      expect(guard.canActivate(context(endpoint, Role.ADMIN))).toBe(false);
    }
    const endpoint = endpoints.find(item => item.controller === KontorController && item.name === 'yukleHediyeHavuzu')!;
    expect(guard.canActivate(context(endpoint, Role.ADMIN))).toBe(false);
  });
});
