'use client'

import { useCallback, useState } from 'react'
import {
  useKitTransactionSigner,
  useWallet,
} from '@solana/connector/react'
import {
  type Address,
  appendTransactionMessageInstructions,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from '@solana/kit'
import { toast } from 'sonner'
import {
  getBetNoInstructionAsync,
  getBetYesInstructionAsync,
  getClaimInstructionAsync,
  getCreateMarketInstruction,
  getResolveInstruction,
} from './anchor/instructions'
import { rpc, solToLamports } from './solana'

type TransactionStatus = 'idle' | 'signing' | 'confirming' | 'success' | 'error'

export function useCreateMarket() {
  const { signer, ready: signerReady } = useKitTransactionSigner()
  const { isConnected } = useWallet()
  const [status, setStatus] = useState<TransactionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [marketAddress, setMarketAddress] = useState<Address | null>(null)

  const createMarket = useCallback(
    async (question: string, endTimeUnix: number) => {
      if (!signer || !isConnected) {
        setError('Wallet not connected')
        return null
      }

      setStatus('signing')
      setError(null)

      try {
        const marketKeypair = await generateKeyPairSigner()

        const instruction = getCreateMarketInstruction({
          market: marketKeypair,
          creator: signer,
          question,
          endTime: BigInt(endTimeUnix),
        })

        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

        const transactionMessage = pipe(
          createTransactionMessage({ version: 0 }),
          (tx) => setTransactionMessageFeePayerSigner(signer, tx),
          (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
          (tx) => appendTransactionMessageInstructions([instruction], tx),
        )

        const signedTransaction =
          await signTransactionMessageWithSigners(transactionMessage)

        setStatus('confirming')

        const encodedTransaction =
          getBase64EncodedWireTransaction(signedTransaction)
        await rpc
          .sendTransaction(encodedTransaction, { encoding: 'base64' })
          .send()

        toast.success('Market created')
        setStatus('success')
        setMarketAddress(marketKeypair.address)
        return marketKeypair.address
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Transaction failed')
        console.error(err)
        return null
      }
    },
    [signer, isConnected],
  )

  const ready = signerReady && isConnected

  return { createMarket, status, error, marketAddress, ready }
}

export function useBet() {
  const { signer, ready: signerReady } = useKitTransactionSigner()
  const { isConnected } = useWallet()
  const [status, setStatus] = useState<TransactionStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const placeBet = useCallback(
    async (marketAddress: Address, side: 'yes' | 'no', amountSol: number) => {
      if (!signer || !isConnected) {
        setError('Wallet not connected')
        return false
      }

      setStatus('signing')
      setError(null)

      try {
        const amount = solToLamports(amountSol)

        const instruction =
          side === 'yes'
            ? await getBetYesInstructionAsync({
                market: marketAddress,
                bettor: signer,
                amount,
              })
            : await getBetNoInstructionAsync({
                market: marketAddress,
                bettor: signer,
                amount,
              })

        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

        const transactionMessage = pipe(
          createTransactionMessage({ version: 0 }),
          (tx) => setTransactionMessageFeePayerSigner(signer, tx),
          (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
          (tx) => appendTransactionMessageInstructions([instruction], tx),
        )

        const signedTransaction =
          await signTransactionMessageWithSigners(transactionMessage)

        setStatus('confirming')

        const encodedTransaction =
          getBase64EncodedWireTransaction(signedTransaction)
        await rpc
          .sendTransaction(encodedTransaction, { encoding: 'base64' })
          .send()

        toast.success('Bet placed')
        setStatus('success')
        return true
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Transaction failed')
        return false
      }
    },
    [signer, isConnected],
  )

  const ready = signerReady && isConnected

  return { placeBet, status, error, ready }
}

export function useResolveMarket() {
  const { signer, ready: signerReady } = useKitTransactionSigner()
  const { isConnected } = useWallet()
  const [status, setStatus] = useState<TransactionStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const resolveMarket = useCallback(
    async (marketAddress: Address, outcome: 'yes' | 'no') => {
      if (!signer || !isConnected) {
        setError('Wallet not connected')
        return false
      }

      setStatus('signing')
      setError(null)

      try {
        const outcomeValue = outcome === 'yes' ? 0 : 1

        const instruction = getResolveInstruction({
          market: marketAddress,
          resolver: signer,
          outcome: outcomeValue,
        })

        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

        const transactionMessage = pipe(
          createTransactionMessage({ version: 0 }),
          (tx) => setTransactionMessageFeePayerSigner(signer, tx),
          (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
          (tx) => appendTransactionMessageInstructions([instruction], tx),
        )

        const signedTransaction =
          await signTransactionMessageWithSigners(transactionMessage)

        setStatus('confirming')

        const encodedTransaction =
          getBase64EncodedWireTransaction(signedTransaction)
        await rpc
          .sendTransaction(encodedTransaction, { encoding: 'base64' })
          .send()

        toast.success('Market resolved')
        setStatus('success')
        return true
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Transaction failed')
        return false
      }
    },
    [signer, isConnected],
  )

  const ready = signerReady && isConnected

  return { resolveMarket, status, error, ready }
}

export function useClaim() {
  const { signer, ready: signerReady } = useKitTransactionSigner()
  const { isConnected } = useWallet()
  const [status, setStatus] = useState<TransactionStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const claim = useCallback(
    async (marketAddress: Address) => {
      if (!signer || !isConnected) {
        setError('Wallet not connected')
        return false
      }

      setStatus('signing')
      setError(null)

      try {
        const instruction = await getClaimInstructionAsync({
          market: marketAddress,
          bettor: signer,
        })

        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

        const transactionMessage = pipe(
          createTransactionMessage({ version: 0 }),
          (tx) => setTransactionMessageFeePayerSigner(signer, tx),
          (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
          (tx) => appendTransactionMessageInstructions([instruction], tx),
        )

        const signedTransaction =
          await signTransactionMessageWithSigners(transactionMessage)

        setStatus('confirming')

        const encodedTransaction =
          getBase64EncodedWireTransaction(signedTransaction)
        await rpc
          .sendTransaction(encodedTransaction, { encoding: 'base64' })
          .send()

        toast.success('Claimed rewards')
        setStatus('success')
        return true
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Transaction failed')
        return false
      }
    },
    [signer, isConnected],
  )

  const ready = signerReady && isConnected

  return { claim, status, error, ready }
}
