import ControllerProvider from "@cartridge/controller";

// Cartridge Controller configured for Starknet Mainnet
const cartridgeController = new ControllerProvider({
  rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet",
  defaultChainId: "0x534e5f4d41494e", // SN_MAIN in hex
});

export default cartridgeController;

