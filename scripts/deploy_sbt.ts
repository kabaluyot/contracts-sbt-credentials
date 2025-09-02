import hre from "hardhat"
// eslint-disable-next-line node/no-extraneous-require
const fs = require("fs-extra")

async function main() {
  // remove caches and recompile
  fs.removeSync("cache")
  fs.removeSync("artifacts")
  await hre.run("compile")

  // deployer info
  const [deployer] = await hre.ethers.getSigners()
  const deployerAddress = await deployer.getAddress()
  const account = await hre.ethers.utils.getAddress(deployerAddress)
  const balance = await deployer.getBalance()

  const network = process.env.NETWORK ? process.env.NETWORK : "polygon"

  console.log(`>>> Network is set to ${network}`)
  console.log(`Deployer account: ${account}`)
  console.log(`Balance: ${hre.ethers.utils.formatEther(balance)} ETH`)

  // get and deploy contract
  const SBT = await hre.ethers.getContractFactory("SBT")
  console.log("Deploying SBT contract ...")

  // USING PRODUCTION .. POLYGON
  const controllerAddress = "0x64356422eD997C99b41f4e31129b99bF52373574" // testnet => 0x64356422eD997C99b41f4e31129b99bF52373574, mainnet => 0x64356422eD997C99b41f4e31129b99bF52373574
  const baseURI = "https://api.sbt.org/v1/poap/chain/POLYGON/token/metadata/" // testnet => https://staging-api.sbt.org/v1/poap/chain/<CHAIN>/token/metadata/, mainnet => https://api.sbt.org/v1/poap/chain/<CHAIN>/token/metadata/
  const contractURI =
    "ipfs://bafkreihvi24fcpia5mxmrj5djm44u72ynagvznqlmcuoanumjuoxerg7dm"

  const deployed = await SBT.deploy(
    controllerAddress,
    baseURI,
    contractURI
  )
  const contract = await deployed.deployed()
  console.log(`Deployed SBT contract to: ${contract.address}`)
  // NEXT: Need to add controller #2: 0xd8Df192860C6941EBb8952Fe81bE6a43357A3472

  // verify in contract in explorer (etherscan, etc.)
  // await sleep(15000) // some networks require it higher to prevent errors
  // console.log("Verifying SBT contract ...")
  // await hre
  //   .run("verify:verify", {
  //     address: contract.address,
  //     constructorArguments: [controllerAddress, baseURI, contractURI],
  //   })
  //   .catch((err) => {
  //     console.error("Etherscan verify error:", err)
  //   })

  console.log("=========================================")
  console.log("SBT deployed to:", contract.address)
}

/// helper functions
// function sleep(ms: number) {
//   return new Promise((resolve) => {
//     setTimeout(resolve, ms)
//   })
// }

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
