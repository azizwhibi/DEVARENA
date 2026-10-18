import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProblemDetailsFilter } from './problem-details.filter';

describe('ProblemDetailsFilter', () => {
  function respond(error: unknown) {
    const status = jest.fn().mockReturnThis();
    const type = jest.fn().mockReturnThis();
    const json = jest.fn();
    const setHeader = jest.fn();
    const response = { status, type, json, setHeader } as unknown as Response;
    const request = { originalUrl: '/test' } as Request;
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
    new ProblemDetailsFilter().catch(error, host);
    return { status, type, json, setHeader };
  }

  it('returns validation errors as RFC 7807 problem details', () => {
    const result = respond(new BadRequestException(['username must be valid']));
    expect(result.status).toHaveBeenCalledWith(400);
    expect(result.type).toHaveBeenCalledWith('application/problem+json');
    expect(result.json).toHaveBeenCalledWith({
      type: 'about:blank',
      title: 'BAD_REQUEST',
      status: 400,
      detail: 'Request validation failed.',
      instance: '/test',
      errors: ['username must be valid'],
    });
  });

  it('includes the Bearer challenge on unauthorized responses', () => {
    const result = respond(new UnauthorizedException());
    expect(result.status).toHaveBeenCalledWith(401);
    expect(result.setHeader).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer');
  });

  it('retains a stable application error code', () => {
    const result = respond(
      new BadRequestException({
        message: 'Invalid input',
        code: 'invalid_input',
      }),
    );
    expect(result.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'invalid_input' }),
    );
  });

  it('does not disclose internal exceptions or stack traces', () => {
    const logger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    try {
      const result = respond(new Error('private database connection details'));
      expect(result.status).toHaveBeenCalledWith(500);
      expect(result.json).toHaveBeenCalledWith({
        type: 'about:blank',
        title: 'INTERNAL_SERVER_ERROR',
        status: 500,
        detail: 'An unexpected error occurred.',
        instance: '/test',
      });
    } finally {
      logger.mockRestore();
    }
  });
});
