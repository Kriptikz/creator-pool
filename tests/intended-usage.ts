import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { CreatorPool } from '../target/types/creator_pool';
import { BaseStaking } from '../target/types/base_staking';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { assert } from 'chai';

describe('intended-usage', () => {

  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const creatorPoolProgram = anchor.workspace.CreatorPool as Program<CreatorPool>;
  const baseStakingProgram = anchor.workspace.BaseStaking as Program<BaseStaking>;

  // Mint A Decimals
  const DECIMALS = 6;

  // Initial Mint amount
  const MINT_A_AMOUNT = 10000 * 10 ** DECIMALS;

  // User Keypair
  const user1 = anchor.web3.Keypair.generate();
  const user2 = anchor.web3.Keypair.generate();
  const user3 = anchor.web3.Keypair.generate();
  const user4 = anchor.web3.Keypair.generate();
  const user5 = anchor.web3.Keypair.generate();

  // PoolCreator Keypair
  const poolCreator = anchor.web3.Keypair.generate();

  // Pool Keypair
  const pool1Keypair = anchor.web3.Keypair.generate();

  // Mint Authority Keypair
  const mintAuthority = anchor.web3.Keypair.generate();

  // Payer Keypair
  const payer = anchor.web3.Keypair.generate();

  // Total amount staked by users
  let TOTAL_BASE_STAKE_VAULT_AMOUNT = 0;

  // Main Token Mint Account
  let mintA;

  // xToken Mint PDA
  let pdaxMintAAddress;
  let pdaxMintABump;

  // xToken Mint Account
  let xMintA;

  // Reward Token Mint Account
  let mintRewardToken;

  // Accounts for users
  let user1TokenAAccount;
  let user1xTokenAAccount;
  let user1RewardTokenAccount;
  let user1UserAccountAddress;
  let user1UserAccountNonce;


  let user2TokenAAccount;
  let user2xTokenAAccount;
  let user2RewardTokenAccount;
  let user2UserAccountAddress;
  let user2UserAccountNonce;

  let user3TokenAAccount;
  let user3xTokenAAccount;
  let user3RewardTokenAccount;
  let user3UserAccountAddress;
  let user3UserAccountNonce;

  let user4TokenAAccount;
  let user4xTokenAAccount;
  let user4RewardTokenAccount;
  let user4UserAccountAddress;
  let user4UserAccountNonce;

  let user5TokenAAccount;
  let user5xTokenAAccount;
  let user5RewardTokenAccount;
  let user5UserAccountAddress;
  let user5UserAccountNonce;

  let poolCreatorRewardTokenAccount;

  // Program Token Stake Vault PDA
  let pdaStakeVaultTokenAAddress;
  let pdaStakeVaultTokenABump;

  // Creator Pool Signer PDA
  let pool1Signer;
  let pool1SignerNonce;
  let pool1StakeVault;
  let pool1RewardVault;


  it('Test Set Up', async () => {
    // Airdop Sol
    await testSetUpAirdrop();

    // Create our Token A Mint
    mintA = await Token.createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      DECIMALS,
      TOKEN_PROGRAM_ID,
    );

    // Create our RewardToken mint
    mintRewardToken = await Token.createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      DECIMALS,
      TOKEN_PROGRAM_ID,
    );

    // Create our Reward Token Accounts
    user1RewardTokenAccount = await mintRewardToken.createAssociatedTokenAccount(user1.publicKey);
    user2RewardTokenAccount = await mintRewardToken.createAssociatedTokenAccount(user2.publicKey);
    user3RewardTokenAccount = await mintRewardToken.createAssociatedTokenAccount(user3.publicKey);
    user4RewardTokenAccount = await mintRewardToken.createAssociatedTokenAccount(user4.publicKey);
    user5RewardTokenAccount = await mintRewardToken.createAssociatedTokenAccount(user5.publicKey);
    poolCreatorRewardTokenAccount = await mintRewardToken.createAssociatedTokenAccount(poolCreator.publicKey);

    // Create our users Mint A Token Accounts
    user1TokenAAccount = await mintA.createAssociatedTokenAccount(user1.publicKey);
    user2TokenAAccount = await mintA.createAssociatedTokenAccount(user2.publicKey);
    user3TokenAAccount = await mintA.createAssociatedTokenAccount(user3.publicKey);
    user4TokenAAccount = await mintA.createAssociatedTokenAccount(user4.publicKey);
    user5TokenAAccount = await mintA.createAssociatedTokenAccount(user5.publicKey);

    // Mint some Token A to users
    await mintToUser(user1TokenAAccount, mintA, MINT_A_AMOUNT);
    await mintToUser(user2TokenAAccount, mintA, MINT_A_AMOUNT);
    await mintToUser(user3TokenAAccount, mintA, MINT_A_AMOUNT);
    await mintToUser(user4TokenAAccount, mintA, MINT_A_AMOUNT);
    await mintToUser(user5TokenAAccount, mintA, MINT_A_AMOUNT);

    // Mint Reward Tokens to our poolCreator
    const AMOUNT_OF_REWARD_TOKENS_TO_MINT = 5000 * (10 ** DECIMALS);
    await mintRewardToken.mintTo(poolCreatorRewardTokenAccount, mintAuthority, [], AMOUNT_OF_REWARD_TOKENS_TO_MINT);


    // Find our Stake Vault PDA
    [pdaStakeVaultTokenAAddress, pdaStakeVaultTokenABump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stake-vault"), mintA.publicKey.toBuffer()],
      baseStakingProgram.programId,
    );

    // Find our xToken Mint PDA
    [pdaxMintAAddress, pdaxMintABump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("x-mint"), mintA.publicKey.toBuffer()],
      baseStakingProgram.programId,
    );
  });

  it('Initialize xToken Mint', async () => {
    await provider.connection.confirmTransaction(
      await baseStakingProgram.rpc.initializeXMint(
        {
          accounts: {
            xMint: pdaxMintAAddress,
            mint: mintA.publicKey,
            stakeVault: pdaStakeVaultTokenAAddress,
            payer: payer.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          },
          signers: [payer]
        }
      )
    );

    let pdaxMintAAddressOwner = (await provider.connection.getAccountInfo(pdaxMintAAddress)).owner;
    //console.log("xMint Owner: ", pdaxMintAAddressOwner.toString());
    assert.equal(pdaxMintAAddressOwner.toString(), TOKEN_PROGRAM_ID.toString());

    // Create our xMintA object from our initialized xMint Account
    xMintA = new Token(provider.connection, pdaxMintAAddress, TOKEN_PROGRAM_ID, payer);

    // Create our users xMintA Associated Token Account
    user1xTokenAAccount = await xMintA.createAccount(user1.publicKey)
    user2xTokenAAccount = await xMintA.createAccount(user2.publicKey)
    user3xTokenAAccount = await xMintA.createAccount(user3.publicKey)
    user4xTokenAAccount = await xMintA.createAccount(user4.publicKey)
    user5xTokenAAccount = await xMintA.createAccount(user5.publicKey)

    // Verity the Program owner of a users xToken Account is the Token Program
    let user1xTokenAAccountOwner = (await provider.connection.getAccountInfo(user1TokenAAccount)).owner;
    //console.log("User1 xToken Account Owner: ", user1xTokenAAccountOwner.toString());
    assert.equal(user1xTokenAAccountOwner.toString(), TOKEN_PROGRAM_ID.toString());
  });

  it('Creates a pool', async () => {

    // Find our pool signer PDA
    [pool1Signer, pool1SignerNonce] = await anchor.web3.PublicKey.findProgramAddress(
      [pool1Keypair.publicKey.toBuffer()],
      creatorPoolProgram.programId,
    );

    pool1StakeVault = await xMintA.createAccount(pool1Signer);
    pool1RewardVault = await mintRewardToken.createAccount(pool1Signer);


    let poolCreatorBalanceBefore = await provider.connection.getBalance(poolCreator.publicKey);

    await provider.connection.confirmTransaction(
      await creatorPoolProgram.rpc.initializePool(
        pool1SignerNonce,
        new anchor.BN(1),
        {
          accounts: {
            authority: poolCreator.publicKey,
            stakingMint: xMintA.publicKey,
            stakingVault: pool1StakeVault,
            rewardMint: mintRewardToken.publicKey,
            rewardVault: pool1RewardVault,
            poolSigner: pool1Signer,
            pool: pool1Keypair.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          },
          signers: [pool1Keypair, poolCreator]
        }
      ),
      "confirmed"
    );

    await printPoolAccountData(pool1Keypair.publicKey);

    let poolCreatorBalanceAfter = await provider.connection.getBalance(poolCreator.publicKey);
    console.log("Pool Account Creation Cost: ", (poolCreatorBalanceBefore - poolCreatorBalanceAfter) / anchor.web3.LAMPORTS_PER_SOL);

  });

  it('Creates a User Account for User1', async () => {
    [user1UserAccountAddress, user1UserAccountNonce] = await anchor.web3.PublicKey.findProgramAddress(
      [user1.publicKey.toBuffer(), pool1Keypair.publicKey.toBuffer()],
      creatorPoolProgram.programId
    )

    await provider.connection.confirmTransaction(
      await creatorPoolProgram.rpc.createUser(
        user1UserAccountNonce,
        {
          accounts: {
            pool: pool1Keypair.publicKey,
            user: user1UserAccountAddress,
            owner: user1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          },
          signers: [user1]
        }
      ),
      "confirmed"
    );

    await printUserAccountData(user1UserAccountAddress);

  });

  it('User1 Stakes 200 tokens', async () => {
    const amountToStakeToBaseProgram = 200;
    // First the users Tokens will be staked to the base-staking program
    await stakeTokensToBaseStakingProgram(user1, user1TokenAAccount, user1xTokenAAccount, 200);

    // Calculate amount of xTokens they recieve for staking
    const TOTAL_STAKE_AMOUNT = (await mintA.getAccountInfo(pdaStakeVaultTokenAAddress)).amount.toNumber();
    const TOTAL_MINTED_XTOKENS = (await xMintA.getMintInfo()).supply.toNumber();
    let USER_X_TOKENS_FOR_STAKE = amountToStakeToBaseProgram;
    if (TOTAL_STAKE_AMOUNT != 0 && TOTAL_MINTED_XTOKENS != 0) {
     USER_X_TOKENS_FOR_STAKE = calculateXTokensForStake(amountToStakeToBaseProgram, TOTAL_STAKE_AMOUNT, TOTAL_MINTED_XTOKENS);
    };

    await provider.connection.confirmTransaction(
      await creatorPoolProgram.rpc.stake(
        new anchor.BN(USER_X_TOKENS_FOR_STAKE * (10 ** DECIMALS)),
        {
          accounts: {
            pool: pool1Keypair.publicKey,
            stakingVault: pool1StakeVault,
            user: user1UserAccountAddress,
            owner: user1.publicKey,
            stakeFromAccount: user1xTokenAAccount,
            poolSigner: pool1Signer,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
          signers: [user1]
        }
      ),
      "confirmed"
    );

    await printUserAccountData(user1UserAccountAddress);
    await printPoolAccountData(pool1Keypair.publicKey);
  });

  // ------------------------------------------------------------------------------
  // |                          Utility Functions                                 |
  // ------------------------------------------------------------------------------

  async function mintToUser(userTokenAccount, mint, amount) {
    await mint.mintTo(
      userTokenAccount,
      mintAuthority.publicKey,
      [mintAuthority],
      amount,
    );

    // Verify we minted the correct amount for the user
    let userTokenAmount = (await mintA.getAccountInfo(userTokenAccount)).amount.toNumber();
    assert.equal(userTokenAmount, MINT_A_AMOUNT);
  }

  async function testSetUpAirdrop() {
    // Airdrop 5 Sol to payer, mintAuthority, poolCreator, and users
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(mintAuthority.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(poolCreator.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user1.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user2.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user3.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user4.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user5.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );
  }

  async function printUserAccountData(userAccountAddress) {
    let userAccount = await creatorPoolProgram.account.user.fetch(userAccountAddress);
    let poolPubkey = userAccount.pool.toString();
    let owner = userAccount.owner.toString();
    let balanceStaked = userAccount.balanceStaked.toNumber();

    console.log("------ User Account Data ------");
    console.log("Pool Pubkey: ", poolPubkey);
    console.log("owner: ", owner);
    console.log("Balance Staked: ", balanceStaked / (10 ** DECIMALS));
  }

  async function printPoolAccountData(poolAccountAddress) {
    let poolAccount = await creatorPoolProgram.account.pool.fetch(poolAccountAddress);
    let stakedxTokenAmount = (await xMintA.getAccountInfo(poolAccount.stakingVault)).amount.toNumber();
    let rewardAmount = (await mintRewardToken.getAccountInfo(poolAccount.rewardVault)).amount.toNumber();
    let usersStaked = poolAccount.userStakeCount;

    const TOTAL_STAKE_AMOUNT = (await mintA.getAccountInfo(pdaStakeVaultTokenAAddress)).amount.toNumber();
    const TOTAL_MINTED_XTOKENS = (await xMintA.getMintInfo()).supply.toNumber();
    let stakedTokenAmount = calculateTokensForUnstake(stakedxTokenAmount, TOTAL_STAKE_AMOUNT, TOTAL_MINTED_XTOKENS);

    if (isNaN(stakedTokenAmount)) {
      stakedTokenAmount = 0;
    }

    console.log("----- Pool Account Data -----")
    //console.log("Pool Pubkey: ", poolAccountAddress.toString());
    console.log("Staked xToken Amount: ", stakedxTokenAmount / (10 ** DECIMALS));
    console.log("Staked Token Amount: ", stakedTokenAmount / (10 ** DECIMALS));
    console.log("Reward Amount: ", rewardAmount / (10 ** DECIMALS));
    console.log("Users Staked: ", usersStaked);

  }

  async function stakeTokensToBaseStakingProgram(user, userTokenAAccount, userxTokenAAccount, amount) {
    const AMOUNT_TO_STAKE_USER = amount * (10 ** DECIMALS);
    TOTAL_BASE_STAKE_VAULT_AMOUNT += AMOUNT_TO_STAKE_USER;

    // Calculate amount of xTokens they recieve for staking
    const TOTAL_STAKE_AMOUNT = (await mintA.getAccountInfo(pdaStakeVaultTokenAAddress)).amount.toNumber();
    const TOTAL_MINTED_XTOKENS = (await xMintA.getMintInfo()).supply.toNumber();
    let USER_X_TOKENS_FOR_STAKE = AMOUNT_TO_STAKE_USER;
    if (TOTAL_STAKE_AMOUNT != 0 && TOTAL_MINTED_XTOKENS != 0) {
     USER_X_TOKENS_FOR_STAKE = calculateXTokensForStake(AMOUNT_TO_STAKE_USER, TOTAL_STAKE_AMOUNT, TOTAL_MINTED_XTOKENS);
    };

    await provider.connection.confirmTransaction(
      await baseStakingProgram.rpc.stake(
        pdaxMintABump,
        new anchor.BN(AMOUNT_TO_STAKE_USER),
        {
          accounts: {
            xMint: pdaxMintAAddress,
            mint: mintA.publicKey,
            staker: user.publicKey,
            stakerTokenAccount: userTokenAAccount,
            stakerXTokenAccount: userxTokenAAccount,
            stakeVault: pdaStakeVaultTokenAAddress,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
          signers: [user]
        }
      )
    );

    // Get the amount of xTokens in users xToken Account
    let userxTokenAAmount = (await xMintA.getAccountInfo(userxTokenAAccount)).amount.toNumber();
    console.log("User xToken Amount: ", userxTokenAAmount / (10 ** DECIMALS));
    assert.equal(userxTokenAAmount, USER_X_TOKENS_FOR_STAKE);

    // Get the amount of Tokens in the Stake Vault
    let pdaStakeVaultTokenAAmount = (await mintA.getAccountInfo(pdaStakeVaultTokenAAddress)).amount.toNumber();
    console.log("Stake Vault Token Amount: ", pdaStakeVaultTokenAAmount / (10 ** DECIMALS));
    assert.equal(pdaStakeVaultTokenAAmount, TOTAL_BASE_STAKE_VAULT_AMOUNT);

  }

  function calculateXTokensForStake(amountToStake, totalStakeAmount, totalMintedXTokens) {
    return Math.floor(amountToStake / (totalStakeAmount / totalMintedXTokens))
  }

  function calculateTokensForUnstake(amountToUnstake, totalStakeAmount, totalMintedXTokens) {
    return Math.floor(amountToUnstake * (totalStakeAmount / totalMintedXTokens))
  }

  async function wait(seconds) {
    while(seconds > 0) {
      console.log("countdown " + seconds--);
      await new Promise(a=>setTimeout(a, 1000))
    }
    console.log("Wait Over");
  }

});