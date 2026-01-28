import type { Program } from '@coral-xyz/anchor'
import * as anchor from '@coral-xyz/anchor'
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { assert } from 'chai'
import type { Anchor } from '../target/types/anchor'

describe('ai-prediction-market', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.anchor as Program<Anchor>

  // Test accounts
  let marketKeypair: Keypair
  let creator: Keypair
  let bettor1: Keypair
  let bettor2: Keypair

  const BET_RECORD_SEED = Buffer.from('bet_record')

  // Helper to get bet record PDA
  const getBetRecordPda = (market: PublicKey, bettor: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [BET_RECORD_SEED, market.toBuffer(), bettor.toBuffer()],
      program.programId,
    )[0]
  }

  // Helper to airdrop SOL
  const airdrop = async (pubkey: PublicKey, amount = 10 * LAMPORTS_PER_SOL) => {
    const sig = await provider.connection.requestAirdrop(pubkey, amount)
    await provider.connection.confirmTransaction(sig)
  }

  beforeEach(async () => {
    // Create fresh keypairs for each test
    marketKeypair = Keypair.generate()
    creator = Keypair.generate()
    bettor1 = Keypair.generate()
    bettor2 = Keypair.generate()

    // Fund accounts
    await airdrop(creator.publicKey)
    await airdrop(bettor1.publicKey)
    await airdrop(bettor2.publicKey)
  })

  describe('create_market', () => {
    it('creates a market successfully', async () => {
      const question = 'Will BTC reach $100k by end of 2026?'
      const endTime = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

      await program.methods
        .createMarket(question, new anchor.BN(endTime))
        .accounts({
          market: marketKeypair.publicKey,
          creator: creator.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([marketKeypair, creator])
        .rpc()

      const market = await program.account.market.fetch(marketKeypair.publicKey)

      assert.equal(market.question, question)
      assert.equal(market.endTime.toNumber(), endTime)
      assert.equal(market.creator.toBase58(), creator.publicKey.toBase58())
      assert.equal(market.yesPool.toNumber(), 0)
      assert.equal(market.noPool.toNumber(), 0)
      assert.equal(market.isResolved, false)
      assert.equal(market.outcome, 2) // unresolved
    })

    it('fails if question is too long', async () => {
      const question = 'x'.repeat(201) // MAX_QUESTION_LEN is 200
      const endTime = Math.floor(Date.now() / 1000) + 3600

      try {
        await program.methods
          .createMarket(question, new anchor.BN(endTime))
          .accounts({
            market: marketKeypair.publicKey,
            creator: creator.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([marketKeypair, creator])
          .rpc()
        assert.fail('Should have thrown an error')
      } catch (err: any) {
        assert.include(err.message, 'QuestionTooLong')
      }
    })
  })

  describe('bet_yes', () => {
    let endTime: number

    beforeEach(async () => {
      endTime = Math.floor(Date.now() / 1000) + 3600
      await program.methods
        .createMarket('Test market', new anchor.BN(endTime))
        .accounts({
          market: marketKeypair.publicKey,
          creator: creator.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([marketKeypair, creator])
        .rpc()
    })

    it('places a YES bet successfully', async () => {
      const betAmount = new anchor.BN(LAMPORTS_PER_SOL)
      const betRecordPda = getBetRecordPda(
        marketKeypair.publicKey,
        bettor1.publicKey,
      )

      await program.methods
        .betYes(betAmount)
        .accounts({
          market: marketKeypair.publicKey,
          bettor: bettor1.publicKey,
          betRecord: betRecordPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc()

      const market = await program.account.market.fetch(marketKeypair.publicKey)
      assert.equal(market.yesPool.toNumber(), LAMPORTS_PER_SOL)
      assert.equal(market.noPool.toNumber(), 0)

      const betRecord = await program.account.betRecord.fetch(betRecordPda)
      assert.equal(betRecord.yesAmount.toNumber(), LAMPORTS_PER_SOL)
      assert.equal(betRecord.noAmount.toNumber(), 0)
      assert.equal(betRecord.claimed, false)
    })

    it('accumulates multiple YES bets', async () => {
      const betRecordPda = getBetRecordPda(
        marketKeypair.publicKey,
        bettor1.publicKey,
      )

      // First bet
      await program.methods
        .betYes(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          market: marketKeypair.publicKey,
          bettor: bettor1.publicKey,
          betRecord: betRecordPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc()

      // Second bet
      await program.methods
        .betYes(new anchor.BN(LAMPORTS_PER_SOL * 2))
        .accounts({
          market: marketKeypair.publicKey,
          bettor: bettor1.publicKey,
          betRecord: betRecordPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc()

      const market = await program.account.market.fetch(marketKeypair.publicKey)
      assert.equal(market.yesPool.toNumber(), LAMPORTS_PER_SOL * 3)

      const betRecord = await program.account.betRecord.fetch(betRecordPda)
      assert.equal(betRecord.yesAmount.toNumber(), LAMPORTS_PER_SOL * 3)
    })

    it('fails with zero amount', async () => {
      const betRecordPda = getBetRecordPda(
        marketKeypair.publicKey,
        bettor1.publicKey,
      )

      try {
        await program.methods
          .betYes(new anchor.BN(0))
          .accounts({
            market: marketKeypair.publicKey,
            bettor: bettor1.publicKey,
            betRecord: betRecordPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([bettor1])
          .rpc()
        assert.fail('Should have thrown an error')
      } catch (err: any) {
        assert.include(err.message, 'InvalidAmount')
      }
    })
  })

  describe('bet_no', () => {
    beforeEach(async () => {
      const endTime = Math.floor(Date.now() / 1000) + 3600
      await program.methods
        .createMarket('Test market', new anchor.BN(endTime))
        .accounts({
          market: marketKeypair.publicKey,
          creator: creator.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([marketKeypair, creator])
        .rpc()
    })

    it('places a NO bet successfully', async () => {
      const betAmount = new anchor.BN(LAMPORTS_PER_SOL)
      const betRecordPda = getBetRecordPda(
        marketKeypair.publicKey,
        bettor1.publicKey,
      )

      await program.methods
        .betNo(betAmount)
        .accounts({
          market: marketKeypair.publicKey,
          bettor: bettor1.publicKey,
          betRecord: betRecordPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc()

      const market = await program.account.market.fetch(marketKeypair.publicKey)
      assert.equal(market.yesPool.toNumber(), 0)
      assert.equal(market.noPool.toNumber(), LAMPORTS_PER_SOL)

      const betRecord = await program.account.betRecord.fetch(betRecordPda)
      assert.equal(betRecord.yesAmount.toNumber(), 0)
      assert.equal(betRecord.noAmount.toNumber(), LAMPORTS_PER_SOL)
    })
  })

  describe('resolve', () => {
    beforeEach(async () => {
      // Create a market that ends in the past for testing
      const endTime = Math.floor(Date.now() / 1000) - 1
      await program.methods
        .createMarket('Test market', new anchor.BN(endTime))
        .accounts({
          market: marketKeypair.publicKey,
          creator: creator.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([marketKeypair, creator])
        .rpc()
    })

    it('resolves market as YES (outcome = 0)', async () => {
      await program.methods
        .resolve(0)
        .accounts({
          market: marketKeypair.publicKey,
          resolver: creator.publicKey,
        })
        .signers([creator])
        .rpc()

      const market = await program.account.market.fetch(marketKeypair.publicKey)
      assert.equal(market.isResolved, true)
      assert.equal(market.outcome, 0)
    })

    it('resolves market as NO (outcome = 1)', async () => {
      await program.methods
        .resolve(1)
        .accounts({
          market: marketKeypair.publicKey,
          resolver: creator.publicKey,
        })
        .signers([creator])
        .rpc()

      const market = await program.account.market.fetch(marketKeypair.publicKey)
      assert.equal(market.isResolved, true)
      assert.equal(market.outcome, 1)
    })

    it('fails with invalid outcome', async () => {
      try {
        await program.methods
          .resolve(2)
          .accounts({
            market: marketKeypair.publicKey,
            resolver: creator.publicKey,
          })
          .signers([creator])
          .rpc()
        assert.fail('Should have thrown an error')
      } catch (err: any) {
        assert.include(err.message, 'InvalidOutcome')
      }
    })

    it('fails if already resolved', async () => {
      // First resolution
      await program.methods
        .resolve(0)
        .accounts({
          market: marketKeypair.publicKey,
          resolver: creator.publicKey,
        })
        .signers([creator])
        .rpc()

      // Second resolution should fail
      try {
        await program.methods
          .resolve(1)
          .accounts({
            market: marketKeypair.publicKey,
            resolver: creator.publicKey,
          })
          .signers([creator])
          .rpc()
        assert.fail('Should have thrown an error')
      } catch (err: any) {
        assert.include(err.message, 'Resolved')
      }
    })
  })

  describe('claim', () => {
    beforeEach(async () => {
      // Create market ending in the past
      const endTime = Math.floor(Date.now() / 1000) - 1
      await program.methods
        .createMarket('Test market', new anchor.BN(endTime))
        .accounts({
          market: marketKeypair.publicKey,
          creator: creator.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([marketKeypair, creator])
        .rpc()
    })

    it('winner claims payout successfully', async () => {
      const betRecordPda1 = getBetRecordPda(
        marketKeypair.publicKey,
        bettor1.publicKey,
      )
      const betRecordPda2 = getBetRecordPda(
        marketKeypair.publicKey,
        bettor2.publicKey,
      )

      // Bettor1 bets YES
      await program.methods
        .betYes(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          market: marketKeypair.publicKey,
          bettor: bettor1.publicKey,
          betRecord: betRecordPda1,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc()

      // Bettor2 bets NO
      await program.methods
        .betNo(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          market: marketKeypair.publicKey,
          bettor: bettor2.publicKey,
          betRecord: betRecordPda2,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bettor2])
        .rpc()

      // Resolve as YES
      await program.methods
        .resolve(0)
        .accounts({
          market: marketKeypair.publicKey,
          resolver: creator.publicKey,
        })
        .signers([creator])
        .rpc()

      const balanceBefore = await provider.connection.getBalance(
        bettor1.publicKey,
      )

      // Bettor1 (YES winner) claims
      await program.methods
        .claim()
        .accounts({
          market: marketKeypair.publicKey,
          bettor: bettor1.publicKey,
          betRecord: betRecordPda1,
        })
        .signers([bettor1])
        .rpc()

      const balanceAfter = await provider.connection.getBalance(
        bettor1.publicKey,
      )
      const betRecord = await program.account.betRecord.fetch(betRecordPda1)

      assert.equal(betRecord.claimed, true)
      // Winner should receive both pools (minus rent)
      assert.isAbove(balanceAfter, balanceBefore)
    })

    it('fails if not resolved', async () => {
      const betRecordPda = getBetRecordPda(
        marketKeypair.publicKey,
        bettor1.publicKey,
      )

      await program.methods
        .betYes(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          market: marketKeypair.publicKey,
          bettor: bettor1.publicKey,
          betRecord: betRecordPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc()

      try {
        await program.methods
          .claim()
          .accounts({
            market: marketKeypair.publicKey,
            bettor: bettor1.publicKey,
            betRecord: betRecordPda,
          })
          .signers([bettor1])
          .rpc()
        assert.fail('Should have thrown an error')
      } catch (err: any) {
        assert.include(err.message, 'NotResolved')
      }
    })

    it('fails if already claimed', async () => {
      const betRecordPda = getBetRecordPda(
        marketKeypair.publicKey,
        bettor1.publicKey,
      )

      await program.methods
        .betYes(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          market: marketKeypair.publicKey,
          bettor: bettor1.publicKey,
          betRecord: betRecordPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc()

      await program.methods
        .resolve(0)
        .accounts({
          market: marketKeypair.publicKey,
          resolver: creator.publicKey,
        })
        .signers([creator])
        .rpc()

      // First claim
      await program.methods
        .claim()
        .accounts({
          market: marketKeypair.publicKey,
          bettor: bettor1.publicKey,
          betRecord: betRecordPda,
        })
        .signers([bettor1])
        .rpc()

      // Second claim should fail
      try {
        await program.methods
          .claim()
          .accounts({
            market: marketKeypair.publicKey,
            bettor: bettor1.publicKey,
            betRecord: betRecordPda,
          })
          .signers([bettor1])
          .rpc()
        assert.fail('Should have thrown an error')
      } catch (err: any) {
        assert.include(err.message, 'AlreadyClaimed')
      }
    })

    it('loser cannot claim', async () => {
      const betRecordPda = getBetRecordPda(
        marketKeypair.publicKey,
        bettor1.publicKey,
      )

      // Bet NO
      await program.methods
        .betNo(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          market: marketKeypair.publicKey,
          bettor: bettor1.publicKey,
          betRecord: betRecordPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc()

      // Resolve as YES (bettor1 loses)
      await program.methods
        .resolve(0)
        .accounts({
          market: marketKeypair.publicKey,
          resolver: creator.publicKey,
        })
        .signers([creator])
        .rpc()

      try {
        await program.methods
          .claim()
          .accounts({
            market: marketKeypair.publicKey,
            bettor: bettor1.publicKey,
            betRecord: betRecordPda,
          })
          .signers([bettor1])
          .rpc()
        assert.fail('Should have thrown an error')
      } catch (err: any) {
        assert.include(err.message, 'NothingToClaim')
      }
    })
  })
})
