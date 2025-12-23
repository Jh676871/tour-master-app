import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received LINE Webhook:', JSON.stringify(body, null, 2));

    // LINE Webhook verification usually sends an empty events array
    // We just need to return 200 OK to pass the verification
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    // Even on error, returning 200 is often safer for Webhook endpoints
    // to prevent LINE from retrying excessively
    return new NextResponse('OK', { status: 200 });
  }
}

export async function GET() {
  return new NextResponse('LINE Webhook Endpoint is Active', { status: 200 });
}
