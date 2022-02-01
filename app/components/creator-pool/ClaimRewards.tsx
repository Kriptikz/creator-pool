import { Button, Tooltip } from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TransactionSignature, PublicKey} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from '@solana/spl-token';
import { FC, useCallback } from 'react';
import { useNotify } from '../notify';
import * as anchor from '@project-serum/anchor';
import idl from '../../idl/creator_pool.json';

export const ClaimRewards: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction} = useWallet();
    const notify = useNotify();

    const programId = new PublicKey(idl.metadata.address);

    const wallet = useWallet();
    const provider = new anchor.Provider(connection, wallet as any, {preflightCommitment: "processed"});

    const creatorPoolProgram = new anchor.Program(idl as any, programId, provider);

    const onClick = useCallback(async () => {
        if (!publicKey) {
            notify('error', 'Wallet not connected!');
            return;
        }
        const DECIMALS = 6;

        const poolPubKey = new PublicKey("DN3EZ9AabnuvrbkeZEJQL3W8htbXFJWjH81Ax9X9JKxd");
        const usdcPublicKey = new PublicKey("vqucBusuHhDkCqkiFzyxkBU6kJ1QyH9MLjf2wKfUJ2H");
        const stakeVaultPubKey = new PublicKey("Bo6dK2AWro91FpU3xvmVwYkcfRDmkdyCUMa2LyshVJ35");        const xMintPublicKey = new PublicKey("GZXvX8rxsnCVoBHbuxJ2xMj7uFLryY24jjZuTaVBQCuw");
        const rewardVaultPubKey = new PublicKey("3hVqqF8UmqbE6qj5gPT3BBae9uVN2URuA3QAySXcuqAw");

        const [poolSigner, poolSignerNonce] = await anchor.web3.PublicKey.findProgramAddress(
            [poolPubKey.toBuffer()],
            creatorPoolProgram.programId,
        );

        const [userAccountAddress, userAccountNonce] = await anchor.web3.PublicKey.findProgramAddress(
            [publicKey.toBuffer(), poolPubKey.toBuffer()],
            creatorPoolProgram.programId
        );

        const usdcATA = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            usdcPublicKey,
            publicKey,
            true,
        );

        let signature: TransactionSignature = '';
        try {

            signature = await creatorPoolProgram.rpc.claimReward(
                {
                    accounts: {
                        pool: poolPubKey,
                        stakingVault: stakeVaultPubKey,
                        rewardVault: rewardVaultPubKey,
                        user: userAccountAddress,
                        owner: publicKey,
                        toRewardAccount: usdcATA,
                        poolSigner: poolSigner,
                        tokenProgram: TOKEN_PROGRAM_ID,
                    },
                }
            );
            notify('info', 'Transaction sent:', signature);

            await connection.confirmTransaction(signature, 'processed');
            notify('success', 'Transaction successful!', signature);
        } catch (error: any) {
            notify('error', `Transaction failed! ${error?.message}`, signature);
            return;
        }
    }, [publicKey, notify, connection, sendTransaction]);

    return (
        <Tooltip title="Claims Rewards from a Creators Pool" placement="top">
            <Button variant="contained" color="secondary" onClick={onClick} disabled={!publicKey}>
                Claim Rewards
            </Button>
        </Tooltip>
    );
};