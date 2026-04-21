
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectData() {
  console.log('--- PROFILES ---');
  const { data: profiles } = await supabase.from('profiles').select('*').limit(3);
  console.table(profiles);

  console.log('\n--- PACKAGES ---');
  const { data: packages } = await supabase.from('packages').select('id, resi, sender_name, receiver_name, status, created_at').limit(5);
  console.table(packages);

  console.log('\n--- BAGS (KARUNG) ---');
  const { data: bags } = await supabase.from('bags').select('*').limit(3);
  console.table(bags);
}

inspectData();
