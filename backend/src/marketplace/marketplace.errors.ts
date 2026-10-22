import {
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

const KNOWN = new Set([
  'forbidden',
  'unavailable',
  'insufficient_credits',
  'kind_immutable',
  'purchased_item_not_draft',
  'purchased_item_not_deletable',
]);

export type RpcFailure = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function mapMarketplaceError(
  error: RpcFailure,
  rpc: string,
  userId: string,
  logger: Logger,
): HttpException {
  if (error.code === 'P0001' && KNOWN.has(error.message ?? '')) {
    const code = error.message ?? '';
    if (code === 'forbidden') {
      return new ForbiddenException({ message: 'Forbidden', code });
    }
    if (code === 'unavailable') {
      return new NotFoundException({ message: 'Unavailable', code });
    }
    return new ConflictException({ message: code, code });
  }
  const code = typeof error.code === 'string' ? error.code : 'unknown';
  logger.error(`code=${code} rpc=${rpc} user=${userId}`);
  return new InternalServerErrorException('An unexpected error occurred.');
}
