import { ethers } from "hardhat";
const NonfungiblePositionManagerArtifact = require("../../../projects/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json");
const IFactoryArtifact = require("../../../projects/v3-core/artifacts/contracts/interfaces/IPancakeV3Factory.sol/IPancakeV3Factory.json");
const IPool = require("../../../projects/v3-core/artifacts/contracts/Interfaces/IPancakeV3Pool.sol/IPancakeV3Pool.json");

async function main() {
    const [deployer] = await ethers.getSigners();
    const mUSDCAddress = "0x3500254704CEa3448B63ef047821c84413611738";
    const WETHAddress = "0x4200000000000000000000000000000000000006";
    const nonfungiblePositionManagerAddress = "0xC08F051E4ed2A140F54CA4AeBDbB9A1C64F95634";
    const factoryAddress = "0x56e54E72E22e648A62e1e2a738f24881Db343Ec2";

    const MockUSDC = await ethers.getContractAt("MockUSDC", mUSDCAddress);
    const WETH = await ethers.getContractAt("IERC20", WETHAddress);
    const NonfungiblePositionManager = await ethers.getContractAt(
        NonfungiblePositionManagerArtifact.abi,
        nonfungiblePositionManagerAddress
    );

    console.log(`Loaded NonfungiblePositionManager at ${nonfungiblePositionManagerAddress}`);

    // Approvals
    const amountToApproveUSDC = ethers.utils.parseUnits("10000", 6);
    const amountToApproveWETH = ethers.utils.parseUnits("1", 18);
    await MockUSDC.approve(nonfungiblePositionManagerAddress, amountToApproveUSDC);
    await WETH.approve(nonfungiblePositionManagerAddress, amountToApproveWETH);
    console.log("Approved tokens");

    const factory = await ethers.getContractAt(IFactoryArtifact.abi, factoryAddress);

    // Check if the pool exists
    let poolAddress = await factory.getPool(mUSDCAddress, WETHAddress, 10000);
    if (poolAddress === ethers.constants.AddressZero) {
        console.log("Pool does not exist. Creating and initializing...");

        // Correct `sqrtPriceX96` Calculation
        const desiredPrice = 1000; // 1 WETH = 1000 mUSDC
        const sqrtPriceX96 = ethers.BigNumber.from(
            Math.floor(Math.sqrt(desiredPrice) * Math.pow(2, 96))
        );
        console.log(`Calculated SqrtPriceX96: ${sqrtPriceX96.toString()}`);

        const createPoolTx = await NonfungiblePositionManager.createAndInitializePoolIfNecessary(
            mUSDCAddress,
            WETHAddress,
            10000,
            sqrtPriceX96
        );
        await createPoolTx.wait();

        poolAddress = await factory.getPool(mUSDCAddress, WETHAddress, 10000);
        console.log("Pool created and initialized.");
        console.log(`New Pool Address: ${poolAddress}`);
    } else {
        console.log(`Pool already exists at ${poolAddress}`);
    }

    const poolContract = await ethers.getContractAt(IPool.abi, poolAddress);
    const poolState = await poolContract.slot0();

    // Correct pool price calculation
    const price = poolState.sqrtPriceX96
        .mul(poolState.sqrtPriceX96)
        .div(ethers.BigNumber.from("2").pow(96));
    console.log(`Pool Price: ${price.toString()}`);

    const tickSpacing = await factory.feeAmountTickSpacing(10000);
    console.log(`Tick Spacing for Fee Tier 10000: ${tickSpacing}`);

    const currentTick = poolState.tick;
    const tickLower = Math.floor(currentTick / tickSpacing) * tickSpacing - tickSpacing * 10;
    const tickUpper = Math.floor(currentTick / tickSpacing) * tickSpacing + tickSpacing * 10;

    console.log(`Tick Range: [${tickLower}, ${tickUpper}]`);

    // Ensure liquidity matches the tick range and sqrtPriceX96
    const amount0Desired = ethers.utils.parseUnits("10", 6); // Adjusted for mUSDC
    const amount1Desired = ethers.utils.parseUnits("0.01", 18); // Adjusted for WETH

    const mintParams = {
        token0: mUSDCAddress,
        token1: WETHAddress,
        fee: 10000,
        tickLower: tickLower,
        tickUpper: tickUpper,
        amount0Desired: amount0Desired,
        amount1Desired: amount1Desired,
        amount0Min: amount0Desired.mul(99).div(100), // 1% slippage
        amount1Min: amount1Desired.mul(99).div(100),
        recipient: deployer.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 10,
    };

    console.log(`Amount0Desired (mUSDC): ${ethers.utils.formatUnits(mintParams.amount0Desired, 6)}`);
    console.log(`Amount1Desired (WETH): ${ethers.utils.formatUnits(mintParams.amount1Desired, 18)}`);

    console.log("Adding liquidity...");
    const tx = await NonfungiblePositionManager.mint(mintParams, { gasLimit: 3000000 });
    const receipt = await tx.wait();
    console.log("Liquidity added. Transaction hash:", receipt.transactionHash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error in script:", error);
        process.exit(1);
    });
