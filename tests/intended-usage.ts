import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { CreatorPool } from '../target/types/creator_pool';
import { BaseStaking } from '../target/types/base_staking';

describe('intended-usage', () => {

  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const creatorPoolProgram = anchor.workspace.CreatorPool as Program<CreatorPool>;
  const baseStakingProgram = anchor.workspace.BaseStaking as Program<BaseStaking>;


  it('Is initialized!', async () => {
  });
});