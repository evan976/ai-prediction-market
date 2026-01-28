import { NextResponse } from 'next/server'
import { createMarket, listMarkets } from '@/lib/markets'

export async function GET() {
  const markets = await listMarkets()
  return NextResponse.json({ markets })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      question?: string
      expiresInHours?: number
    }

    if (!body.question || typeof body.question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required.' },
        { status: 400 },
      )
    }

    const market = await createMarket(body.question, body.expiresInHours)
    return NextResponse.json({ market })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
