import { FormControlLabel, Switch, Table, TableBody, TableCell, TableHead, TableRow, Tooltip } from '@mui/material';
import {
    WalletConnectButton as AntDesignWalletConnectButton,
    WalletDisconnectButton as AntDesignWalletDisconnectButton,
    WalletModalButton as AntDesignWalletModalButton,
    WalletMultiButton as AntDesignWalletMultiButton,
} from '@solana/wallet-adapter-ant-design';
import {
    WalletConnectButton as MaterialUIWalletConnectButton,
    WalletDialogButton as MaterialUIWalletDialogButton,
    WalletDisconnectButton as MaterialUIWalletDisconnectButton,
    WalletMultiButton as MaterialUIWalletMultiButton,
} from '@solana/wallet-adapter-material-ui';
import {
    WalletConnectButton as ReactUIWalletConnectButton,
    WalletDisconnectButton as ReactUIWalletDisconnectButton,
    WalletModalButton as ReactUIWalletModalButton,
    WalletMultiButton as ReactUIWalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import { NextPage } from 'next';
import { useAutoConnect } from '../components/AutoConnectProvider';
import { RequestAirdrop } from '../components/RequestAirdrop';
import { Mint } from '../components/base-staking/Mint';
import { InitializeXMint } from '../components/base-staking/InitializeXMint';
import { StakeForXToken } from '../components/base-staking/StakeForXToken';
import { CreateXTokenAccount } from '../components/base-staking/CreateXTokenAccount';
import { UnstakeAllXToken } from '../components/base-staking/UnstakeAllXToken';
import { SendStakingReward } from '../components/base-staking/SendStakingReward';
import { UnstakeByXTokenAmount } from '../components/base-staking/UnstakeByXTokenAmount';
import { UnstakeByTokenAmount } from '../components/base-staking/UnstakeByTokenAmount';
import { ClaimRewards } from '../components/creator-pool/ClaimRewards';
import { CreatePoolUserAccount } from '../components/creator-pool/CreatePoolUserAccount';
import { FundPoolRewards } from '../components/creator-pool/FundPoolRewards';
import { InitializePool } from '../components/creator-pool/InitializePool';
import { StakeToPool } from '../components/creator-pool/StakeToPool';
import { UnstakeFromPool } from '../components/creator-pool/UnstakeFromPool';
import { GetStakedAmount } from '../components/creator-pool/GetStakedAmount';
import Link from 'next/link';
import pkg from '../package.json';

const Index: NextPage = () => {
    const { autoConnect, setAutoConnect } = useAutoConnect();

    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell sx={{minWidth: 100}}>
                        <h1>
                            <Link href="/">
                                <a>Home</a>
                            </Link>
                        </h1>
                    </TableCell>
                    <TableCell sx={{minWidth: 200}}>
                        <h1>
                            <Link href="/usage">
                                <a>Easy-Usage</a>
                            </Link>
                        </h1>
                    </TableCell>
                    <TableCell sx={{minWidth: 200}}></TableCell>
                    <TableCell sx={{minWidth: 200}}></TableCell>
                    <TableCell sx={{minWidth: 200}}>
                    </TableCell>
                    <TableCell sx={{minWidth: 200}}></TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                <TableRow>
                    <TableCell>Wallet</TableCell>
                    <TableCell>
                        <ReactUIWalletConnectButton />
                    </TableCell>
                    <TableCell>
                        <ReactUIWalletDisconnectButton />
                    </TableCell>
                    <TableCell>
                        <ReactUIWalletModalButton />
                    </TableCell>
                    <TableCell>
                        <ReactUIWalletMultiButton />
                    </TableCell>
                    <TableCell></TableCell>
                </TableRow>
                <TableRow>
                    <TableCell></TableCell>
                    <TableCell>
                        <Tooltip title="Only runs if the wallet is ready to connect" placement="left">
                            <FormControlLabel
                                control={
                                    <Switch
                                        name="autoConnect"
                                        color="secondary"
                                        checked={autoConnect}
                                        onChange={(event, checked) => setAutoConnect(checked)}
                                    />
                                }
                                label="AutoConnect"
                            />
                        </Tooltip>
                    </TableCell>
                    <TableCell>
                        <RequestAirdrop />
                    </TableCell>
                    <TableCell>
                    </TableCell>
                    <TableCell>
                    </TableCell>
                    <TableCell></TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Base-Staking</TableCell>
                    <TableCell>
                        <Mint />
                    </TableCell>
                    <TableCell>
                        <InitializeXMint />
                    </TableCell>
                    <TableCell>
                        <CreateXTokenAccount />
                    </TableCell>
                    <TableCell>
                        <SendStakingReward />                     
                    </TableCell>
                    <TableCell>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell></TableCell>
                    <TableCell>
                        <StakeForXToken />
                    </TableCell>
                    <TableCell>
                        <UnstakeAllXToken />
                    </TableCell>
                    <TableCell>
                        <UnstakeByXTokenAmount />
                    </TableCell>
                    <TableCell>
                        <UnstakeByTokenAmount />
                    </TableCell>
                    <TableCell></TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Creator-Pool</TableCell>
                    <TableCell>
                        <InitializePool />
                    </TableCell>
                    <TableCell>
                        <CreatePoolUserAccount />
                    </TableCell>
                    <TableCell>
                        <FundPoolRewards />
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                </TableRow>
                <TableRow>
                    <TableCell></TableCell>
                    <TableCell>
                        <GetStakedAmount />
                    </TableCell>
                    <TableCell>
                        <StakeToPool />
                    </TableCell>
                    <TableCell>
                        <UnstakeFromPool />
                    </TableCell>
                    <TableCell>
                        <ClaimRewards />
                    </TableCell>
                    <TableCell></TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Hard-Coded PubKeys</TableCell>
                    <TableCell>
                        Pool Creator:
                        <br/>
                        <input type="text" id="pubKeys" defaultValue="AnDN8EjC512BaHYUM8rQ2d3MyL63b9U4JK5bF1TArLfg"/>
                        </TableCell>
                    <TableCell>
                        Pool: 
                        <br/>
                        <input type="text" id="pubKeys" defaultValue="DN3EZ9AabnuvrbkeZEJQL3W8htbXFJWjH81Ax9X9JKxd"/>
                        </TableCell>
                    <TableCell>
                        StakeVault: 
                        <br/>
                        <input type="text" id="pubKeys" defaultValue="Bo6dK2AWro91FpU3xvmVwYkcfRDmkdyCUMa2LyshVJ35"/>
                        </TableCell>
                    <TableCell>
                        RewardVault:
                        <br/>
                        <input type="text" id="pubKeys" defaultValue="3hVqqF8UmqbE6qj5gPT3BBae9uVN2URuA3QAySXcuqAw"/>
                        </TableCell>
                    <TableCell></TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
};

export default Index;
