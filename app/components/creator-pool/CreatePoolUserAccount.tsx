import { Button, Tooltip } from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TransactionSignature, PublicKey} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { FC, useCallback } from 'react';
import { useNotify } from '../notify';
import * as anchor from '@project-serum/anchor';
import idl from '../../idl/creator_pool.json';

export const CreatePoolUserAccount: FC = () => {
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
        const poolPubKey = new PublicKey("DN3EZ9AabnuvrbkeZEJQL3W8htbXFJWjH81Ax9X9JKxd");

        const [userAccountAddress, userAccountNonce] = await anchor.web3.PublicKey.findProgramAddress(
            [publicKey.toBuffer(), poolPubKey.toBuffer()],
            creatorPoolProgram.programId
        );

        let signature: TransactionSignature = '';
        try {

            signature = await creatorPoolProgram.rpc.createUser(
                userAccountNonce,
                {
                    accounts: {
                        pool: poolPubKey,
                        user: userAccountAddress,
                        owner: publicKey,
                        systemProgram: anchor.web3.SystemProgram.programId,
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
        <Tooltip title="Creates a User Account for a Creators Pool" placement="top">
            <Button variant="contained" color="secondary" onClick={onClick} disabled={!publicKey}>
                Create Pool User Account
            </Button>
        </Tooltip>
    );
};