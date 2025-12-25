import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client (to fetch travelers)
// We use the anon key here for simplicity, assuming RLS allows reading travelers if public or if we were using a service key.
// Ideally, this should use a SERVICE_ROLE_KEY for backend operations to bypass RLS, 
// but since we don't have it in .env.local (based on previous read), we'll try with the existing client setup or just the anon key.
// If RLS is strict, this might fail without a user token. 
// However, usually in these demos, we might have public read on travelers or we can pass the user's auth token from the client.
// Let's assume we pass the auth header from the request to Supabase.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const { MessagingApiClient } = messagingApi;

const client = new MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

export async function POST(req: Request) {
  try {
    const { groupId, template } = await req.json();

    if (!groupId || !template) {
      return NextResponse.json({ error: 'Missing groupId or template' }, { status: 400 });
    }

    // 1. Fetch Travelers with LINE UIDs
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: travelers, error } = await supabase
      .from('travelers')
      .select('line_uid, full_name')
      .eq('group_id', groupId)
      .not('line_uid', 'is', null);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch travelers' }, { status: 500 });
    }

    if (!travelers || travelers.length === 0) {
      return NextResponse.json({ message: 'No travelers with LINE connection found' });
    }

    const userIds = travelers.map(t => t.line_uid).filter(uid => uid !== null) as string[];

    // Deduplicate UIDs
    const uniqueUserIds = Array.from(new Set(userIds));

    if (uniqueUserIds.length === 0) {
      return NextResponse.json({ message: 'No valid LINE UIDs found' });
    }

    // 2. Construct LINE Message
    // We'll send a Flex Message or an Image + Text
    const messages: messagingApi.Message[] = [];

    if (template.template_image_url) {
      messages.push({
        type: 'image',
        originalContentUrl: template.template_image_url,
        previewImageUrl: template.template_image_url
      });
    }

    if (template.instruction_text) {
      messages.push({
        type: 'text',
        text: `【入境卡填寫指南】\n${template.instruction_text}`
      });
    }

    // 3. Send Multicast Message
    // Note: Multicast might have limits on the free tier, but it's the correct API for "sending to multiple users".
    // If userIds > 150 (limit varies), we might need to chunk.
    // For this demo, we assume small groups.
    
    if (messages.length > 0) {
        await client.multicast({
            to: uniqueUserIds,
            messages: messages,
        });
    }

    return NextResponse.json({ success: true, count: uniqueUserIds.length });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
