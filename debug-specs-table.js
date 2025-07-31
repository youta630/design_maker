const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugSpecsTable() {
  console.log('🔍 Debugging specs table...\n');

  // 1. Check existing modality values
  console.log('1. Checking existing modality values:');
  const { data: modalityData, error: modalityError } = await supabase
    .from('specs')
    .select('modality')
    .limit(20);

  if (modalityError) {
    console.error('❌ Error fetching modality data:', modalityError);
  } else {
    const uniqueModalities = [...new Set(modalityData.map(row => row.modality))];
    console.log('   Existing modality values:', uniqueModalities);
  }

  // 2. Try to get table schema info
  console.log('\n2. Checking table constraints:');
  const { data: constraintData, error: constraintError } = await supabase
    .rpc('sql', { 
      query: `
        SELECT 
          conname as constraint_name,
          pg_get_constraintdef(oid) as constraint_definition
        FROM pg_constraint 
        WHERE conrelid = 'specs'::regclass 
        AND contype = 'c'
        AND conname LIKE '%modality%';
      `
    });

  if (constraintError) {
    console.error('❌ Error fetching constraints:', constraintError);
    
    // Try alternative approach
    console.log('\n   Trying alternative constraint query...');
    const { data: altConstraintData, error: altConstraintError } = await supabase
      .from('information_schema.check_constraints')
      .select('constraint_name, check_clause')
      .like('constraint_name', '%modality%');
    
    if (altConstraintError) {
      console.error('❌ Alternative constraint query failed:', altConstraintError);
    } else {
      console.log('   Alternative constraint results:', altConstraintData);
    }
  } else {
    console.log('   Constraint results:', constraintData);
  }

  // 3. Test different modality values
  console.log('\n3. Testing different modality values by attempting inserts:');
  const testUserId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
  const testModalities = ['ui-generation', 'emotion-ui', 'design', 'spec'];

  for (const testModality of testModalities) {
    const { error: testError } = await supabase
      .from('specs')
      .insert({
        user_id: testUserId,
        modality: testModality,
        source_meta: { test: true },
        spec: { test: true }
      })
      .select()
      .single();

    if (testError) {
      if (testError.code === '23514') {
        console.log(`   ❌ "${testModality}" - violates check constraint`);
      } else {
        console.log(`   ⚠️  "${testModality}" - other error:`, testError.message);
      }
    } else {
      console.log(`   ✅ "${testModality}" - would be accepted`);
      // Clean up test record
      await supabase
        .from('specs')
        .delete()
        .eq('user_id', testUserId)
        .eq('modality', testModality);
    }
  }

  console.log('\n🔍 Debug completed');
}

debugSpecsTable().catch(console.error);