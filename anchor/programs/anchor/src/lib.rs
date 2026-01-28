pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("62sSE2g4sBQ7Av2mmhasTDP3zWA7QBpf9wa7nDN1rwj4");

#[program]
pub mod ai_prediction_market {
    use super::*;

    pub fn create_market(ctx: Context<CreateMarket>, question: String, end_time: i64) -> Result<()> {
        create_market_handler(ctx, question, end_time)
    }

    pub fn bet_yes(ctx: Context<Bet>, amount: u64) -> Result<()> {
        bet_yes_handler(ctx, amount)
    }

    pub fn bet_no(ctx: Context<Bet>, amount: u64) -> Result<()> {
        bet_no_handler(ctx, amount)
    }

    pub fn resolve(ctx: Context<Resolve>, outcome: u8) -> Result<()> {
        resolve_handler(ctx, outcome)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        claim_handler(ctx)
    }
}
