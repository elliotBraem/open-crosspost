import { readFile } from "fs/promises";
import { connect, Contract, Near, Account, keyStores, utils } from "near-api-js";
import { executeCommand, withSpinner } from "./helpers";

interface Web4Contract extends Contract {
  web4_get: (args: { request: { path: string } }) => Promise<any>;
}

export interface BosConfig {
  network?: string;
  account?: string;
}

export async function getConfigValues(): Promise<BosConfig> {
  try {
    const configPath = 'bos.config.json';
    const config = JSON.parse(await readFile(configPath, 'utf-8'));
    return {
      network: config.network,
      account: config.account
    };
  } catch (error) {
    return {};
  }
}


export async function createWeb4Account(network: string, account: string): Promise<void> {
  return withSpinner("Checking web4 subaccount", async (spinner) => {
    const subaccount = `web4.${account}`;
    const exists = await checkAccountExists(network, subaccount);

    if (exists) {
      spinner.succeed(`Web4 subaccount already exists`);
      return;
    }

    spinner.text = "Creating web4 subaccount";
    try {
      const command = [
        "near",
        "account",
        "create-account",
        "fund-myself",
        subaccount,
        "'1 NEAR'",
        "autogenerate-new-keypair",
        "save-to-keychain",
        `sign-as`,
        account,
        "network-config",
        network,
      ];
      await executeCommand(command);
      
      spinner.succeed("Web4 subaccount created successfully");
    } catch (error) {
      spinner.fail("Web4 subaccount creation failed");
      throw error;
    }
  });
}


export async function checkAccountExists(
  network: string,
  account: string,
): Promise<boolean> {
  try {
    const nodeUrl = network === "mainnet" 
      ? "https://rpc.mainnet.near.org"
      : "https://rpc.testnet.near.org";
    const near = await connect({ 
      networkId: network === "mainnet" ? "mainnet" : "testnet",
      nodeUrl
    });
    try {
      await near.connection.provider.query({
        request_type: "view_account",
        account_id: account,
        finality: "final"
      });
      return true;
    } catch (e) {
      if (e.toString().includes("does not exist")) {
        return false;
      }
      throw e;
    }
  } catch (error) {
    return false;
  }
}

export async function validateAccount(network: string, account: string): Promise<void> {
  return withSpinner("Validating account", async (spinner) => {
    const exists = await checkAccountExists(network, account);

    if (!exists) {
      throw new Error(`Account ${account} does not exist on ${network}`);
    }

    spinner.succeed(`Account ${account} exists on ${network}`);
  });
}

export async function checkContractExists(network: string, account: string): Promise<boolean> {
  return withSpinner("Checking contract existence", async (spinner) => {
    try {
      const nodeUrl = network === "mainnet" 
        ? "https://rpc.mainnet.near.org"
        : "https://rpc.testnet.near.org";
      const near = await connect({ 
        networkId: network === "mainnet" ? "mainnet" : "testnet",
        nodeUrl
      });
      
      // Create a random keypair for view calls
      const keyPair = utils.KeyPair.fromRandom('ed25519');
      const keyStore = new keyStores.InMemoryKeyStore();
      await keyStore.setKey(network === "mainnet" ? "mainnet" : "testnet", account, keyPair);
      
      const nearAccount = new Account(near.connection, account);
      
      const contract = new Contract(nearAccount, account, {
        viewMethods: ["web4_get"],
        changeMethods: []
      });
      
      try {
        // Try to call web4_get method
        await (contract as Web4Contract).web4_get({ request: { path: "/" } });
        spinner.succeed("Contract exists and has web4_get method");
        return true;
      } catch (e) {
        if (e.toString().includes("MethodResolveError")) {
          spinner.info("Contract does not have web4_get method");
          return false;
        }
        throw e;
      }
    } catch (error) {
      spinner.info("Contract does not exist");
      return false;
    }
  });
}

export async function deployToWeb4(network: string, account: string): Promise<void> {
  return withSpinner("Deploying to web4", async (spinner) => {
    try {
      // First check if contract needs to be deployed
      const contractExists = await checkContractExists(network, account);
      
      const command = [
        "npx",
        "github:vgrichina/web4-deploy",
        "dist",
        account,
      ];
      
      // Only add --deploy-contract if contract doesn't exist or doesn't have web4_get
      if (!contractExists) {
        command.push("--deploy-contract");
      }
      
      command.push("--nearfs", "--network", network);
      
      spinner.text = "Running deployment command...";
      await executeCommand(command);
      spinner.succeed("Deployed to web4 successfully");
    } catch (error) {
      spinner.fail("Deployment failed");
      throw error;
    }
  });
}
