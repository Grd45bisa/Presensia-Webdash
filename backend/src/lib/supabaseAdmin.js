const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[Supabase Admin] SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi. Backend memakai fallback mock untuk endpoint yang mendukungnya.'
  );
  module.exports = null;
  return;
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = supabaseAdmin;
