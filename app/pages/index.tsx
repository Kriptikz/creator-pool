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
import { SendTransaction } from '../components/SendTransaction';
import { SignMessage } from '../components/SignMessage';
import { Mint } from '../components/base-staking/Mint';
import { InitializeXMint } from '../components/base-staking/InitializeXMint';
import { StakeForXToken } from '../components/base-staking/StakeForXToken';
import { CreateXTokenAccount } from '../components/base-staking/CreateXTokenAccount';
import { UnstakeAllXToken } from '../components/base-staking/UnstakeAllXToken';
import { SendStakingReward } from '../components/base-staking/SendStakingReward';
import { UnstakeByXTokenAmount } from '../components/base-staking/UnstakeByXTokenAmount';
import { UnstakeByTokenAmount } from '../components/base-staking/UnstakeByTokenAmount';
import pkg from '../package.json';

const Index: NextPage = () => {
    const { autoConnect, setAutoConnect } = useAutoConnect();

    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell sx={{minWidth: 100}}>Component</TableCell>
                    <TableCell sx={{minWidth: 200}}></TableCell>
                    <TableCell sx={{minWidth: 200}}>Example v{pkg.version}</TableCell>
                    <TableCell sx={{minWidth: 200}}></TableCell>
                    <TableCell sx={{minWidth: 200}}></TableCell>
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
                    <TableCell></TableCell>
                    <TableCell>
                    </TableCell>
                    <TableCell>
                    </TableCell>
                    <TableCell>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                </TableRow>
                <TableRow>
                    <TableCell></TableCell>
                    <TableCell>
                    </TableCell>
                    <TableCell>
                    </TableCell>
                    <TableCell>
                    </TableCell>
                    <TableCell>
                    </TableCell>
                    <TableCell></TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
};

export default Index;
