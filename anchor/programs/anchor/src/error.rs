use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Market already resolved.")]
    Resolved,
    #[msg("Market betting has ended.")]
    Ended,
    #[msg("Market has not ended yet.")]
    NotEnded,
    #[msg("Market is not resolved yet.")]
    NotResolved,
    #[msg("Invalid outcome. Use 0 for yes, 1 for no.")]
    InvalidOutcome,
    #[msg("Question exceeds max length.")]
    QuestionTooLong,
    #[msg("Bet record has already claimed.")]
    AlreadyClaimed,
    #[msg("No winning stake to claim.")]
    NothingToClaim,
    #[msg("Invalid bet record for this market.")]
    InvalidBetRecord,
    #[msg("Bet amount must be greater than zero.")]
    InvalidAmount,
    #[msg("Insufficient pool balance for claim.")]
    InsufficientPool,
}
