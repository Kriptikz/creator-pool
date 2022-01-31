import { Button, Tooltip } from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TransactionSignature, PublicKey} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { FC, useCallback } from 'react';
import { useNotify } from '../notify';
import * as anchor from '@project-serum/anchor';
import idl from '../../idl/base_staking.json';

export const InitializeXMint: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction} = useWallet();
    const notify = useNotify();

    const programId = new PublicKey(idl.metadata.address);

    const wallet = useWallet();
    const provider = new anchor.Provider(connection, wallet as any, {preflightCommitment: "processed"});

    const baseStakingProgram = new anchor.Program(idl as any, programId, provider);

    const onClick = useCallback(async () => {
        if (!publicKey) {
            notify('error', 'Wallet not connected!');
            return;
        }

        let signature: TransactionSignature = '';
        try {
            const mintPublicKey = new PublicKey("6yuojUUduWfh86S2RH4mbcGbgW6H4FcnvVAKaBBpwJGF");
            // Find our Stake Vault PDA
            const [pdaStakeVaultTokenAAddress, pdaStakeVaultTokenABump] = await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from("stake-vault"), mintPublicKey.toBuffer()],
                baseStakingProgram.programId,
            );
  
            // Find our xToken Mint PDA
            const [pdaxMintAAddress, pdaxMintABump] = await anchor.web3.PublicKey.findProgramAddress(
              [Buffer.from("x-mint"), mintPublicKey.toBuffer()],
              baseStakingProgram.programId,
            );

            signature = await baseStakingProgram.rpc.initializeXMint(
              {
                accounts: {
                  xMint: pdaxMintAAddress,
                  mint: mintPublicKey,
                  stakeVault: pdaStakeVaultTokenAAddress,
                  payer: publicKey,
                  tokenProgram: TOKEN_PROGRAM_ID,
                  systemProgram: anchor.web3.SystemProgram.programId,
                  rent: anchor.web3.SYSVAR_RENT_PUBKEY,
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
        <Tooltip title="Initializes an xToken Mint and Staking Vault" placement="top">
            <Button variant="contained" color="secondary" onClick={onClick} disabled={!publicKey}>
                InitializeXMint
            </Button>
        </Tooltip>
    );
};