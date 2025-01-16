import { ethers as hardhatEthers } from "hardhat";
import { ethers } from "ethers";
const ISwapRouter = require("../../../projects/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json");

async function main() {
  const [deployer] = await hardhatEthers.getSigners();

  const swapRouterAddress = "0x65e871159aEb64375af9188C461479E4D781487e";
  const mockUSDCAddress = "0x3500254704CEa3448B63ef047821c84413611738";
  const mUSDColdAddress = "0xa1226cf193A252418c99419815bEd1a9fb08AC2F";

  const SwapRouter = await hardhatEthers.getContractAt(ISwapRouter.abi, swapRouterAddress);

  const amountIn = ethers.utils.parseUnits("10", 18);
  const amountOutMin = amountIn.mul(99).div(100); // 1% slippage tolerance
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  console.log(`Swapping ${ethers.utils.formatUnits(amountIn, 18)} MockUSDC for mUSDCold...`);

  // Approve token spending
  const mockUSDCContract = await hardhatEthers.getContractAt("IERC20", mockUSDCAddress);
  const allowance = await mockUSDCContract.allowance(deployer.address, swapRouterAddress);

  if (allowance.lt(amountIn)) {
    console.log("Approving SwapRouter to spend MockUSDC...");
    const approveTx = await mockUSDCContract.approve(swapRouterAddress, ethers.constants.MaxUint256);
    await approveTx.wait();
    console.log("Approval successful.");
  }

  try {
    const swapTx = await SwapRouter.exactInputSingle({
      tokenIn: mockUSDCAddress,
      tokenOut: mUSDColdAddress,
      fee: 2500,
      recipient: deployer.address,
      deadline,
      amountIn,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0,
    });

    const receipt = await swapTx.wait();
    console.log("Swap completed successfully. Transaction hash:", receipt.transactionHash);
  } catch (error) {
    console.error("Swap failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in script:", error);
    process.exit(1);
  });
