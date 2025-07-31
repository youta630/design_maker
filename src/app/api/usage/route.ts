import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const { data: monthlyUsage, error: usageError } = await supabase
      .from('usage_monthly')
      .select('count, limit_count')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .single();

    const usageCount = usageError?.code === 'PGRST116' ? 0 : (monthlyUsage?.count || 0);
    
    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Usage query error:', usageError);
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }

    return NextResponse.json({
      usageCount,
      monthlyLimit: monthlyUsage?.limit_count || 50,
      currentMonth
    });

  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

