import { BadRequestException } from '@nestjs/common';
import { AccountService } from './account.service';
import { SupabaseService } from '../supabase/supabase.service';

const userId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';

function setup() {
  const order: string[] = [];
  const list = jest.fn().mockImplementation(() => {
    order.push('list');
    return Promise.resolve({
      data: [{ id: 'file', name: 'avatar.png' }],
      error: null,
    });
  });
  const remove = jest.fn().mockImplementation(() => {
    order.push('remove');
    return Promise.resolve({ data: [], error: null });
  });
  const insert = jest.fn().mockImplementation(() => {
    order.push('audit');
    return Promise.resolve({ error: null });
  });
  const deleteUser = jest.fn().mockImplementation(() => {
    order.push('delete');
    return Promise.resolve({ data: {}, error: null });
  });
  const storageFrom = jest.fn().mockReturnValue({ list, remove });
  const from = jest.fn().mockReturnValue({ insert });
  const supabase = {
    client: {
      storage: { from: storageFrom },
      from,
      auth: { admin: { deleteUser } },
    },
  } as unknown as SupabaseService;
  return {
    service: new AccountService(supabase),
    list,
    remove,
    insert,
    deleteUser,
    storageFrom,
    from,
    order,
  };
}

describe('AccountService', () => {
  it('removes avatars, writes audit, then hard-deletes Auth in order', async () => {
    const s = setup();
    await s.service.delete(userId, actorId);
    expect(s.storageFrom).toHaveBeenCalledWith('avatars');
    expect(s.remove).toHaveBeenCalledWith([`${userId}/avatar.png`]);
    expect(s.from).toHaveBeenCalledWith('audit_log');
    expect(s.insert).toHaveBeenCalledWith({
      actor_id: actorId,
      target_id: userId,
      action: 'account.deleted',
    });
    expect(s.deleteUser).toHaveBeenCalledWith(userId);
    expect(s.order).toEqual(['list', 'remove', 'audit', 'delete']);
  });
  it('aborts before audit/delete on a list error', async () => {
    const s = setup();
    s.list.mockResolvedValue({ data: null, error: { message: 'unavailable' } });
    await expect(s.service.delete(userId, actorId)).rejects.toThrow();
    expect(s.remove).not.toHaveBeenCalled();
    expect(s.insert).not.toHaveBeenCalled();
    expect(s.deleteUser).not.toHaveBeenCalled();
  });
  it('aborts before audit/delete on a removal error', async () => {
    const s = setup();
    s.remove.mockResolvedValue({ error: { message: 'unavailable' } });
    await expect(s.service.delete(userId, actorId)).rejects.toThrow();
    expect(s.insert).not.toHaveBeenCalled();
    expect(s.deleteUser).not.toHaveBeenCalled();
  });
  it('aborts before Auth deletion on an audit error', async () => {
    const s = setup();
    s.insert.mockResolvedValue({ error: { message: 'unavailable' } });
    await expect(s.service.delete(userId, actorId)).rejects.toThrow();
    expect(s.deleteUser).not.toHaveBeenCalled();
  });
  it('succeeds when the Auth user is already absent', async () => {
    const s = setup();
    s.list.mockResolvedValue({ data: [], error: null });
    s.deleteUser.mockResolvedValue({
      error: { code: 'user_not_found', status: 404 },
    });
    await expect(s.service.delete(userId, actorId)).resolves.toBeUndefined();
    expect(s.remove).not.toHaveBeenCalled();
  });
  it('propagates other Auth errors', async () => {
    const s = setup();
    s.deleteUser.mockResolvedValue({
      error: { code: 'unexpected_failure', status: 500 },
    });
    await expect(s.service.delete(userId, actorId)).rejects.toThrow();
  });
  it('lists every page before deleting files, then removes in bounded batches', async () => {
    const s = setup();
    s.list
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: String(i),
          name: `${i}.png`,
        })),
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ id: 'last', name: 'last.png' }],
        error: null,
      });
    await s.service.delete(userId, actorId);
    expect(s.list).toHaveBeenNthCalledWith(1, userId, {
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });
    expect(s.list).toHaveBeenNthCalledWith(2, userId, {
      limit: 1000,
      offset: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });
    expect(s.remove).toHaveBeenCalledTimes(2);
    expect(s.remove).toHaveBeenLastCalledWith([`${userId}/last.png`]);
  });
  it('includes files in nested user folders', async () => {
    const s = setup();
    s.list
      .mockResolvedValueOnce({ data: [{ id: null, name: 'old' }], error: null })
      .mockResolvedValueOnce({
        data: [{ id: 'file', name: 'avatar.png' }],
        error: null,
      });
    await s.service.delete(userId, actorId);
    expect(s.list).toHaveBeenCalledWith(`${userId}/old`, expect.any(Object));
    expect(s.remove).toHaveBeenCalledWith([`${userId}/old/avatar.png`]);
  });
  it('validates UUIDs before touching storage', async () => {
    const s = setup();
    await expect(
      s.service.delete('../other-user', actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.service.delete(userId, 'invalid')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(s.storageFrom).not.toHaveBeenCalled();
  });
});
