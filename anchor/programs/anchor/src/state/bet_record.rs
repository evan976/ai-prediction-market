use anchor_lang::prelude::*;

#[account]
pub struct BetRecord {
    pub market: Pubkey,
    pub bettor: Pubkey,
    pub yes_amount: u64,
    pub no_amount: u64,
    pub claimed: bool,
}

impl BetRecord {
    pub const LEN: usize = 8  // discriminator
        + 32
        + 32
        + 8
        + 8
        + 1;
}
