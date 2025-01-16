import { ethers } from "hardhat";
const NonfungiblePositionManagerArtifact = require("../../../projects/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json");
const IFactoryArtifact = require("../../../projects/v3-core/artifacts/contracts/interfaces/IPancakeV3Factory.sol/IPancakeV3Factory.json");
const IPool = require("../../../projects/v3-core/artifacts/contracts/Interfaces/IPancakeV3Pool.sol/IPancakeV3Pool.json");

async function main() {
    const [deployer] = await ethers.getSigners();
    const mUSDCAddress = "0x3500254704CEa3448B63ef047821c84413611738";
    const mUSDColdAddress = "0xa1226cf193A252418c99419815bEd1a9fb08AC2F";
    const nonfungiblePositionManagerAddress = "0xC08F051E4ed2A140F54CA4AeBDbB9A1C64F95634";
    const factoryAddress = "0x56e54E72E22e648A62e1e2a738f24881Db343Ec2";

    const mUSDC = await ethers.getContractAt("IERC20", mUSDCAddress);
    const mUSDCold = await ethers.getContractAt("IERC20", mUSDColdAddress);
    const NonfungiblePositionManager = await ethers.getContractAt(
        NonfungiblePositionManagerArtifact.abi,
        nonfungiblePositionManagerAddress
    );

    console.log(`Loaded NonfungiblePositionManager at ${nonfungiblePositionManagerAddress}`);

    // Approvals
    const amountToApprove = ethers.utils.parseUnits("10000", 18);
    await mUSDC.approve(nonfungiblePositionManagerAddress, amountToApprove);
    await mUSDCold.approve(nonfungiblePositionManagerAddress, amountToApprove);
    console.log("Approved tokens");

    const factory = await ethers.getContractAt(IFactoryArtifact.abi, factoryAddress);
    
    // Check if the pool exists
    let poolAddress = await factory.getPool(mUSDCAddress, mUSDColdAddress, 500);
    
    if (poolAddress === ethers.constants.AddressZero) {
        console.log("Pool does not exist. Creating and initializing...");

        // Correct `sqrtPriceX96` calculation for 1:1 price ratio
        const sqrtPriceX96 = ethers.BigNumber.from(2).pow(96);
        console.log(`Calculated SqrtPriceX96: ${sqrtPriceX96.toString()}`);

        const createPoolTx = await NonfungiblePositionManager.createAndInitializePoolIfNecessary(
            mUSDCAddress,
            mUSDColdAddress,
            500,
            sqrtPriceX96
        );
        await createPoolTx.wait();

        poolAddress = await factory.getPool(mUSDCAddress, mUSDColdAddress, 500);
        console.log("Pool created and initialized.");
        console.log(`New Pool Address: ${poolAddress}`);
    } else {
        console.log(`Pool already exists at ${poolAddress}`);
    }

    const poolContract = await ethers.getContractAt(IPool.abi, poolAddress);
    const poolState = await poolContract.slot0();
    const poolLiquidity = await poolContract.liquidity();
    console.log(`Current Pool Liquidity: ${poolLiquidity.toString()}`);

    const price = poolState.sqrtPriceX96
        .mul(poolState.sqrtPriceX96)
        .div(ethers.BigNumber.from(2).pow(96));
    console.log(`Pool Price: ${price.toString()}`);

    const tickSpacing = await factory.feeAmountTickSpacing(500);
    console.log(`Tick Spacing for Fee Tier 500: ${tickSpacing}`);

    const currentTick = poolState.tick;
    console.log(`Current Tick: ${currentTick}`);

    // Adjust tick range to cover more liquidity
    const tickLower = Math.floor(currentTick / tickSpacing) * tickSpacing;
const tickUpper = tickLower + tickSpacing * 10; // Narrow range around current tick


    console.log(`Adjusted Tick Range: [${tickLower}, ${tickUpper}]`);

    const liquidityAmount = ethers.utils.parseUnits("10", 18);

    const mintParams = {
        token0: mUSDCAddress,
        token1: mUSDColdAddress,
        fee: 500,
        tickLower: tickLower,
        tickUpper: tickUpper,
        amount0Desired: liquidityAmount,
        amount1Desired: liquidityAmount,
        amount0Min: liquidityAmount.mul(99).div(100), // 1% slippage
        amount1Min: liquidityAmount.mul(99).div(100),
        recipient: deployer.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 10,
    };

    console.log("Adding liquidity...");
    const tx = await NonfungiblePositionManager.mint(mintParams, { gasLimit: 3000000 });
    const receipt = await tx.wait();
    console.log("Liquidity added. Transaction hash:", receipt.transactionHash);

    console.log("Re-checking liquidity...");
    const newPoolLiquidity = await poolContract.liquidity();
    console.log(`Updated Pool Liquidity: ${newPoolLiquidity.toString()}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error in script:", error);
        process.exit(1);
    });
