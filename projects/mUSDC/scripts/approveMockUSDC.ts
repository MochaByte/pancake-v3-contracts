import { ethers as hardhatEthers } from "hardhat";
import { ethers } from "ethers";

async function main() {
  const [deployer] = await hardhatEthers.getSigners();

  const mockUSDCAddress = "0x3500254704CEa3448B63ef047821c84413611738"; // Replace with the MockUSDC address
  const swapRouterAddress = "0x65e871159aEb64375af9188C461479E4D781487e"; // Replace with your SwapRouter address

  const MockUSDC = await hardhatEthers.getContractAt("IERC20", mockUSDCAddress);

  console.log(`Approving SwapRouter to spend MockUSDC on behalf of ${deployer.address}...`);

  // Check current allowance
  const currentAllowance = await MockUSDC.allowance(deployer.address, swapRouterAddress);
  console.log(`Current allowance: ${ethers.utils.formatUnits(currentAllowance, 18)} MockUSDC`);

  // Approve only if the current allowance is insufficient
  if (currentAllowance.lt(ethers.constants.MaxUint256)) {
    console.log("Setting approval for maximum amount...");
    const amountToApprove = ethers.constants.MaxUint256; // Approve maximum amount
    const approveTx = await MockUSDC.approve(swapRouterAddress, amountToApprove);
    await approveTx.wait();
    console.log("Approval transaction mined.");
  } else {
    console.log("SwapRouter already approved for maximum amount.");
  }

  console.log("Approval process completed successfully.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("An error occurred:", error);
    process.exit(1);
  });
