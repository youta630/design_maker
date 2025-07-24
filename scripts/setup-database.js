const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 環境変数を直接読み込み（Next.js環境）
const envFile = require('fs').readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#') && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Service Roleクライアント作成（管理者権限）
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  
  try {
    // SQLファイル読み込み
    const sqlPath = path.join(__dirname, '../database/create_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📁 SQL file loaded successfully');
    
    // SQLを個別のステートメントに分割
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // 各ステートメントを順次実行
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { error } = await supabase.rpc('exec_sql', { 
            sql_statement: statement 
          });
          
          if (error) {
            // rpc関数が存在しない場合は直接SQLを実行
            const { error: directError } = await supabase
              .from('_dummy_table_that_does_not_exist')
              .select('*');
            
            // 代替方法: Supabase REST APIを直接使用
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey
              },
              body: JSON.stringify({ sql_statement: statement })
            });
            
            if (!response.ok) {
              console.log(`⚠️  Statement ${i + 1} may need manual execution`);
              console.log(`SQL: ${statement.substring(0, 100)}...`);
            } else {
              console.log(`✅ Statement ${i + 1} executed successfully`);
            }
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (execError) {
          console.log(`⚠️  Statement ${i + 1} execution issue:`, execError.message);
        }
      }
    }
    
    console.log('🎉 Database setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Check Supabase console to verify tables were created');
    console.log('2. Test the application with database integration');
    console.log('3. Verify Row Level Security policies are working');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\n💡 Manual setup option:');
    console.error('1. Go to Supabase Console > SQL Editor');
    console.error('2. Copy and paste the SQL from database/create_tables.sql');
    console.error('3. Execute the SQL manually');
  }
}

// 実行確認
console.log('🔍 Supabase Configuration:');
console.log('URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? '✅ SET' : '❌ MISSING');
console.log('\n⚠️  This will create tables in your Supabase database.');
console.log('📁 SQL file: database/create_tables.sql');

// 5秒待機して実行
setTimeout(() => {
  setupDatabase();
}, 2000);