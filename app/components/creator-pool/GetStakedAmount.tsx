import { Button, Tooltip } from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TransactionSignature, PublicKey} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from '@solana/spl-token';
import { FC, useCallback, useState } from 'react';
import { useNotify } from '../notify';
import * as anchor from '@project-serum/anchor';
import creatorPoolIdl from '../../idl/creator_pool.json';
import baseStakingIdl from '../../idl/base_staking.json';

export const GetStakedAmount: FC = () => {
    const [inputAmount, setInputAmount] = useState(0);
    const [stakedXTokens, setStakedXTokens] = useState(0);
    const [stakedTokens, setStakedTokens] = useState(0);
    const [rewardsPending, setRewardsPending] = useState(0);
    const { connection } = useConnection();
    const { publicKey, sendTransaction} = useWallet();
    const notify = useNotify();

    const wallet = useWallet();
    const provider = new anchor.Provider(connection, wallet as any, {preflightCommitment: "processed"});

    const creatorPoolProgram = new anchor.Program(creatorPoolIdl as any, creatorPoolIdl.metadata.address, provider);
    const baseStakingProgramId = new PublicKey(baseStakingIdl.metadata.address);
    const poolPubKey = new PublicKey("DN3EZ9AabnuvrbkeZEJQL3W8htbXFJWjH81Ax9X9JKxd");
    const DECIMALS = 6;

    async function getStake() {
        if (!publicKey) {
            notify('error', 'Wallet not connected!');
            return;
        }

        const [userAccountAddress, userAccountNonce] = await anchor.web3.PublicKey.findProgramAddress(
            [publicKey.toBuffer(), poolPubKey.toBuffer()],
            creatorPoolProgram.programId
        );

        const mintPublicKey = new PublicKey("6yuojUUduWfh86S2RH4mbcGbgW6H4FcnvVAKaBBpwJGF");
        const xMintPublicKey = new PublicKey("GZXvX8rxsnCVoBHbuxJ2xMj7uFLryY24jjZuTaVBQCuw");
        // Find our Stake Vault PDA
        const [pdaStakeVaultTokenAAddress, pdaStakeVaultTokenABump] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from("stake-vault"), mintPublicKey.toBuffer()],
            baseStakingProgramId,
        );

        // Find our xToken Mint PDA
        const [pdaxMintAddress, pdaxMintBump] = await anchor.web3.PublicKey.findProgramAddress(
          [Buffer.from("x-mint"), mintPublicKey.toBuffer()],
          baseStakingProgramId,
        );
        
        const userAccount = await creatorPoolProgram.account.user.fetch(userAccountAddress);
        const balanceStaked = userAccount.balanceStaked.toNumber();
        const pending = userAccount.rewardPerTokenPending.toNumber();

        // Calculate the rate for xTokens to Tokens
        const stakeVaultAmount = Number((await connection.getTokenAccountBalance(pdaStakeVaultTokenAAddress)).value.amount);
        const xTokenSupply = Number((await connection.getTokenSupply(pdaxMintAddress)).value.amount);
        const rate = stakeVaultAmount / xTokenSupply;
        const tokensStaked = Math.floor(balanceStaked * rate);
        
        setStakedXTokens(balanceStaked / (10 ** DECIMALS));
        setStakedTokens(tokensStaked / (10 ** DECIMALS));
        setRewardsPending(pending / (10 ** DECIMALS));
    }

    function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        getStake();
    }

    return (
        <form onSubmit={onSubmit}>
            <label>
                Staked xTokens: {stakedXTokens} <br/>
                Staked Tokens:  {stakedTokens} <br/>
                Rewards Pending: {rewardsPending} <br/>
            </label>
            <input type="submit" value="Get" id="submit" disabled={!publicKey}/>
        </form>
    );
};