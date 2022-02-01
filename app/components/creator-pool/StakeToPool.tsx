import { Button, Tooltip } from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TransactionSignature, PublicKey} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from '@solana/spl-token';
import { FC, useCallback, useState } from 'react';
import { useNotify } from '../notify';
import * as anchor from '@project-serum/anchor';
import idl from '../../idl/creator_pool.json';

export const StakeToPool: FC = () => {
    const [inputAmount, setInputAmount] = useState(0);
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
        const stakeVaultPubKey = new PublicKey("Bo6dK2AWro91FpU3xvmVwYkcfRDmkdyCUMa2LyshVJ35");        const xMintPublicKey = new PublicKey("GZXvX8rxsnCVoBHbuxJ2xMj7uFLryY24jjZuTaVBQCuw");

        const [poolSigner, poolSignerNonce] = await anchor.web3.PublicKey.findProgramAddress(
            [poolPubKey.toBuffer()],
            creatorPoolProgram.programId,
        );

        const [userAccountAddress, userAccountNonce] = await anchor.web3.PublicKey.findProgramAddress(
            [publicKey.toBuffer(), poolPubKey.toBuffer()],
            creatorPoolProgram.programId
        );

        const xTokenATA = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            xMintPublicKey,
            publicKey,
            true,
        );

        let signature: TransactionSignature = '';
        try {

            signature = await creatorPoolProgram.rpc.stake(
                new anchor.BN(inputAmount * (10 ** DECIMALS)),
                {
                    accounts: {
                        pool: poolPubKey,
                        stakingVault: stakeVaultPubKey,
                        user: userAccountAddress,
                        owner: publicKey,
                        stakeFromAccount: xTokenATA,
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
    }, [publicKey, notify, connection, sendTransaction, inputAmount]);

    function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        onClick();
    }

    return (
        <form onSubmit={onSubmit}>
            <label>
                Amount:
                <input type="text" size={3} value={inputAmount} onChange={e => setInputAmount(Number(e.target.value))} style={{color: 'black'}} disabled={!publicKey}/>
                <br/>
            </label>
            <input type="submit" value="Stake" id="submit" disabled={!publicKey}/>
        </form>
    );
};