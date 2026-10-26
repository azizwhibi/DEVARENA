import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RankingsQueryDto } from './rankings-query.dto';

describe('RankingsQueryDto', () => {
  it('accepts all scopes and converts query pagination', async () => {
    for (const scope of ['global', 'country', 'institution', 'technology']) {
      const query = plainToInstance(RankingsQueryDto, {
        scope,
        search: 'Paris',
        page: '2',
        pageSize: '100',
      });
      expect(await validate(query)).toEqual([]);
      expect(query.page).toBe(2);
      expect(query.pageSize).toBe(100);
    }
  });
  it.each([
    { scope: 'private' },
    { search: 'x'.repeat(121) },
    { search: ['alice'] },
    { value: 'x'.repeat(121) },
    { page: '0' },
    { page: '1.5' },
    { pageSize: '101' },
  ])('rejects invalid scope/search/pagination %j', async (input) => {
    expect(
      await validate(plainToInstance(RankingsQueryDto, input)),
    ).not.toHaveLength(0);
  });
});
