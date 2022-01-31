import { Button, Tooltip } from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TransactionSignature, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, Token, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { FC, useCallback } from 'react';
import { useNotify } from '../notify';
import * as anchor from '@project-serum/anchor';
import idl from '../../idl/base_staking.json';

export const UnstakeAllXToken: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction} = useWallet();
    const notify = useNotify();

    const programId = new PublicKey(idl.metadata.address);

    const provider = new anchor.Provider(connection, useWallet() as any, {preflightCommitment: "processed"});

    const baseStakingProgram = new anchor.Program(idl as any, programId, provider);

    const onClick = useCallback(async () => {
        if (!publicKey) {
            notify('error', 'Wallet not connected!');
            return;
        }

        let signature: TransactionSignature = '';
        try {
            const DECIMALS = 6;
            const mintPublicKey = new PublicKey("6yuojUUduWfh86S2RH4mbcGbgW6H4FcnvVAKaBBpwJGF");
            const xMintPublicKey = new PublicKey("GZXvX8rxsnCVoBHbuxJ2xMj7uFLryY24jjZuTaVBQCuw");
            // Find our Stake Vault PDA
            const [pdaStakeVaultTokenAAddress, pdaStakeVaultTokenABump] = await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from("stake-vault"), mintPublicKey.toBuffer()],
                baseStakingProgram.programId,
            );
  
            // Find our xToken Mint PDA
            const [pdaxMintAddress, pdaxMintBump] = await anchor.web3.PublicKey.findProgramAddress(
              [Buffer.from("x-mint"), mintPublicKey.toBuffer()],
              baseStakingProgram.programId,
            );

            const tokenATA = await Token.getAssociatedTokenAddress(
                ASSOCIATED_TOKEN_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                mintPublicKey,
                publicKey,
                true,
            );

            const xTokenATA = await Token.getAssociatedTokenAddress(
                ASSOCIATED_TOKEN_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                xMintPublicKey,
                publicKey,
                true,
            );

            let xTokenAmount = Number((await connection.getTokenAccountBalance(xTokenATA)).value.amount);

            signature = await baseStakingProgram.rpc.unstake(
                pdaStakeVaultTokenABump,
                new anchor.BN(xTokenAmount),
                {
                    accounts: {
                      xMint: pdaxMintAddress,
                      mint: mintPublicKey,
                      staker: publicKey,
                      stakerTokenAccount: tokenATA,
                      stakerXTokenAccount: xTokenATA,
                      stakeVault: pdaStakeVaultTokenAAddress,
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
        <Tooltip title="Unstakes all Tokens from the Base Staking Program" placement="top">
            <Button variant="contained" color="secondary" onClick={onClick} disabled={!publicKey}>
                Unstake All XTokens
            </Button>
        </Tooltip>
    );
};