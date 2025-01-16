import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // Replace this with the deployed MockUSDC contract address
  const mockUSDCAddress = "0x3500254704CEa3448B63ef047821c84413611738";

  // Attach to the deployed MockUSDC contract
  const MockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);

  console.log(`Using MockUSDC at address: ${mockUSDCAddress}`);

  // Amount to mint (adjust decimals as per the token's setup)
  const amountToMint = ethers.utils.parseUnits("10000", 18); // 1,000,000 with 6 decimals
  console.log(`Minting ${ethers.utils.formatUnits(amountToMint, 18)} MockUSDC to ${deployer.address}...`);

  // Mint tokens to the deployer's address
  const mintTx = await MockUSDC.mint(deployer.address, amountToMint);
  await mintTx.wait();

  console.log(`Successfully minted ${ethers.utils.formatUnits(amountToMint, 18)} MockUSDC to ${deployer.address}`);

  // Verify balance
  const balance = await MockUSDC.balanceOf(deployer.address);
  console.log(`Updated MockUSDC balance: ${ethers.utils.formatUnits(balance, 18)} MockUSDC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("An error occurred:", error);
    process.exit(1);
  });
