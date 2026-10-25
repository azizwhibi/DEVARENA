import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { SupabaseService } from '../supabase/supabase.service';

const batchSize = 1000;

@Injectable()
export class AccountService {
  constructor(private readonly supabase: SupabaseService) {}

  async delete(userId: string, actorId: string): Promise<void> {
    if (!isUUID(userId) || !isUUID(actorId))
      throw new BadRequestException('Account IDs must be UUIDs');
    const bucket = this.supabase.client.storage.from('avatars');
    const paths = await this.avatarPaths(userId);
    for (let offset = 0; offset < paths.length; offset += batchSize) {
      const { error } = await bucket.remove(
        paths.slice(offset, offset + batchSize),
      );
      if (error)
        throw new InternalServerErrorException('Could not remove avatar files');
    }
    const { error: auditError } = await this.supabase.client
      .from('audit_log')
      .insert({
        actor_id: actorId,
        target_id: userId,
        action: 'account.deleted',
      });
    if (auditError)
      throw new InternalServerErrorException(
        'Could not record account deletion',
      );
    const { error } = await this.supabase.client.auth.admin.deleteUser(userId);
    if (error && error.code !== 'user_not_found') {
      throw new InternalServerErrorException('Could not delete account');
    }
  }

  private async avatarPaths(folder: string): Promise<string[]> {
    const paths: string[] = [];
    for (let offset = 0; ; offset += batchSize) {
      const { data, error } = await this.supabase.client.storage
        .from('avatars')
        .list(folder, {
          limit: batchSize,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        });
      if (error || !data)
        throw new InternalServerErrorException('Could not list avatar files');
      for (const file of data) {
        const path = `${folder}/${file.name}`;
        if (file.id === null) paths.push(...(await this.avatarPaths(path)));
        else paths.push(path);
      }
      if (data.length < batchSize) return paths;
    }
  }
}
