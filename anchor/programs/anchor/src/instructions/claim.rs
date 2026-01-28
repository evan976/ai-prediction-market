use anchor_lang::prelude::*;

use crate::constants::BET_RECORD_SEED;
use crate::error::ErrorCode;
use crate::state::{BetRecord, Market};

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub bettor: Signer<'info>,
    #[account(
        mut,
        seeds = [BET_RECORD_SEED, market.key().as_ref(), bettor.key().as_ref()],
        bump
    )]
    pub bet_record: Account<'info, BetRecord>,
}

pub fn claim_handler(ctx: Context<Claim>) -> Result<()> {
    let market = &ctx.accounts.market;
    require!(market.is_resolved, ErrorCode::NotResolved);
    require!(market.outcome <= 1, ErrorCode::NotResolved);

    let record = &mut ctx.accounts.bet_record;
    require!(!record.claimed, ErrorCode::AlreadyClaimed);
    require!(record.market == market.key(), ErrorCode::InvalidBetRecord);
    require!(
        record.bettor == ctx.accounts.bettor.key(),
        ErrorCode::InvalidBetRecord
    );

    let winning_pool = if market.outcome == 0 {
        market.yes_pool
    } else {
        market.no_pool
    };
    require!(winning_pool > 0, ErrorCode::NothingToClaim);

    let bettor_amount = if market.outcome == 0 {
        record.yes_amount
    } else {
        record.no_amount
    };
    require!(bettor_amount > 0, ErrorCode::NothingToClaim);

    let total_pool = market
        .yes_pool
        .saturating_add(market.no_pool);
    let payout = ((bettor_amount as u128)
        .saturating_mul(total_pool as u128)
        / (winning_pool as u128)) as u64;
    require!(payout > 0, ErrorCode::NothingToClaim);

    let rent_exempt = Rent::get()?.minimum_balance(Market::LEN);
    let market_lamports = **market.to_account_info().lamports.borrow();
    let available = market_lamports.saturating_sub(rent_exempt);
    require!(payout <= available, ErrorCode::InsufficientPool);

    **market.to_account_info().try_borrow_mut_lamports()? -= payout;
    **ctx.accounts.bettor.to_account_info().try_borrow_mut_lamports()? += payout;
    record.claimed = true;
    Ok(())
}
