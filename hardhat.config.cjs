require("@nomicfoundation/hardhat-ethers");
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.35",
  networks: {
    hardhat: {
      hardfork: "osaka", // Fusaka (osaka in hardhat) hard fork
      // Generated Poseidon bytecode exceeds the 24576-byte EIP-170 mainnet limit for nInputs >= 6
      // EIP-7907 (In Draft now), which proposes increasing Ethereum's contract code size limit, is slated to be introduced in the Glamsterdam hard fork
      // We need to set `allowUnlimitedContractSize` to true in order to deploy the Poseidon library on hardhat's local network
      allowUnlimitedContractSize: true,
    },
  },
};
