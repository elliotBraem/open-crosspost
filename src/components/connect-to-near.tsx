import { toast } from "../hooks/use-toast";
import { usePlatformAccountsStore } from "../store/platform-accounts-store";
import { useDraftsStore } from "../store/drafts-store";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { Wallet } from "lucide-react";
import * as React from "react";
import { Button } from "./ui/button";
import { signalAuthorizationRevoked } from "../lib/authorization-events";

export function ConnectToNearButton(): React.ReactElement {
  const { signedAccountId, signIn, signOut } = useWalletSelector();
  const { clearSelectedAccounts } = usePlatformAccountsStore();
  const { drafts, updateDraft, deleteDraft, clearAutoSave } = useDraftsStore();

  const handleSignIn = async (): Promise<void> => {
    signIn();
  };

  const handleSignOut = (): void => {
    signOut().then(() => {
      // Reset auth state by signaling auth invalidation
      // This will clear the auth cookie and update any components listening for auth events
      signalAuthorizationRevoked();

      // Clear platform accounts
      clearSelectedAccounts();

      // Clear drafts and autosave
      clearAutoSave();

      // Clear all drafts
      if (drafts.length > 0) {
        drafts.forEach((draft) => {
          deleteDraft(draft.id);
        });
      }

      toast({
        title: "Signed out",
        description:
          "You have been signed out successfully. All connected accounts and drafts have been cleared.",
      });
    });
  };

  return (
    <Button
      onClick={signedAccountId ? handleSignOut : handleSignIn}
      className="text-sm sm:text-base"
    >
      <Wallet size={18} className="mr-2" />
      {signedAccountId
        ? window.innerWidth < 640
          ? "Disconnect"
          : `Disconnect @${signedAccountId}`
        : "Connect NEAR"}
    </Button>
  );
}
