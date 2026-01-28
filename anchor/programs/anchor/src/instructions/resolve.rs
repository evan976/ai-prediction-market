use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::Market;

#[derive(Accounts)]
pub struct Resolve<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub resolver: Signer<'info>,
}

pub fn resolve_handler(ctx: Context<Resolve>, outcome: u8) -> Result<()> {
    require!(!ctx.accounts.market.is_resolved, ErrorCode::Resolved);
    require!(outcome <= 1, ErrorCode::InvalidOutcome);

    let now = Clock::get()?.unix_timestamp;
    let is_creator = ctx.accounts.resolver.key() == ctx.accounts.market.creator;
    require!(now >= ctx.accounts.market.end_time || is_creator, ErrorCode::NotEnded);

    let market = &mut ctx.accounts.market;
    market.outcome = outcome;
    market.is_resolved = true;
    Ok(())
}
