import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: Context) {
  // Auth check
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

  try {
    const { id } = await context.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid spec ID format' }, { status: 400 });
    }

    // Fetch spec with RLS ensuring user ownership
    const { data: spec, error: fetchError } = await supabase
      .from('specs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !spec) {
      if (fetchError?.code === 'PGRST116') { // No rows returned
        return NextResponse.json({ error: 'Specification not found' }, { status: 404 });
      }
      console.error('Spec fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch specification' }, { status: 500 });
    }

    // Return the spec
    return NextResponse.json({
      id: spec.id,
      modality: spec.modality,
      sourceMeta: spec.source_meta,
      spec: spec.spec,
      createdAt: spec.created_at
    });

  } catch (error) {
    console.error('Spec retrieval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}