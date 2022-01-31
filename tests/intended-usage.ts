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

  // Inflation Distributer
  const inflationDistibuter = anchor.web3.Keypair.generate();
  let inflationDistributerTokenAAccount;

  // User Keypair
  const user1 = anchor.web3.Keypair.generate();
  const user2 = anchor.web3.Keypair.generate();
  const user3 = anchor.web3.Keypair.generate();
  const user4 = anchor.web3.Keypair.generate();
  const user5 = anchor.web3.Keypair.generate();

  // PoolCreator Keypair
  const pool1Creator = anchor.web3.Keypair.generate();

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

  let pool1CreatorRewardTokenAccount;

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
    pool1CreatorRewardTokenAccount = await mintRewardToken.createAssociatedTokenAccount(pool1Creator.publicKey);

    // Create our users Mint A Token Accounts
    user1TokenAAccount = await mintA.createAssociatedTokenAccount(user1.publicKey);
    user2TokenAAccount = await mintA.createAssociatedTokenAccount(user2.publicKey);
    user3TokenAAccount = await mintA.createAssociatedTokenAccount(user3.publicKey);
    user4TokenAAccount = await mintA.createAssociatedTokenAccount(user4.publicKey);
    user5TokenAAccount = await mintA.createAssociatedTokenAccount(user5.publicKey);

    // Create our inflationDistributer Account
    inflationDistributerTokenAAccount = await mintA.createAssociatedTokenAccount(inflationDistibuter.publicKey);

    // Mint Token A to infaltionDistributer
    await mintA.mintTo(
      inflationDistributerTokenAAccount,
      mintAuthority.publicKey,
      [mintAuthority],
      500_000_000 * (10 ** DECIMALS),
    );

    // Mint some Token A to users
    await mintToUser(user1TokenAAccount, mintA, MINT_A_AMOUNT);
    await mintToUser(user2TokenAAccount, mintA, MINT_A_AMOUNT);
    await mintToUser(user3TokenAAccount, mintA, MINT_A_AMOUNT);
    await mintToUser(user4TokenAAccount, mintA, MINT_A_AMOUNT);
    await mintToUser(user5TokenAAccount, mintA, MINT_A_AMOUNT);

    // Mint Reward Tokens to our poolCreator
    const AMOUNT_OF_REWARD_TOKENS_TO_MINT = 5000 * (10 ** DECIMALS);
    await mintRewardToken.mintTo(pool1CreatorRewardTokenAccount, mintAuthority, [], AMOUNT_OF_REWARD_TOKENS_TO_MINT);

    await printCreatorTokenBalance(pool1CreatorRewardTokenAccount);


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

    // Find our users UserAccount PDA's
    await findUsersUserAccounts();
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


    let poolCreatorBalanceBefore = await provider.connection.getBalance(pool1Creator.publicKey);

    await provider.connection.confirmTransaction(
      await creatorPoolProgram.rpc.initializePool(
        pool1SignerNonce,
        new anchor.BN(1),
        {
          accounts: {
            authority: pool1Creator.publicKey,
            stakingMint: xMintA.publicKey,
            stakingVault: pool1StakeVault,
            rewardMint: mintRewardToken.publicKey,
            rewardVault: pool1RewardVault,
            poolSigner: pool1Signer,
            pool: pool1Keypair.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          },
          signers: [pool1Keypair, pool1Creator]
        }
      ),
      "confirmed"
    );

    await printPoolAccountData(pool1Keypair.publicKey);

    let poolCreatorBalanceAfter = await provider.connection.getBalance(pool1Creator.publicKey);
    console.log("Pool Account Creation Cost: ", (poolCreatorBalanceBefore - poolCreatorBalanceAfter) / anchor.web3.LAMPORTS_PER_SOL);

  });

  it('Creates a User Account for User1', async () => {
    await createUserAccount(user1, user1UserAccountNonce, user1UserAccountAddress, pool1Keypair);
    await printUserAccountData(user1UserAccountAddress, "User1");
    let userAccountBalance = await provider.connection.getBalance(user1UserAccountAddress);
    console.log("User Account Balance: ", userAccountBalance / anchor.web3.LAMPORTS_PER_SOL);
    let userTokenSolBalance = await provider.connection.getBalance(user1TokenAAccount);
    console.log("User Token Account Sol Account Balance: ", userTokenSolBalance / anchor.web3.LAMPORTS_PER_SOL);

  });

  it('User1 Stakes 200 tokens', async () => {
    const amountToStakeToBaseProgram = 200;
    // User stakes to the base-staking program, and the creators pool
    await stakeFullProcess(user1, user1UserAccountAddress, user1TokenAAccount, user1xTokenAAccount, amountToStakeToBaseProgram);
    
        // Print useful logging info
    await printUserAccountData(user1UserAccountAddress, "User1");
    await printPoolAccountData(pool1Keypair.publicKey);
    await printUserTokenBalances(user1TokenAAccount, user1xTokenAAccount, user1RewardTokenAccount, "User1");
  });

  it('11% APY Inflation Rewards Deposited to Stake Vault', async () => {
    // Calculate 11% APY of base-staking vault
    let stakeVaultAmount = (await mintA.getAccountInfo(pdaStakeVaultTokenAAddress)).amount.toNumber();
    let yearlyAmount = Math.floor(0.11 * stakeVaultAmount);
    let depositAmount = Math.floor((yearlyAmount / 12)) / (10 ** DECIMALS);
    console.log("Deposit Amount: ", depositAmount);

    await depositInflationRewards(depositAmount);
    await printPoolAccountData(pool1Keypair.publicKey);
  });

  it('User2 Stakes 400 tokens - first time', async () => {
    const amountToStakeToBaseProgram = 400;
    // Need to create the UserAccount on first stake
    await createUserAccount(user2, user2UserAccountNonce, user2UserAccountAddress, pool1Keypair);
    
    // User stakes to the base-staking program, and the creators pool
    await stakeFullProcess(user2, user2UserAccountAddress, user2TokenAAccount, user2xTokenAAccount, amountToStakeToBaseProgram);
    
    // Print useful logging info
    await printUserAccountData(user2UserAccountAddress, "User2");
    await printPoolAccountData(pool1Keypair.publicKey);
    await printUserTokenBalances(user2TokenAAccount, user2xTokenAAccount, user2RewardTokenAccount, "User2");
  });

  it('Creator sends rewards to pool', async () => {
    await creatorSendsRewards(pool1Keypair, pool1StakeVault, pool1RewardVault, pool1Creator, pool1CreatorRewardTokenAccount, pool1Signer);
  });

  it('User1 Claims Rewards', async () => {
    await claimPoolRewards(user1, user1UserAccountAddress, user1RewardTokenAccount, "User1");
  });

  it('User2 Claims Rewards', async () => {
    await claimPoolRewards(user2, user2UserAccountAddress, user2RewardTokenAccount, "User2");
  });

  it ('User1 Unstakes from Creator Pool', async () => {
    await unstakeFullProcess(user1, user1UserAccountAddress, user1TokenAAccount, user1xTokenAAccount);
    await printUserTokenBalances(user1TokenAAccount, user1xTokenAAccount, user1RewardTokenAccount, "User1");
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

  async function depositInflationRewards(amount) {
    const AMOUNT_TO_REWARD = amount * (10 ** DECIMALS);
    TOTAL_BASE_STAKE_VAULT_AMOUNT += AMOUNT_TO_REWARD;

    await mintA.transfer(
      inflationDistributerTokenAAccount,
      pdaStakeVaultTokenAAddress,
      inflationDistibuter,
      [],
      AMOUNT_TO_REWARD,
    );
    
    // Get the amount of Tokens in the Stake Vault
    let pdaStakeVaultTokenAAmount = (await mintA.getAccountInfo(pdaStakeVaultTokenAAddress)).amount.toNumber();
    console.log("Stake Vault Amount: ", pdaStakeVaultTokenAAmount / (10 ** DECIMALS));
    assert.equal(pdaStakeVaultTokenAAmount, TOTAL_BASE_STAKE_VAULT_AMOUNT);
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
      await provider.connection.requestAirdrop(pool1Creator.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
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
    //await provider.connection.confirmTransaction(
    //  await provider.connection.requestAirdrop(user3.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
    //  "confirmed"
    //);
    //await provider.connection.confirmTransaction(
    //  await provider.connection.requestAirdrop(user4.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
    //  "confirmed"
    //);
    //await provider.connection.confirmTransaction(
    //  await provider.connection.requestAirdrop(user5.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
    //  "confirmed"
    //);
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(inflationDistibuter.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );
  }

  async function printUserTokenBalances(userTokenAccount, userXTokenAccount, userRewardTokenAccount, userAsString) {
    let tokenBalance = (await mintA.getAccountInfo(userTokenAccount)).amount.toNumber();
    let xTokenBalance = (await xMintA.getAccountInfo(userXTokenAccount)).amount.toNumber();
    let rewardBalance = (await mintRewardToken.getAccountInfo(userRewardTokenAccount)).amount.toNumber();

    console.log(`-----${userAsString} Token Balances -----`);
    console.log("Token A Balance: ", tokenBalance / (10 ** DECIMALS));
    console.log("xToken Balance: ", xTokenBalance / (10 ** DECIMALS));
    console.log("Reward Token Balance: ", rewardBalance / (10 ** DECIMALS));
  }

  async function printCreatorTokenBalance(tokenAccount) {
    let rewardsBalance = (await mintRewardToken.getAccountInfo(tokenAccount)).amount.toNumber();
    console.log("----- Pool Creator Token Balance ----- ");
    console.log("Reward Tokens: ", rewardsBalance / (10 ** DECIMALS));
  }

  async function printUserAccountData(userAccountAddress, userAsString) {
    let userAccount = await creatorPoolProgram.account.user.fetch(userAccountAddress);
    let poolPubkey = userAccount.pool.toString();
    let owner = userAccount.owner.toString();
    let balanceStaked = userAccount.balanceStaked.toNumber();


    console.log(`------ ${userAsString} Account Data ------`);
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

  async function stakeFullProcess(user, userUserAccountAddress, userTokenAAccount, userxTokenAAccount, baseAmount) {
    // First the users Tokens will be staked to the base-staking program
    let xTokensReceived = await stakeTokensToBaseStakingProgram(user, userTokenAAccount, userxTokenAAccount, baseAmount);

    await provider.connection.confirmTransaction(
      await creatorPoolProgram.rpc.stake(
        new anchor.BN(xTokensReceived),
        {
          accounts: {
            pool: pool1Keypair.publicKey,
            stakingVault: pool1StakeVault,
            user: userUserAccountAddress,
            owner: user.publicKey,
            stakeFromAccount: userxTokenAAccount,
            poolSigner: pool1Signer,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
          signers: [user]
        }
      ),
      "confirmed"
    );
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


    return USER_X_TOKENS_FOR_STAKE;
  }

  async function unstakeFullProcess(user, userUserAccountAddress, userTokenAAccount, userxTokenAAccount) {
    // First the users Tokens will be unstaked from the creators pool
    let stakedToPoolAmount = (await creatorPoolProgram.account.user.fetch(userUserAccountAddress)).balanceStaked;

    await provider.connection.confirmTransaction(
      await creatorPoolProgram.rpc.unstake(
        new anchor.BN(stakedToPoolAmount),
        {
          accounts: {
            pool: pool1Keypair.publicKey,
            stakingVault: pool1StakeVault,
            user: userUserAccountAddress,
            owner: user.publicKey,
            stakeFromAccount: userxTokenAAccount,
            poolSigner: pool1Signer,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
          signers: [user]
        }
      ),
      "confirmed"
    );

    await unstakexTokensFromBaseStakingProgram(user, userTokenAAccount, userxTokenAAccount);
  }

  async function unstakexTokensFromBaseStakingProgram(user, userTokenAAccount, userxTokenAAccount) {

    // Calculate amount of xTokens they recieve for staking
    const TOTAL_STAKE_AMOUNT = (await mintA.getAccountInfo(pdaStakeVaultTokenAAddress)).amount.toNumber();
    const TOTAL_MINTED_XTOKENS = (await xMintA.getMintInfo()).supply.toNumber();

    const AMOUNT_TO_UNSTAKE = (await xMintA.getAccountInfo(userxTokenAAccount)).amount.toNumber();
    const AMOUNT_FOR_UNSTAKE = calculateTokensForUnstake(AMOUNT_TO_UNSTAKE, TOTAL_STAKE_AMOUNT, TOTAL_MINTED_XTOKENS);
    TOTAL_BASE_STAKE_VAULT_AMOUNT -= AMOUNT_FOR_UNSTAKE;

    await provider.connection.confirmTransaction(
      await baseStakingProgram.rpc.unstake(
        pdaStakeVaultTokenABump,
        new anchor.BN(AMOUNT_TO_UNSTAKE),
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
  }



  async function creatorSendsRewards(poolKeypair, poolStakeVault, poolRewardVault, creator, creatorRewardTokenAccount, poolSigner) {
    await provider.connection.confirmTransaction(
      await creatorPoolProgram.rpc.fund(
        new anchor.BN(1000 * (10 ** DECIMALS)),
        {
          accounts: {
            pool: poolKeypair.publicKey,
            stakingVault: poolStakeVault,
            rewardVault: poolRewardVault,
            funder: creator.publicKey,
            from: creatorRewardTokenAccount,
            poolSigner: poolSigner,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
          signers: [creator]
        }
      ),
      "confirmed"
    );
    await printCreatorTokenBalance(creatorRewardTokenAccount);
    await printPoolAccountData(poolKeypair.publicKey);

    // Wait for Funds to be distributed
    await wait(1);
  }

  async function claimPoolRewards(user, userUserAccountAddress, userRewardTokenAccount, userAsString) {
    
    await provider.connection.confirmTransaction(
      await creatorPoolProgram.rpc.claimReward(
        {
          accounts: {
            pool: pool1Keypair.publicKey,
            stakingVault: pool1StakeVault,
            rewardVault: pool1RewardVault,
            user: userUserAccountAddress,
            owner: user.publicKey,
            toRewardAccount: userRewardTokenAccount,
            poolSigner: pool1Signer,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
          signers: [user]
        }
      ),
      "confirmed"
    );

    await printUserAccountData(userUserAccountAddress, userAsString);
    await printPoolAccountData(pool1Keypair.publicKey);

    let userRewardTokens = (await mintRewardToken.getAccountInfo(userRewardTokenAccount)).amount;
    console.log(`${userAsString} Reward Tokens: `, userRewardTokens.toNumber() / (10 ** DECIMALS));
  }

  async function findUsersUserAccounts() {
    [user1UserAccountAddress, user1UserAccountNonce] = await anchor.web3.PublicKey.findProgramAddress(
      [user1.publicKey.toBuffer(), pool1Keypair.publicKey.toBuffer()],
      creatorPoolProgram.programId
    );
    [user2UserAccountAddress, user2UserAccountNonce] = await anchor.web3.PublicKey.findProgramAddress(
      [user2.publicKey.toBuffer(), pool1Keypair.publicKey.toBuffer()],
      creatorPoolProgram.programId
    );
    [user3UserAccountAddress, user3UserAccountNonce] = await anchor.web3.PublicKey.findProgramAddress(
      [user3.publicKey.toBuffer(), pool1Keypair.publicKey.toBuffer()],
      creatorPoolProgram.programId
    );
    [user4UserAccountAddress, user4UserAccountNonce] = await anchor.web3.PublicKey.findProgramAddress(
      [user4.publicKey.toBuffer(), pool1Keypair.publicKey.toBuffer()],
      creatorPoolProgram.programId
    );
    [user5UserAccountAddress, user5UserAccountNonce] = await anchor.web3.PublicKey.findProgramAddress(
      [user5.publicKey.toBuffer(), pool1Keypair.publicKey.toBuffer()],
      creatorPoolProgram.programId
    );
  }

  async function createUserAccount(user, userUserAccountNonce, userUserAccountAddress, poolKeypair) {
    await provider.connection.confirmTransaction(
      await creatorPoolProgram.rpc.createUser(
        userUserAccountNonce,
        {
          accounts: {
            pool: poolKeypair.publicKey,
            user: userUserAccountAddress,
            owner: user.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          },
          signers: [user]
        }
      ),
      "confirmed"
    );
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