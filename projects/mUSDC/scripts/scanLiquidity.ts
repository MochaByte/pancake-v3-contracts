import { ethers } from "hardhat";
const IPool = require("../../../projects/v3-core/artifacts/contracts/Interfaces/IPancakeV3Pool.sol/IPancakeV3Pool.json");

async function analyzeLiquidity(poolAddress) {
    // Fetch the pool contract
    const poolContract = await ethers.getContractAt(IPool.abi, poolAddress);

    // Fetch current pool state
    const slot0 = await poolContract.slot0();
    const currentTick = slot0.tick;

    console.log(`Current Tick: ${currentTick}`);

    // Fetch tick spacing
    const tickSpacing = await poolContract.tickSpacing();
    console.log(`Tick Spacing: ${tickSpacing}`);

    // Define the tick range
    const tickLower = Math.floor(currentTick / tickSpacing) * tickSpacing - tickSpacing * 20;
    const tickUpper = Math.floor(currentTick / tickSpacing) * tickSpacing + tickSpacing * 20;

    console.log(`Tick Range: [${tickLower}, ${tickUpper}]`);

    // Initialize total liquidity tracker
    let totalLiquidity = ethers.BigNumber.from(0);

    console.log("Analyzing liquidity across the tick range...");

    // Iterate over ticks within the range
    for (let tick = tickLower; tick <= tickUpper; tick += tickSpacing) {
        try {
            const tickData = await poolContract.ticks(tick);

            const liquidityNet = tickData.liquidityNet; // Net liquidity added/removed at this tick
            const liquidityGross = tickData.liquidityGross; // Total liquidity at this tick

            console.log(`Tick: ${tick}, LiquidityNet: ${liquidityNet.toString()}, LiquidityGross: ${liquidityGross.toString()}`);

            totalLiquidity = totalLiquidity.add(liquidityGross);
        } catch (error) {
            console.log(`Tick ${tick} has no data.`);
        }
    }

    console.log(`Total Liquidity in Range: ${totalLiquidity.toString()}`);
}

async function main() {
    const poolAddress = "0x71770182788ad079700739152c1462A109387649"; // Replace with your pool address
    
    if (!poolAddress) {
        console.error("Please provide a valid pool address.");
        return;
    }

    try {
        await analyzeLiquidity(poolAddress);
    } catch (error) {
        console.error("Error analyzing liquidity:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error in script:", error);
        process.exit(1);
    });
