import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { UserRole } from '../../generated/prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { HOST_DISPLAY_NAME_MAX_LENGTH } from './dto/update-host.dto';
import { HostsController } from './hosts.controller';
import { HostsService } from './hosts.service';

describe('HostsController', () => {
  let app: INestApplication;
  let role: UserRole;
  const updateDisplayName = jest.fn();
  const deleteHost = jest.fn();

  beforeEach(async () => {
    role = 'ADMIN';
    updateDisplayName.mockReset();
    deleteHost.mockReset();

    const authGuard: CanActivate = {
      canActivate(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest<{
          user?: { id: string; role: UserRole };
        }>();
        req.user = { id: 'user-1', role };
        return true;
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [HostsController],
      providers: [
        Reflector,
        {
          provide: HostsService,
          useValue: { updateDisplayName, deleteHost },
        },
        { provide: APP_GUARD, useValue: authGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('lets an admin update the display name', async () => {
    updateDisplayName.mockResolvedValue({
      id: 'host-1',
      hostname: 'ip-10-0-0-1',
      displayName: 'prod-web-1',
    });

    const res = await request(app.getHttpServer() as App)
      .patch('/hosts/host-1')
      .send({ displayName: '  prod-web-1  ' })
      .expect(200);

    expect(updateDisplayName).toHaveBeenCalledWith('host-1', 'prod-web-1');
    expect(res.body).toEqual(
      expect.objectContaining({ displayName: 'prod-web-1' }),
    );
  });

  it('forbids VIEWER from updating the display name', async () => {
    role = 'VIEWER';

    await request(app.getHttpServer() as App)
      .patch('/hosts/host-1')
      .send({ displayName: 'prod-web-1' })
      .expect(403);

    expect(updateDisplayName).not.toHaveBeenCalled();
  });

  it('rejects an empty display name', async () => {
    await request(app.getHttpServer() as App)
      .patch('/hosts/host-1')
      .send({ displayName: '   ' })
      .expect(400);

    expect(updateDisplayName).not.toHaveBeenCalled();
  });

  it('rejects a display name that is too long', async () => {
    await request(app.getHttpServer() as App)
      .patch('/hosts/host-1')
      .send({ displayName: 'a'.repeat(HOST_DISPLAY_NAME_MAX_LENGTH + 1) })
      .expect(400);

    expect(updateDisplayName).not.toHaveBeenCalled();
  });

  it('returns 404 when the host does not exist', async () => {
    updateDisplayName.mockResolvedValue(null);

    await request(app.getHttpServer() as App)
      .patch('/hosts/missing')
      .send({ displayName: 'prod-web-1' })
      .expect(404);
  });

  describe('DELETE /hosts/:id', () => {
    it('lets an admin delete a host', async () => {
      deleteHost.mockResolvedValue(undefined);

      await request(app.getHttpServer() as App)
        .delete('/hosts/host-1')
        .expect(200);

      expect(deleteHost).toHaveBeenCalledWith('host-1');
    });

    it('forbids VIEWER from deleting a host', async () => {
      role = 'VIEWER';

      await request(app.getHttpServer() as App)
        .delete('/hosts/host-1')
        .expect(403);

      expect(deleteHost).not.toHaveBeenCalled();
    });
  });
});
