import { NextResponse } from 'next/server'
import { resolveMarket } from '@/lib/markets'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = (await request.json()) as {
      result?: 'yes' | 'no' | 'ai'
    }

    if (body.result !== 'yes' && body.result !== 'no' && body.result !== 'ai') {
      return NextResponse.json(
        { error: 'Result must be yes, no, or ai.' },
        { status: 400 },
      )
    }

    const market = await resolveMarket({ id, result: body.result })
    return NextResponse.json({ market })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to resolve.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
