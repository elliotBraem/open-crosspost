import { SOCIAL_CONTRACT } from "@/lib/near-social";
import { setupBitteWallet } from "@near-wallet-selector/bitte-wallet";
import "@near-wallet-selector/modal-ui/styles.css";
import { WalletSelectorProvider } from "@near-wallet-selector/react-hook";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import React from "react";
import "./index.css";
import { routeTree } from "./routeTree.gen";
// import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupNearMobileWallet } from "@near-wallet-selector/near-mobile-wallet";
import { setupIntearWallet } from "intear-wallet";
import { NETWORK_ID } from "./config";

// Create a new QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Create the router instance
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  context: {
    queryClient,
    auth: { userId: "guest" }, // Default to guest, will be updated when user connects
  },
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Main App component
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletSelectorProvider
        config={{
          network: NETWORK_ID,
          createAccessKeyFor: "crosspost.near",
          modules: [
            setupMyNearWallet(),
            setupMeteorWallet(),
            // setupHereWallet(),
            setupNearMobileWallet(),
            // @ts-ignore
            setupBitteWallet({ contractId: "crosspost.near" }),
            setupIntearWallet()
          ],
        }}
      >
        <RouterProvider router={router} />
      </WalletSelectorProvider>
    </QueryClientProvider>
  );
}
