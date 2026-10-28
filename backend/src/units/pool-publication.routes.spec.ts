import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';

describe('Pool publication HTTP contract', () => {
  it('registers the authenticated publication quote GET route', () => {
    assert.equal(Reflect.getMetadata(PATH_METADATA, UnitsController.prototype.publicationQuote), ':id/publication-quote');
    assert.equal(Reflect.getMetadata(METHOD_METADATA, UnitsController.prototype.publicationQuote), RequestMethod.GET);
    assert.ok(Reflect.getMetadata(GUARDS_METADATA, UnitsController).includes(JwtAuthGuard));
    assert.ok(Reflect.getMetadata(GUARDS_METADATA, UnitsController.prototype.publicationQuote).includes(RolesGuard));
    assert.deepEqual(Reflect.getMetadata(ROLES_KEY, UnitsController.prototype.publicationQuote), [Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN]);
  });
  it('forwards quote wallet selection and actor ID unchanged', async () => {
    const query = { walletSource: 'OFFICE', walletOfficeId: 'office-1', expectedActorId: 'actor-1' };
    const user = { id: 'actor-1', role: Role.EMLAKCI };
    const controller = new UnitsController({ publicationQuote: async (id: string, actor: unknown, body: unknown) => { assert.equal(id, 'unit-1'); assert.equal(actor, user); assert.equal(body, query); return { costPk: 50 }; } } as unknown as UnitsService);
    await controller.publicationQuote('unit-1', user, query);
  });
  it('forwards request key and expected price to the publication service', async () => {
    const body = { requestId: 'publication-request-1', expectedActorId: 'actor-1', walletSource: 'PERSONAL', expectedCostPk: 50 };
    const user = { id: 'actor-1', role: Role.EMLAKCI };
    const controller = new UnitsController({ submitApproval: async (id: string, actor: unknown, input: unknown) => { assert.equal(id, 'unit-1'); assert.equal(actor, user); assert.equal(input, body); return { billing: { spent: 50 } }; } } as unknown as UnitsService);
    await controller.submitApproval('unit-1', user, body);
  });
});
