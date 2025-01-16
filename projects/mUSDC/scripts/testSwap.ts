import { ethers as hardhatEthers } from "hardhat";
import { ethers } from "ethers";
const ISwapRouter = require("../../../projects/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json");
const IPool = require("../../../projects/v3-core/artifacts/contracts/Interfaces/IPancakeV3Pool.sol/IPancakeV3Pool.json");

async function main() {
  const [deployer] = await hardhatEthers.getSigners();

  const swapRouterAddress = "0x65e871159aEb64375af9188C461479E4D781487e"; // Confirm this is the correct SwapRouter address
  const mockUSDCAddress = "0x3500254704CEa3448B63ef047821c84413611738"; // MockUSDC address
  const mUSDColdAddress = "0xa1226cf193A252418c99419815bEd1a9fb08AC2F"; // mUSDCold address
  const poolAddress = "0x71770182788ad079700739152c1462A109387649"; // Replace with the actual pool address

  const SwapRouter = await hardhatEthers.getContractAt(ISwapRouter.abi, swapRouterAddress);
  const Pool = await hardhatEthers.getContractAt(IPool.abi, poolAddress);

  const amountIn = ethers.utils.parseUnits("1000", 18); // Amount of MockUSDC to swap
  let amountOutMin = ethers.utils.parseUnits("2", 18); // Minimum mUSDCold to receive
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10-minute deadline

  console.log(`Swapping ${ethers.utils.formatUnits(amountIn, 18)} MockUSDC for mUSDCold...`);

  // Check MockUSDC Balance
  const mockUSDCContract = await hardhatEthers.getContractAt("IERC20", mockUSDCAddress);
  const mockUSDCBalance = await mockUSDCContract.balanceOf(deployer.address);
  console.log(`MockUSDC Balance: ${ethers.utils.formatUnits(mockUSDCBalance, 18)}`);
  if (mockUSDCBalance.lt(amountIn)) {
    throw new Error("Insufficient MockUSDC balance for the swap.");
  }

  // Check Allowance
  const allowance = await mockUSDCContract.allowance(deployer.address, swapRouterAddress);
  console.log(`MockUSDC Allowance: ${ethers.utils.formatUnits(allowance, 18)}`);
  if (allowance.lt(amountIn)) {
    console.log("Approving MockUSDC for the SwapRouter...");
    const approveTx = await mockUSDCContract.approve(swapRouterAddress, ethers.constants.MaxUint256);
    await approveTx.wait();
    console.log("Approval successful.");
  }

  // Check Liquidity
  const liquidity = await Pool.liquidity();
  console.log(`Current Pool Liquidity: ${liquidity.toString()}`);
  if (liquidity.isZero()) {
    console.error("Error: Pool has no liquidity. Add liquidity before swapping.");
    return;
  }

  // Check Pool Price
  const slot0 = await Pool.slot0();
  const currentPrice = slot0.sqrtPriceX96
    .mul(slot0.sqrtPriceX96)
    .div(ethers.BigNumber.from(2).pow(96));
  console.log(`Current Pool Price (MockUSDC to mUSDCold): ${ethers.utils.formatUnits(currentPrice, 18)}`);

  // Simulate Swap
  try {
    const expectedOutput = await SwapRouter.callStatic.exactInputSingle({
      tokenIn: mockUSDCAddress,
      tokenOut: mUSDColdAddress,
      fee: 500,
      recipient: deployer.address,
      deadline,
      amountIn,
      amountOutMinimum: 0, // No minimum for simulation
      sqrtPriceLimitX96: 0,
    });
    console.log(`Expected Output: ${ethers.utils.formatUnits(expectedOutput, 18)} mUSDCold`);

    if (expectedOutput.lt(amountOutMin)) {
      console.warn(
        `Warning: Expected output (${ethers.utils.formatUnits(expectedOutput, 18)} mUSDCold) is less than the minimum required (${ethers.utils.formatUnits(amountOutMin, 18)} mUSDCold). Adjusting amountOutMin.`
      );
      amountOutMin = expectedOutput.mul(95).div(100); // Adjust to 95% of the expected output
    }
  } catch (error) {
    console.error("Swap simulation failed:", error);
    return;
  }

  // Execute Swap
  try {
    const swapTx = await SwapRouter.exactInputSingle({
      tokenIn: mockUSDCAddress,
      tokenOut: mUSDColdAddress,
      fee: 500, // Fee tier of the pool
      recipient: deployer.address,
      deadline,
      amountIn,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0, // No price limit
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
