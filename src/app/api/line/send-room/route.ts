import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { travelerId } = await request.json();

    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 });
    }

    // 1. 從資料庫撈取旅客與飯店資訊
    const { data: traveler, error: travelerError } = await supabase
      .from('travelers')
      .select('*, group:group_id(*)')
      .eq('id', travelerId)
      .single();

    if (travelerError || !traveler) {
      return NextResponse.json({ error: 'Traveler not found' }, { status: 404 });
    }

    if (!traveler.line_uid) {
      return NextResponse.json({ error: '旅客尚未綁定 LINE' }, { status: 400 });
    }

    const group = traveler.group;
    const roomNumber = traveler.room_number || '尚未分配';
    const hotelName = group?.hotel_name || '尚未設定';
    const hotelAddress = group?.hotel_address || '請洽領隊';
    const wifiInfo = group?.wifi_info || '詢問櫃檯';

    // 2. 準備 LINE Flex Message
    const flexMessage = {
      type: 'flex',
      altText: `🏨 今晚入住資訊：${hotelName}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '住宿房號通知',
              color: '#ffffff',
              weight: 'bold',
              size: 'sm'
            }
          ],
          backgroundColor: '#2563eb',
          paddingAll: 'md'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: hotelName,
              weight: 'bold',
              size: 'xl',
              wrap: true
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '🔑 房號',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 2
                    },
                    {
                      type: 'text',
                      text: roomNumber,
                      wrap: true,
                      color: '#2563eb',
                      size: 'xxl',
                      flex: 5,
                      weight: 'bold'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '📶 Wi-Fi',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 2
                    },
                    {
                      type: 'text',
                      text: wifiInfo,
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 5
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '📍 地址',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 2
                    },
                    {
                      type: 'text',
                      text: hotelAddress,
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 5
                    }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              color: '#2563eb',
              action: {
                type: 'uri',
                label: '查看完整行程',
                uri: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/traveler`
              }
            }
          ],
          flex: 0
        }
      }
    };

    // 3. 發送訊息給旅客
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: traveler.line_uid,
        messages: [flexMessage]
      })
    });

    if (!lineResponse.ok) {
      const errorData = await lineResponse.json();
      console.error('LINE API Error:', errorData);
      return NextResponse.json({ error: 'LINE 訊息發送失敗' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send Room API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
