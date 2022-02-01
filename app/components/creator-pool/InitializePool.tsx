import { Button, Tooltip } from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TransactionSignature, PublicKey} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token, AccountLayout } from '@solana/spl-token';
import { FC, useCallback } from 'react';
import { useNotify } from '../notify';
import * as anchor from '@project-serum/anchor';
import idl from '../../idl/creator_pool.json';

export const InitializePool: FC = () => {
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

        let signature: TransactionSignature = '';
        try {
            const xMintPublicKey = new PublicKey("GZXvX8rxsnCVoBHbuxJ2xMj7uFLryY24jjZuTaVBQCuw");
            const usdcPublicKey = new PublicKey("vqucBusuHhDkCqkiFzyxkBU6kJ1QyH9MLjf2wKfUJ2H");
            const poolKeypair = anchor.web3.Keypair.generate();

            const [poolSigner, poolSignerNonce] = await anchor.web3.PublicKey.findProgramAddress(
                [poolKeypair.publicKey.toBuffer()],
                creatorPoolProgram.programId,
            );

            const poolStakeVault = anchor.web3.Keypair.generate();

            const poolRewardVault = anchor.web3.Keypair.generate();

            const transaction = new anchor.web3.Transaction();

            const balanceNeeded = await Token.getMinBalanceRentForExemptAccount(connection);
            
            // Add Stake Vault Account creation ix's to transaction
            transaction.add(anchor.web3.SystemProgram.createAccount({
                fromPubkey: publicKey,
                newAccountPubkey: poolStakeVault.publicKey,
                lamports: balanceNeeded,
                space: AccountLayout.span,
                programId: TOKEN_PROGRAM_ID,
            }));
            transaction.add(Token.createInitAccountInstruction(
                TOKEN_PROGRAM_ID, xMintPublicKey, poolStakeVault.publicKey, poolSigner
            ));

            // Add Reward Vault Account creation ix's to transaction
            transaction.add(anchor.web3.SystemProgram.createAccount({
                fromPubkey: publicKey,
                newAccountPubkey: poolRewardVault.publicKey,
                lamports: balanceNeeded,
                space: AccountLayout.span,
                programId: TOKEN_PROGRAM_ID,
            }));
            transaction.add(Token.createInitAccountInstruction(
                TOKEN_PROGRAM_ID, usdcPublicKey, poolRewardVault.publicKey, poolSigner
            ));

            // Add InitializePool ix to transaction
            transaction.add(creatorPoolProgram.instruction.initializePool(
                poolSignerNonce,
                new anchor.BN(1),
                {
                    accounts: {
                        authority: publicKey,
                        stakingMint: xMintPublicKey,
                        stakingVault: poolStakeVault.publicKey,
                        rewardMint: usdcPublicKey,
                        rewardVault: poolRewardVault.publicKey,
                        poolSigner: poolSigner,
                        pool: poolKeypair.publicKey,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    },
                }
            ));

            console.log("------- Pubkeys ------");
            console.log("Pool: ", poolKeypair.publicKey.toString());
            console.log("StakeVault: ", poolStakeVault.publicKey.toString());
            console.log("RewardVault: ", poolRewardVault.publicKey.toString());
            
            signature = await sendTransaction(transaction, connection, {signers: [poolStakeVault, poolRewardVault, poolKeypair]});
            notify('info', 'Transaction sent:', signature);

            await connection.confirmTransaction(signature, 'processed');
            notify('success', 'Transaction successful!', signature);
        } catch (error: any) {
            notify('error', `Transaction failed! ${error?.message}`, signature);
            return;
        }
    }, [publicKey, notify, connection, sendTransaction]);

    return (
        <Tooltip title="Initialize a Creator Pool with Vaults" placement="top">
            <Button variant="contained" color="secondary" onClick={onClick} disabled={!publicKey}>
                Initialize Creator Pool
            </Button>
        </Tooltip>
    );
};