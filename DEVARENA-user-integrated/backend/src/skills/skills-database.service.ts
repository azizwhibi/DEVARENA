import { Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService as IdentityDatabase } from '../supabase/supabase.service';

/** Reuses Aziz's server client; skill schema additions stay local to this module. */
@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor(identity: IdentityDatabase) {
    this.client = identity.client as unknown as SupabaseClient;
  }
}
