export type MarketStatus = 'open' | 'expired' | 'resolved'

export type Prediction = {
  yesProbability: number
  noProbability: number
  oddsYes: number
  oddsNo: number
  reasoning: string
}

export type Bet = {
  id: string
  side: 'yes' | 'no'
  amount: number
  placedAt: string
  bettor?: string
}

export type Market = {
  id: string
  question: string
  createdAt: string
  expiresAt: string
  status: MarketStatus
  prediction: Prediction
  bets: Bet[]
  resolvedAt?: string
  result?: 'yes' | 'no'
  resolutionReason?: string
}
