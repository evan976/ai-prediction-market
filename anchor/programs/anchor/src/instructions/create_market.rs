use anchor_lang::prelude::*;

use crate::constants::MAX_QUESTION_LEN;
use crate::state::Market;

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(init, payer = creator, space = Market::LEN)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn create_market_handler(ctx: Context<CreateMarket>, question: String, end_time: i64) -> Result<()> {
    require!(
        question.as_bytes().len() <= MAX_QUESTION_LEN,
        crate::error::ErrorCode::QuestionTooLong
    );

    let market = &mut ctx.accounts.market;
    market.question = question;
    market.end_time = end_time;
    market.creator = *ctx.accounts.creator.key;
    market.yes_pool = 0;
    market.no_pool = 0;
    market.is_resolved = false;
    market.outcome = 2;
    Ok(())
}
