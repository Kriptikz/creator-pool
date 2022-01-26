use anchor_lang::prelude::*;

declare_id!("E3mHBkUKFf1hhXN6YEG3oXD5G8SZkvVfoRQ4TNQewqYJ");

#[program]
pub mod creator_pool {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
