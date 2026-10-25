import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import WebSocket from 'ws';

/** Service-role client: bypasses RLS. Never expose it or its key to the frontend. */
@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient<Database>;

  constructor(config: ConfigService) {
    const supabaseUrl =
      config.get<string>('SUPABASE_URL') ||
      process.env.SUPABASE_URL ||
      'https://qorlygdcfwnrrzvzulcz.supabase.co';
    const serviceRoleKey =
      config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      'sb_secret_dummy_replace_with_real_service_key';

    this.client = createClient<Database>(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        // Node 20 has no global WebSocket; realtime needs `ws` there.
        realtime: { transport: WebSocket as never },
      },
    );
  }
}
