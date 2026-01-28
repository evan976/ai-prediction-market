use anchor_lang::prelude::*;

use crate::constants::MAX_QUESTION_LEN;

#[account]
pub struct Market {
    pub question: String,
    pub end_time: i64,
    pub creator: Pubkey,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub is_resolved: bool,
    pub outcome: u8, // 0 = yes, 1 = no, 2 = unresolved
}

impl Market {
    pub const LEN: usize = 8  // discriminator
        + 4 + MAX_QUESTION_LEN
        + 8
        + 32
        + 8
        + 8
        + 1
        + 1;
}
