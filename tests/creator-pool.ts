import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { CreatorPool } from '../target/types/creator_pool';

describe('creator-pool', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.CreatorPool as Program<CreatorPool>;

  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);
  });
});
