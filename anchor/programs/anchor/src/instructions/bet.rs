use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::constants::BET_RECORD_SEED;
use crate::error::ErrorCode;
use crate::state::{BetRecord, Market};

#[derive(Accounts)]
pub struct Bet<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub bettor: Signer<'info>,
    #[account(
        init_if_needed,
        payer = bettor,
        space = BetRecord::LEN,
        seeds = [BET_RECORD_SEED, market.key().as_ref(), bettor.key().as_ref()],
        bump
    )]
    pub bet_record: Account<'info, BetRecord>,
    pub system_program: Program<'info, System>,
}

pub fn bet_yes_handler(ctx: Context<Bet>, amount: u64) -> Result<()> {
    let market = &mut ctx.accounts.market;
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(!market.is_resolved, ErrorCode::Resolved);
    require!(Clock::get()?.unix_timestamp < market.end_time, ErrorCode::Ended);
    require!(!ctx.accounts.bet_record.claimed, ErrorCode::AlreadyClaimed);

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.bettor.to_account_info(),
                to: market.to_account_info(),
            },
        ),
        amount,
    )?;

    market.yes_pool = market.yes_pool.saturating_add(amount);
    let record = &mut ctx.accounts.bet_record;
    if record.market == Pubkey::default() {
        record.market = market.key();
        record.bettor = ctx.accounts.bettor.key();
        record.yes_amount = 0;
        record.no_amount = 0;
        record.claimed = false;
    } else {
        require!(record.market == market.key(), ErrorCode::InvalidBetRecord);
        require!(
            record.bettor == ctx.accounts.bettor.key(),
            ErrorCode::InvalidBetRecord
        );
    }
    record.yes_amount = record.yes_amount.saturating_add(amount);
    Ok(())
}

pub fn bet_no_handler(ctx: Context<Bet>, amount: u64) -> Result<()> {
    let market = &mut ctx.accounts.market;
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(!market.is_resolved, ErrorCode::Resolved);
    require!(Clock::get()?.unix_timestamp < market.end_time, ErrorCode::Ended);
    require!(!ctx.accounts.bet_record.claimed, ErrorCode::AlreadyClaimed);

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.bettor.to_account_info(),
                to: market.to_account_info(),
            },
        ),
        amount,
    )?;

    market.no_pool = market.no_pool.saturating_add(amount);
    let record = &mut ctx.accounts.bet_record;
    if record.market == Pubkey::default() {
        record.market = market.key();
        record.bettor = ctx.accounts.bettor.key();
        record.yes_amount = 0;
        record.no_amount = 0;
        record.claimed = false;
    } else {
        require!(record.market == market.key(), ErrorCode::InvalidBetRecord);
        require!(
            record.bettor == ctx.accounts.bettor.key(),
            ErrorCode::InvalidBetRecord
        );
    }
    record.no_amount = record.no_amount.saturating_add(amount);
    Ok(())
}
