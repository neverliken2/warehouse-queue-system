import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key for cron operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current date in Bangkok timezone
    const now = new Date();
    const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const today = bangkokTime.toISOString().split('T')[0];

    // Delete queues from previous days
    const { data, error } = await supabaseAdmin
      .from('queues')
      .delete()
      .lt('created_at', today)
      .select();

    if (error) {
      console.error('Error clearing queues:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const deletedCount = data?.length || 0;
    console.log(`Cleared ${deletedCount} queues at ${bangkokTime.toISOString()}`);

    return NextResponse.json({
      success: true,
      message: `Cleared ${deletedCount} queues`,
      timestamp: bangkokTime.toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
