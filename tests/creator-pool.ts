import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { CreatorPool } from '../target/types/creator_pool';

describe('creator-pool', () => {

  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const creatorPoolProgram = anchor.workspace.CreatorPool as Program<CreatorPool>;


  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await creatorPoolProgram.rpc.initialize({});
    console.log("Your transaction signature", tx);

  });
});
