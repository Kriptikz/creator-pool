import { Button, Tooltip } from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TransactionSignature, PublicKey, Transaction, SystemProgram} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, Token, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { FC, useCallback } from 'react';
import { useNotify } from '../notify';

export const CreateXTokenAccount: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction} = useWallet();
    const notify = useNotify();

    const onClick = useCallback(async () => {
        if (!publicKey) {
            notify('error', 'Wallet not connected!');
            return;
        }

        let signature: TransactionSignature = '';
        try {
            const xMintPublicKey = new PublicKey("GZXvX8rxsnCVoBHbuxJ2xMj7uFLryY24jjZuTaVBQCuw");


            const xTokenATA = await Token.getAssociatedTokenAddress(
                ASSOCIATED_TOKEN_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                xMintPublicKey,
                publicKey,
                true,
            );

            const transaction = new Transaction().add(
                Token.createAssociatedTokenAccountInstruction(
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                    TOKEN_PROGRAM_ID,
                    xMintPublicKey,
                    xTokenATA,
                    publicKey,
                    publicKey,
                ),              
            );

            signature = await sendTransaction(transaction, connection, {signers: []});
            notify('info', 'Transaction sent:', signature);

            await connection.confirmTransaction(signature, 'processed');
            notify('success', 'Transaction successful!', signature);
        } catch (error: any) {
            notify('error', `Transaction failed! ${error?.message}`, signature);
            return;
        }
    }, [publicKey, notify, connection, sendTransaction]);

    return (
        <Tooltip title="Creates an xToken Account for the user" placement="top">
            <Button variant="contained" color="secondary" onClick={onClick} disabled={!publicKey}>
                Create xToken Account
            </Button>
        </Tooltip>
    );
};