import { NestFactory } from '@nestjs/core';
import express = require('express');
import request = require('supertest');

jest.mock('./app.module', () => ({ AppModule: class AppModule {} }));
jest.mock('@nestjs/core', () => ({ NestFactory: { create: jest.fn() } }));

describe('EPH-35 bootstrap HTTP cache policy', () => {
  it('disables Express ETag so a conditional ticker GET still returns a JSON body', async () => {
    const server = express();
    server.get('/api/market/ticker', (_req, res) => res.json({ items: [{ code: 'USD', value: 50 }] }));
    const before = await request(server).get('/api/market/ticker');
    expect(before.headers.etag).toBeDefined();
    await request(server).get('/api/market/ticker').set('If-None-Match', before.headers.etag).expect(304);

    const app = {
      getHttpAdapter: () => ({ getInstance: () => server }),
      useGlobalPipes: jest.fn(),
      enableCors: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    jest.mocked(NestFactory.create).mockResolvedValue(app as any);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await import('./main');
      expect(server.get('etag')).toBe(false);
      expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
      expect(app.enableCors).toHaveBeenCalledTimes(1);
      expect(app.listen).toHaveBeenCalledWith(Number(process.env.PORT || 3001));
      const after = await request(server).get('/api/market/ticker').set('If-None-Match', before.headers.etag).expect(200);
      expect(after.headers.etag).toBeUndefined();
      expect(after.body).toEqual(before.body);
      expect(after.text.length).toBeGreaterThan(0);
    } finally {
      log.mockRestore();
    }
  });
});
