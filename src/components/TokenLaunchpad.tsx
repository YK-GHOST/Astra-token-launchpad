import React from "react";
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMint2Instruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  ExtensionType,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  getMintLen,
  LENGTH_SIZE,
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
} from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { createInitializeInstruction, pack } from "@solana/spl-token-metadata";

import { useForm } from "react-hook-form";

type FormData = {
  name: string;
  symbol: string;
  imageUrl: string;
  supply: string;
};

const TokenLaunchpad = () => {
  const { register, handleSubmit } = useForm<FormData>();
  const { connection } = useConnection();
  const wallet = useWallet();

  async function createToken(data: FormData) {
    if (wallet && wallet.connected && wallet.publicKey) {
      const mintKeypair = Keypair.generate();
      const metadata = {
        mint: mintKeypair.publicKey,
        name: data.name,
        symbol: data.symbol,
        uri: data.imageUrl,
        additionalMetadata: [],
      };

      const mintLen = getMintLen([ExtensionType.MetadataPointer]);
      const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

      const lamports = await connection.getMinimumBalanceForRentExemption(
        mintLen + metadataLen
      );

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMetadataPointerInstruction(
          mintKeypair.publicKey,
          wallet.publicKey,
          mintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          9,
          wallet.publicKey,
          null,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          mint: mintKeypair.publicKey,
          metadata: mintKeypair.publicKey,
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
          mintAuthority: wallet.publicKey,
          updateAuthority: wallet.publicKey,
        })
      );

      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
      transaction.partialSign(mintKeypair);

      await wallet.sendTransaction(transaction, connection);

      console.log(`Token mint created at ${mintKeypair.publicKey.toBase58()}`);
      const associatedToken = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      console.log(associatedToken.toBase58());

      const transaction2 = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          associatedToken,
          wallet.publicKey,
          mintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        )
      );

      await wallet.sendTransaction(transaction2, connection);

      const transaction3 = new Transaction().add(
        createMintToInstruction(
          mintKeypair.publicKey,
          associatedToken,
          wallet.publicKey,
          1000000000,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      await wallet.sendTransaction(transaction3, connection);

      console.log("Minted!");
    } else {
      alert("Wallet not connected, please connect your wallet.");
    }
  }
  return (
    <div className="h-screen flex justify-center  items-center flex-col bg-neutral-950">
      <div className=" text-neutral-200 py-2 px-4 w-[50rem] h-[25rem] text-center flex flex-col gap-[3rem]">
        <h1 className="font-bold text-3xl">Solana Token Launchpad</h1>
        <form
          onSubmit={handleSubmit(createToken)}
          className="flex flex-col gap-5"
        >
          <input
            {...register("name")}
            type="text"
            placeholder="Name"
            className="bg-neutral-800 border-neutral-700 border w-full h-[3rem] p-2 rounded-md focus:border-2 focus:outline-none"
            required
          />
          <input
            {...register("symbol")}
            type="text"
            placeholder="Symbol"
            className="bg-neutral-800 border-neutral-700 border w-full h-[3rem] p-2 rounded-md focus:border-2 focus:outline-none"
            required
          />
          <input
            {...register("imageUrl")}
            type="text"
            placeholder="Image URL"
            className="bg-neutral-800 border-neutral-700 border w-full h-[3rem] p-2 rounded-md focus:border-2 focus:outline-none"
            required
          />

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};
export default TokenLaunchpad;
