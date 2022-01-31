import { Button, Tooltip } from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, Transaction, TransactionSignature} from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID, MintLayout, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { FC, useCallback } from 'react';
import { useNotify } from '../notify';

export const Mint: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const notify = useNotify();

    const onClick = useCallback(async () => {
        if (!publicKey) {
            notify('error', 'Wallet not connected!');
            return;
        }

        let signature: TransactionSignature = '';
        try {
            const DECIMALS = 6;
            const mint = Keypair.generate();
            const ATA = await Token.getAssociatedTokenAddress(
                ASSOCIATED_TOKEN_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                mint.publicKey,
                publicKey,
                true,
            );
            const transaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: publicKey,
                    newAccountPubkey: mint.publicKey,
                    space: MintLayout.span,
                    lamports: await Token.getMinBalanceRentForExemptMint(connection),
                    programId: TOKEN_PROGRAM_ID,
                }),
                Token.createInitMintInstruction(
                    TOKEN_PROGRAM_ID,
                    mint.publicKey,
                    DECIMALS,
                    publicKey,
                    publicKey,
                ),
                Token.createAssociatedTokenAccountInstruction(
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                    TOKEN_PROGRAM_ID,
                    mint.publicKey,
                    ATA,
                    publicKey,
                    publicKey,
                ),
                Token.createMintToInstruction(
                    TOKEN_PROGRAM_ID,
                    mint.publicKey,
                    ATA,
                    publicKey,
                    [],
                    1000 * (10 ** DECIMALS)
                )
                
            );

            signature = await sendTransaction(transaction, connection, {signers: [mint]});
            notify('info', 'Transaction sent:', signature);

            await connection.confirmTransaction(signature, 'processed');
            notify('success', 'Transaction successful!', signature);
        } catch (error: any) {
            notify('error', `Transaction failed! ${error?.message}`, signature);
            return;
        }
    }, [publicKey, notify, connection, sendTransaction]);

    return (
        <Tooltip title="Creates a Mint and mints 1000 tokens to wallet" placement="top">
            <Button variant="contained" color="secondary" onClick={onClick} disabled={!publicKey}>
                Mint
            </Button>
        </Tooltip>
    );
};