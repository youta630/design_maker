/**
 * Supabase Setup Utilities
 * 
 * Ensures required database structures exist in production
 * Handles bucket creation and RLS policies programmatically
 */

import { createClient } from '@supabase/supabase-js';

// Service role client for admin operations
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Ensures the design-files bucket exists with proper configuration
 */
export async function ensureDesignFilesBucket(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceRoleClient();
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      return { success: false, error: `Failed to list buckets: ${listError.message}` };
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'design-files');
    
    if (!bucketExists) {
      // Create bucket
      const { error: createError } = await supabase.storage.createBucket('design-files', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });
      
      if (createError) {
        return { success: false, error: `Failed to create bucket: ${createError.message}` };
      }
    }
    
    return { success: true };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during bucket setup' 
    };
  }
}

/**
 * Ensures required database tables exist
 */
export async function ensureDatabaseTables(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceRoleClient();
    
    // Check if tables exist by querying them
    const { error: usageError } = await supabase
      .from('usage_monthly')
      .select('count')
      .limit(1);
    
    const { error: specsError } = await supabase
      .from('specs')
      .select('id')
      .limit(1);
    
    // If either table doesn't exist, we need manual SQL execution
    if (usageError?.code === '42P01' || specsError?.code === '42P01') {
      return {
        success: false,
        error: 'Database tables not found. Please run the SQL migration manually in Supabase Dashboard.'
      };
    }
    
    return { success: true };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

/**
 * Performs complete setup check and initialization
 */
export async function performSetupCheck(): Promise<{
  bucket: { success: boolean; error?: string };
  database: { success: boolean; error?: string };
}> {
  const [bucketResult, databaseResult] = await Promise.all([
    ensureDesignFilesBucket(),
    ensureDatabaseTables()
  ]);
  
  return {
    bucket: bucketResult,
    database: databaseResult
  };
}

/**
 * Creates increment_monthly_usage function if it doesn't exist
 */
export async function ensureIncrementFunction(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceRoleClient();
    
    // Try to execute the function - if it fails, it doesn't exist
    const { error } = await supabase.rpc('increment_monthly_usage', {
      p_user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      p_month: '1970-01'
    });
    
    if (error && error.code === '42883') {
      // Function doesn't exist, create it
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION increment_monthly_usage(p_user_id UUID, p_month TEXT)
        RETURNS INTEGER AS $$
        DECLARE
          new_count INTEGER;
        BEGIN
          INSERT INTO usage_monthly (user_id, month, count, limit_count)
          VALUES (p_user_id, p_month, 1, 50)
          ON CONFLICT (user_id, month)
          DO UPDATE SET count = usage_monthly.count + 1
          RETURNING count INTO new_count;
          
          RETURN new_count;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      const { error: createError } = await supabase.rpc('sql', { query: createFunctionSQL });
      
      if (createError) {
        return { success: false, error: `Failed to create function: ${createError.message}` };
      }
    }
    
    return { success: true };
    
  } catch (error) {
    return {
      success: false,  
      error: error instanceof Error ? error.message : 'Unknown function setup error'
    };
  }
}