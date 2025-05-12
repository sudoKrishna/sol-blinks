//file: src/app/api/actions/donate-sol/route.ts

import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  BLOCKCHAIN_IDS,
} from "@solana/actions";

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";


// CAIP-2 format for Solana
const blockchain = BLOCKCHAIN_IDS.devnet;

// Create a connection to the Solana blockchain
const connection = new Connection("https://api.devnet.solana.com");

// Set the donation wallet address
const donationWallet = "75CHrXnbdh2GnXs12d1fiqwm92LbQQApz7keCk9KWMLk";

// Create headers with CAIP blockchain ID
const headers = {
  ...ACTIONS_CORS_HEADERS,
  "x-blockchain-ids": blockchain,
  "x-action-version": "2.4",
};

// OPTIONS endpoint is required for CORS preflight requests
// Your Blink won't render if you don't add this
export const OPTIONS = async () => {
  return new Response(null, { headers });
};

// GET endpoint returns the Blink metadata (JSON) and UI configuration
export const GET = async (req: Request) => {
  // This JSON is used to render the Blink UI
  const response: ActionGetResponse = {
    type: "action",
    icon: `${new URL("/monkey.avif", req.url).toString()}`,
    label: "1 SOL",
    title: "Donate SOL",
    description:
      "This Blink is blink",
    // Links is used if you have multiple actions or if you need more than one params
    links: {
      actions: [
        {
          // Defines this as a blockchain transaction
          type: "transaction",
          label: "1 SOL",
          // This is the endpoint for the POST request
          href: `/api/actions/donate-sol?amount=0.01`,
        },
        {
          type: "transaction",
          label: "5 SOL",
          href: `/api/actions/donate-sol?amount=0.05`,
        },
        {
          type: "transaction",
          label: "50 SOL",
          href: `/api/actions/donate-sol?amount=0.1`,
        },
        {
          //  for a custom input field
          type: "transaction",
          href: `/api/actions/donate-sol?amount={amount}`,
          label: "Donate",
          parameters: [
            {
              name: "amount",
              label: "Enter a custom SOL amount",
              type: "number",
            },
          ],
        },
      ],
    },
  };

  // Return the response with proper headers
  return new Response(JSON.stringify(response), {
    status: 200,
    headers,
  });
};

// POST endpoint handles the actual transaction creation
export const POST = async (req: Request) => {
  try {
    // Step 1:Extract parameters from the URL
    const url = new URL(req.url);

    // Amount of SOL to transfer is passed in the URL
    const amount = Number(url.searchParams.get("amount"));

    // Payer public key is passed in the request body
    const request: ActionPostRequest = await req.json();
    const payer = new PublicKey(request.account);

    // Receiver is the donation wallet address
    const receiver = new PublicKey(donationWallet);

    // Step 2: Prepare the transaction
    const transaction = await prepareTransaction(
      connection,
      payer,
      receiver,
      amount
    );

    // Step 3: Create a response with the serialized transaction
    const response: ActionPostResponse = {
      type: "transaction",
      transaction: Buffer.from(transaction.serialize()).toString("base64"),
    };

    // Return the response with proper headers
    return Response.json(response, { status: 200, headers });
  } catch (error) {
    // Log and return an error response
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers,
    });
  }
};

const prepareTransaction = async (
  connection: Connection,
  payer: PublicKey,
  receiver: PublicKey,
  amount: number
) => {
  // Create a transfer instruction
  const instruction = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: new PublicKey(receiver),
    lamports: amount * LAMPORTS_PER_SOL,
  });

  // Get the latest blockhash
  const { blockhash } = await connection.getLatestBlockhash();

  // Create a transaction message
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: [instruction],
  }).compileToV0Message();

  // Create and return a versioned transaction
  return new VersionedTransaction(message);
};




