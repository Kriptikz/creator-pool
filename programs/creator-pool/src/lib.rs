use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_option::COption;
use anchor_spl::token::{self, Mint, TokenAccount, Token};
use spl_math::uint::U192;

use std::convert::TryInto;

declare_id!("E3mHBkUKFf1hhXN6YEG3oXD5G8SZkvVfoRQ4TNQewqYJ");

#[program]
pub mod creator_pool {
    use super::*;
    pub fn initialize_pool(ctx: Context<InitializePool>, pool_nonce: u8, reward_duration: u64) -> ProgramResult {
        // Add a minimum reward_duration

        // Add some tokens to lockup to create this pool


        let pool = &mut ctx.accounts.pool;

        pool.authority = ctx.accounts.authority.key();
        pool.nonce = pool_nonce;
        pool.staking_mint = ctx.accounts.staking_mint.key();
        pool.staking_vault = ctx.accounts.staking_vault.key();
        pool.reward_mint = ctx.accounts.reward_mint.key();
        pool.reward_vault = ctx.accounts.reward_vault.key();
        pool.reward_duration = reward_duration;
        pool.reward_duration_end = 0;
        pool.last_update_time = 0;
        pool.reward_rate = 0;
        pool.reward_per_token_stored = 0;
        pool.user_stake_count = 0;

        Ok(())
    }

    pub fn create_user(ctx: Context<CreateUser>, nonce: u8) -> ProgramResult {
        let user = &mut ctx.accounts.user;

        user.pool = *ctx.accounts.pool.to_account_info().key;
        user.owner = *ctx.accounts.owner.key;
        user.reward_per_token_complete = 0;
        user.reward_per_token_pending = 0;
        user.balance_staked = 0;
        user.nonce = nonce;

        let pool = &mut ctx.accounts.pool;
        pool.user_stake_count = pool.user_stake_count.checked_add(1).unwrap();

        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> ProgramResult {
        if amount == 0 {
            return Err(ErrorCode::AmountMustBeGreaterThanZero.into());
        }

        let pool = &mut ctx.accounts.pool;

        let total_staked = ctx.accounts.staking_vault.amount;

        let user_opt = Some(&mut ctx.accounts.user);
        pool.update_rewards(user_opt, total_staked).unwrap();

        ctx.accounts.user.balance_staked = ctx.accounts.user.balance_staked.checked_add(amount).unwrap();

        // Transfer tokens in the stake vault.
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.stake_from_account.to_account_info(),
                to: ctx.accounts.staking_vault.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );
        token::transfer(cpi_context, amount)?;

        Ok(())
    }

    pub fn unstake(ctx: Context<Stake>, amount: u64) -> ProgramResult {
        if amount == 0 {
            return Err(ErrorCode::AmountMustBeGreaterThanZero.into());
        }

        let pool = &mut ctx.accounts.pool;
        let total_staked = ctx.accounts.staking_vault.amount;

        if ctx.accounts.user.balance_staked < amount {
            return Err(ErrorCode::InsufficientFundUnstake.into());
        }

        let user_opt = Some(&mut ctx.accounts.user);
        pool.update_rewards(user_opt, total_staked).unwrap();
        ctx.accounts.user.balance_staked = ctx.accounts.user.balance_staked.checked_sub(amount).unwrap();

        // Transfer tokens from the pool vault to the user
        {
            let seeds = &[pool.to_account_info().key.as_ref(), &[pool.nonce]];
            let pool_signer = &[&seeds[..]];

            let cpi_context = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.staking_vault.to_account_info(),
                    to: ctx.accounts.stake_from_account.to_account_info(),
                    authority: ctx.accounts.pool_signer.to_account_info(),
                },
                pool_signer,
            );

            token::transfer(cpi_context, amount)?;
        }

        Ok(())
    }

    pub fn fund(ctx: Context<Fund>, amount: u64) -> ProgramResult {
        let pool = &mut ctx.accounts.pool;
        let total_staked = ctx.accounts.staking_vault.amount;
        pool.update_rewards(None, total_staked).unwrap();

        let reward_rate = pool.calc_rate_after_funding(
            amount,
        )?;
        pool.reward_rate = reward_rate;

        // Transfer the reward tokens into the reward vault
        if amount > 0 {
            let cpi_context = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.from.to_account_info(),
                    to: ctx.accounts.reward_vault.to_account_info(),
                    authority: ctx.accounts.funder.to_account_info(),
                }
            );

            token::transfer(cpi_context, amount)?;
        }

        let current_time = anchor_lang::solana_program::clock::Clock::get()
            .unwrap()
            .unix_timestamp
            .try_into()
            .unwrap();
        pool.last_update_time = current_time;
        pool.reward_duration_end = current_time.checked_add(pool.reward_duration).unwrap();


        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> ProgramResult {
        let total_staked = ctx.accounts.staking_vault.amount;

        let pool = &mut ctx.accounts.pool;
        let user_opt = Some(&mut ctx.accounts.user);
        pool.update_rewards(user_opt, total_staked).unwrap();

        let seeds = &[
            ctx.accounts.pool.to_account_info().key.as_ref(),
            &[ctx.accounts.pool.nonce],
        ];
        let pool_signer = &[&seeds[..]];

        if ctx.accounts.user.reward_per_token_pending > 0 {
            let mut reward_amount = ctx.accounts.user.reward_per_token_pending;
            let vault_balance = ctx.accounts.reward_vault.amount;

            ctx.accounts.user.reward_per_token_pending = 0;
            if vault_balance < reward_amount {
                reward_amount = vault_balance;
            }

            if reward_amount > 0 {
                let cpi_context = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    token::Transfer {
                        from: ctx.accounts.reward_vault.to_account_info(),
                        to: ctx.accounts.to_reward_account.to_account_info(),
                        authority: ctx.accounts.pool_signer.to_account_info(),
                    },
                    pool_signer,
                );

                token::transfer(cpi_context, reward_amount)?;
            }
        }


        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(pool_nonce: u8)]
pub struct InitializePool<'info> {
    // The authority is the creator of the Pool Account.
    // They are an authorized funder of the reward vault, and can as pause the pool.
    #[account(mut)]
    authority: Signer<'info>,
    staking_mint: Account<'info, Mint>,
    #[account(
        constraint = staking_vault.mint == staking_mint.key(),
        constraint = staking_vault.owner == pool_signer.key(),
        constraint = staking_vault.close_authority == COption::None,
    )]
    staking_vault: Account<'info, TokenAccount>,
    reward_mint: Account<'info, Mint>,
    #[account(
        constraint = reward_vault.mint == reward_mint.key(),
        constraint = reward_vault.owner == pool_signer.key(),
        constraint = reward_vault.close_authority == COption::None,
    )]
    reward_vault: Account<'info, TokenAccount>,
    #[account(
        seeds = [pool.to_account_info().key.as_ref()],
        bump = pool_nonce,
    )]
    pool_signer: SystemAccount<'info>,
    #[account(init, payer = authority)]
    pool: Account<'info, Pool>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction(nonce: u8)]
pub struct CreateUser<'info> {
    #[account(mut)]
    pool: Account<'info, Pool>,
    #[account(
        init,
        payer = owner,
        seeds = [owner.key.as_ref(), pool.to_account_info().key.as_ref()],
        bump = nonce)]
    user: Account<'info, User>,
    #[account(mut)]
    owner: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(
        mut,
        has_one = staking_vault,
    )]
    pool: Account<'info, Pool>,
    #[account(
        mut,
        constraint = staking_vault.owner == *pool_signer.key,
    )]
    staking_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        has_one = owner,
        has_one = pool,
        seeds = [owner.key.as_ref(), pool.to_account_info().key.as_ref()],
        bump = user.nonce,
    )]
    user: Account<'info, User>,
    owner: Signer<'info>,
    #[account(mut)]
    stake_from_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [pool.to_account_info().key.as_ref()],
        bump = pool.nonce,
    )]
    pool_signer: SystemAccount<'info>,
    token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Fund<'info> {
    #[account(
        mut,
        has_one = staking_vault,
        has_one = reward_vault,
    )]
    pool: Account<'info, Pool>,
    staking_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    reward_vault: Account<'info, TokenAccount>,
    #[account(
        // require signed funder auth - otherwise constant micro funds could hold funds hostage. TODO: Understand this better
        constraint = funder.key() == pool.authority,
    )]
    funder: Signer<'info>,
    #[account(mut)]
    from: Account<'info, TokenAccount>,
    #[account(
        seeds = [pool.to_account_info().key.as_ref()],
        bump = pool.nonce,
    )]
    pool_signer: SystemAccount<'info>,
    token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(
        mut,
        has_one = staking_vault,
        has_one = reward_vault,
    )]
    pool: Account<'info, Pool>,
    staking_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    reward_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        has_one = owner,
        has_one = pool,
        seeds = [owner.to_account_info().key.as_ref(), pool.to_account_info().key.as_ref()],
        bump = user.nonce,
    )]
    user: Account<'info, User>,
    owner: Signer<'info>,
    #[account(mut)]
    to_reward_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [pool.to_account_info().key.as_ref()],
        bump = pool.nonce,
    )]
    pool_signer: SystemAccount<'info>,
    token_program: Program<'info, Token>,
}


#[account]
#[derive(Default)]
pub struct Pool {
    // Priviledged account
    authority: Pubkey,
    // Nonce to derive the PDA owning the vaults
    nonce: u8,
    // Mint of the token that can be staked
    staking_mint: Pubkey,
    // Vault to store staked tokens
    staking_vault: Pubkey,
    // Mint of the reward token
    reward_mint: Pubkey,
    // Vault to store reward tokens
    reward_vault: Pubkey,
    // The period which rewards are linearly distributed
    reward_duration: u64,
    // The timestamp at which the current reward period ends
    reward_duration_end: u64,
    // The last time reward states were updated
    last_update_time: u64,
    // Rate of reward distribution
    reward_rate: u64,
    // Last calculated reward per pool token
    reward_per_token_stored: u128,
    // Users staked
    user_stake_count: u32,
}

impl Pool {
    const PRECISION: u128 = u64::MAX as u128;
    const SECONDS_IN_YEAR: u64 = 365 * 24 * 60 * 60;

    fn update_rewards(
        &mut self,
        user: Option<&mut Account<User>>,
        total_staked: u64,
    ) -> ProgramResult {
        let last_time_reward_applicable = Pool::last_time_reward_applicable(self.reward_duration_end);
    
        let reward = self.calc_reward_per_token(total_staked, last_time_reward_applicable);
    
        self.reward_per_token_stored = reward;
    
        self.last_update_time = last_time_reward_applicable;
    
        if let Some(user) = user {
            let earned_amount = self.calc_user_earned_amount(user);
    
            user.reward_per_token_pending = earned_amount;
            user.reward_per_token_complete = self.reward_per_token_stored;
        }
    
        Ok(())
    }

    fn calc_reward_per_token(
        &self,
        total_staked: u64, 
        last_time_reward_applicable: u64
    ) -> u128 {
        if total_staked == 0 {
            return self.reward_per_token_stored;
        }
    
        let time_period = U192::from(last_time_reward_applicable)
            .checked_sub(self.last_update_time.into())
            .unwrap();
    
        self
            .reward_per_token_stored
            .checked_add(
                time_period
                    .checked_mul(self.reward_rate.into())
                    .unwrap()
                    .checked_mul(Pool::PRECISION.into())
                    .unwrap()
                    .checked_div(Pool::SECONDS_IN_YEAR.into())
                    .unwrap()
                    .checked_div(total_staked.into())
                    .unwrap()
                    .try_into()
                    .unwrap()
            )
            .unwrap()
    }

    fn calc_user_earned_amount(
        &self,
        user: &Account<User>,
    ) -> u64 {
        (user.balance_staked as u128)
            .checked_mul(
                (self.reward_per_token_stored as u128)
                    .checked_sub(user.reward_per_token_complete as u128)
                    .unwrap(),
            )
            .unwrap()
            .checked_div(Pool::PRECISION)
            .unwrap()
            .checked_add(user.reward_per_token_pending as u128)
            .unwrap()
            .try_into()
            .unwrap()
    }

    fn calc_rate_after_funding(
        &mut self,
        amount: u64,
    ) -> Result<u64> {
        let current_time = anchor_lang::solana_program::clock::Clock::get()
            .unwrap()
            .unix_timestamp
            .try_into()
            .unwrap();
        let reward_period_end = self.reward_duration_end;
    
        let annual_multiplier = Pool::SECONDS_IN_YEAR.checked_div(self.reward_duration).unwrap();
        let rate: u64;
    
        if current_time >= reward_period_end {
            rate = amount.checked_mul(annual_multiplier).unwrap();
        } else {
            let remaining_seconds = reward_period_end.checked_sub(current_time).unwrap();
            let leftover: u64 = (remaining_seconds as u128)
                .checked_mul(self.reward_rate.into())
                .unwrap()
                .checked_div(Pool::SECONDS_IN_YEAR.into())
                .unwrap()
                .try_into()
                .unwrap();
            rate = amount
                .checked_add(leftover)
                .unwrap()
                .checked_mul(annual_multiplier)
                .unwrap();
        }
    
        Ok(rate)
    }

    fn last_time_reward_applicable(reward_duration_end: u64) -> u64 {
        let c = anchor_lang::solana_program::clock::Clock::get().unwrap();
        std::cmp::min(c.unix_timestamp.try_into().unwrap(), reward_duration_end)
    }
}

#[account]
#[derive(Default)]
pub struct User {
    // The pool this user belongs to
    pool: Pubkey,
    // The owner of this account
    owner: Pubkey,
    // The amount of reward tokens claimed
    reward_per_token_complete: u128,
    // The amount of reward tokens pending claim
    reward_per_token_pending: u64,
    // The amount staked
    balance_staked: u64,
    // Signer nonce
    nonce: u8,
}

#[error]
pub enum ErrorCode {
    #[msg("Amount must be greater than zero.")]
    AmountMustBeGreaterThanZero,
    #[msg("Insufficient funds to unstake.")]
    InsufficientFundUnstake,
}