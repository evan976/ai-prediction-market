import {
  type Address,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  getAddressEncoder,
  getBytesEncoder,
  getProgramDerivedAddress,
} from '@solana/kit'
import {
  type BetRecord,
  fetchMaybeBetRecord,
} from './anchor/accounts/betRecord'
import { fetchMaybeMarket, type Market } from './anchor/accounts/market'
import { AI_PREDICTION_MARKET_PROGRAM_ADDRESS } from './anchor/programs'

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com'
const WSS_URL = process.env.NEXT_PUBLIC_WSS_URL || 'wss://api.devnet.solana.com'

export const rpc = createSolanaRpc(RPC_URL)
export const rpcSubscriptions = createSolanaRpcSubscriptions(WSS_URL)

export const LAMPORTS_PER_SOL = BigInt('1000000000')
const BET_RECORD_SEED = new Uint8Array([
  98, 101, 116, 95, 114, 101, 99, 111, 114, 100,
])

export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * Number(LAMPORTS_PER_SOL)))
}

export function lamportsToSol(lamportsValue: bigint): number {
  return Number(lamportsValue) / Number(LAMPORTS_PER_SOL)
}

export async function getMarket(address: Address): Promise<Market | null> {
  const maybeMarket = await fetchMaybeMarket(rpc, address)
  return maybeMarket.exists ? maybeMarket.data : null
}

export async function getBetRecord(
  marketAddress: Address,
  bettorAddress: Address,
): Promise<BetRecord | null> {
  const [betRecordAddress] = await getProgramDerivedAddress({
    programAddress: AI_PREDICTION_MARKET_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(BET_RECORD_SEED),
      getAddressEncoder().encode(marketAddress),
      getAddressEncoder().encode(bettorAddress),
    ],
  })
  const maybeBetRecord = await fetchMaybeBetRecord(rpc, betRecordAddress)
  return maybeBetRecord.exists ? maybeBetRecord.data : null
}

export async function getAllMarkets(): Promise<
  Array<{ address: Address; data: Market }>
> {
  // Get all program accounts without filter, then decode on client
  const accounts = await rpc
    .getProgramAccounts(AI_PREDICTION_MARKET_PROGRAM_ADDRESS, {
      encoding: 'base64',
    })
    .send()

  const markets: Array<{ address: Address; data: Market }> = []

  for (const account of accounts) {
    try {
      const maybeMarket = await fetchMaybeMarket(rpc, account.pubkey)
      if (maybeMarket.exists) {
        markets.push({
          address: account.pubkey,
          data: maybeMarket.data,
        })
      }
    } catch {
      // Skip invalid accounts (e.g., BetRecord accounts)
    }
  }

  return markets
}

export type { Market, BetRecord }
