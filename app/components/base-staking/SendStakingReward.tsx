import { Button, Tooltip } from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, TransactionSignature} from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID, MintLayout, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { FC, useCallback, useState } from 'react';
import * as anchor from '@project-serum/anchor';
import idl from '../../idl/base_staking.json';
import { useNotify } from '../notify';

export const SendStakingReward: FC = () => {
    const [inputAmount, setInputAmount] = useState(0);
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const notify = useNotify();

    const programId = new PublicKey(idl.metadata.address);
    //const provider = new anchor.Provider(connection, useWallet() as any, {preflightCommitment: "processed"});

    const onClick = useCallback(async () => {
        if (!publicKey) {
            notify('error', 'Wallet not connected!');
            return;
        }

        let signature: TransactionSignature = '';
        try {
            const DECIMALS = 6;
            const mintPublicKey = new PublicKey("6yuojUUduWfh86S2RH4mbcGbgW6H4FcnvVAKaBBpwJGF");
            
            // Find our Stake Vault PDA
            const [pdaStakeVaultTokenAAddress, pdaStakeVaultTokenABump] = await PublicKey.findProgramAddress(
                [Buffer.from("stake-vault"), mintPublicKey.toBuffer()],
                programId,
            );
            
            const ATA = await Token.getAssociatedTokenAddress(
                ASSOCIATED_TOKEN_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                mintPublicKey,
                publicKey,
                true,
            );

            // Calculate 11% APY
            let stakeVaultAmount = Number((await connection.getTokenAccountBalance(pdaStakeVaultTokenAAddress)).value.amount);
            let yearlyAmount = Math.floor(0.11 * stakeVaultAmount);
            let depositAmount = Math.floor(yearlyAmount / 12);
            
            const transaction = new Transaction().add(
                Token.createTransferInstruction(
                    TOKEN_PROGRAM_ID,
                    ATA,
                    pdaStakeVaultTokenAAddress,
                    publicKey,
                    [],
                    depositAmount,
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
    }, [publicKey, notify, connection, sendTransaction, inputAmount]);

    function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        console.log("Submitted amount", inputAmount);
        onClick();
    }

    return (
        <form onSubmit={onSubmit}>
            <label>
                Amount:
                <input type="text" size={3} value={inputAmount} onChange={e => setInputAmount(Number(e.target.value))} style={{color: 'black'}} disabled={!publicKey}/>
                <br/>
            </label>
            <input type="submit" value="Send Rewards" id="submit" disabled={!publicKey}/>
        </form>
    );
};