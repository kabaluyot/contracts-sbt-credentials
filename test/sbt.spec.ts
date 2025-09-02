import { expect } from "chai"
import { ethers } from "hardhat"
import { Signer } from "ethers"
import { SBT } from "../typechain"

describe("SBT", function () {
  let sbt: SBT
  let owner: Signer
  let controller: Signer
  let user: Signer
  let baseTokenURI: string
  let contractURI: string

  beforeEach(async function () {
    ;[owner, controller, user] = await ethers.getSigners()
    baseTokenURI = "https://api.sbt.com/v1/poap/metadata/"
    contractURI = "https://api.sbt.com/v1/poap/contract"

    const SBT = await ethers.getContractFactory("SBT")
    sbt = await SBT.deploy(
      await controller.getAddress(),
      baseTokenURI,
      contractURI
    )
  })

  /// core
  it("Contract can initialize in constructor", async function () {
    expect(
      await sbt.allowlistedControllerAddresses(
        await controller.getAddress()
      )
    ).to.be.true
    expect(await sbt.contractURI()).to.equal(contractURI)
  })

  /// controller
  it("Controller can archive event", async function () {
    const eventId = "test-event-1"
    const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    const result = true

    // Create signature
    const domain = {
      name: "SBT",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: sbt.address,
    }

    const types = {
      ArchiveEventRequest: [
        { name: "result", type: "bool" },
        { name: "eventId", type: "string" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    }

    const value = {
      result,
      eventId,
      nonce: await sbt.archiveEventRequestNonce(),
      deadline,
    }

    const signature = await (controller as any)._signTypedData(
      domain,
      types,
      value
    )

    await expect(
      sbt
        .connect(controller)
        .archiveEvent(eventId, result, deadline, signature)
    ).to.not.be.reverted
  })

  it("Controller can create event", async function () {
    const eventId = "test-event-1"
    const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    const result = true

    const event = {
      name: "Test Event",
      description: "Test Description",
      place: "Test Place",
      imageUrl: "https://test.com/image.jpg",
      category: "Test Category",
      startDate: Math.floor(Date.now() / 1000),
      endDate: Math.floor(Date.now() / 1000) + 86400,
      claimStartDate: Math.floor(Date.now() / 1000),
      claimEndDate: Math.floor(Date.now() / 1000) + 86400,
      maxAttendees: 100,
    }

    // Create signature
    const domain = {
      name: "SBT",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: sbt.address,
    }

    const types = {
      CreateEventRequest: [
        { name: "result", type: "bool" },
        { name: "eventId", type: "string" },
        { name: "name", type: "string" },
        { name: "description", type: "string" },
        { name: "place", type: "string" },
        { name: "imageUrl", type: "string" },
        { name: "category", type: "string" },
        { name: "startDate", type: "uint256" },
        { name: "endDate", type: "uint256" },
        { name: "claimStartDate", type: "uint256" },
        { name: "claimEndDate", type: "uint256" },
        { name: "maxAttendees", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    }

    const value = {
      result,
      eventId,
      name: event.name,
      description: event.description,
      place: event.place,
      imageUrl: event.imageUrl,
      category: event.category,
      startDate: event.startDate,
      endDate: event.endDate,
      claimStartDate: event.claimStartDate,
      claimEndDate: event.claimEndDate,
      maxAttendees: event.maxAttendees,
      nonce: await sbt.createEventRequestNonce(),
      deadline,
    }

    const signature = await (controller as any)._signTypedData(
      domain,
      types,
      value
    )

    await expect(
      sbt
        .connect(controller)
        .createEvent(eventId, event, result, deadline, signature)
    ).to.not.be.reverted

    const createdEvent = await sbt.getEventInfo(eventId)
    expect(createdEvent.name).to.equal(event.name)
  })

  it("Controller can mint POAP", async function () {
    const eventId = "test-event-1"
    const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    const result = true
    const isResourcePerson = false

    // Create signature
    const domain = {
      name: "SBT",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: sbt.address,
    }

    const types = {
      MintPOAPRequest: [
        { name: "result", type: "bool" },
        { name: "isResourcePerson", type: "bool" },
        { name: "eventId", type: "string" },
        { name: "minter", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    }

    const value = {
      result,
      isResourcePerson,
      eventId,
      minter: await user.getAddress(),
      nonce: await sbt.mintPOAPRequestNonce(),
      deadline,
    }

    const signature = await (controller as any)._signTypedData(
      domain,
      types,
      value
    )

    await expect(
      sbt
        .connect(controller)
        .mintPOAP(
          eventId,
          result,
          isResourcePerson,
          await user.getAddress(),
          deadline,
          signature
        )
    ).to.not.be.reverted

    expect(await sbt.ownerOf(1)).to.equal(await user.getAddress())
  })

  it("Controller can edit event", async function () {
    const eventId = "test-event-1"
    const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    const result = true

    const event = {
      name: "Updated Test Event",
      description: "Updated Test Description",
      place: "Updated Test Place",
      imageUrl: "https://test.com/updated-image.jpg",
      category: "Updated Test Category",
      startDate: Math.floor(Date.now() / 1000),
      endDate: Math.floor(Date.now() / 1000) + 86400,
      claimStartDate: Math.floor(Date.now() / 1000),
      claimEndDate: Math.floor(Date.now() / 1000) + 86400,
      maxAttendees: 200,
    }

    // Create signature
    const domain = {
      name: "SBT",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: sbt.address,
    }

    const types = {
      EditEventRequest: [
        { name: "result", type: "bool" },
        { name: "eventId", type: "string" },
        { name: "name", type: "string" },
        { name: "description", type: "string" },
        { name: "place", type: "string" },
        { name: "imageUrl", type: "string" },
        { name: "category", type: "string" },
        { name: "startDate", type: "uint256" },
        { name: "endDate", type: "uint256" },
        { name: "claimStartDate", type: "uint256" },
        { name: "claimEndDate", type: "uint256" },
        { name: "maxAttendees", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    }

    const value = {
      result,
      eventId,
      name: event.name,
      description: event.description,
      place: event.place,
      imageUrl: event.imageUrl,
      category: event.category,
      startDate: event.startDate,
      endDate: event.endDate,
      claimStartDate: event.claimStartDate,
      claimEndDate: event.claimEndDate,
      maxAttendees: event.maxAttendees,
      nonce: await sbt.editEventRequestNonce(),
      deadline,
    }

    const signature = await (controller as any)._signTypedData(
      domain,
      types,
      value
    )

    await expect(
      sbt
        .connect(controller)
        .editEvent(eventId, event, result, deadline, signature)
    ).to.not.be.reverted

    const updatedEvent = await sbt.getEventInfo(eventId)
    expect(updatedEvent.name).to.equal(event.name)
  })

  it("Controller can unarchive event", async function () {
    const eventId = "test-event-1"
    const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    const result = true

    // Create signature
    const domain = {
      name: "SBT",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: sbt.address,
    }

    const types = {
      UnarchiveEventRequest: [
        { name: "result", type: "bool" },
        { name: "eventId", type: "string" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    }

    const value = {
      result,
      eventId,
      nonce: await sbt.unarchiveEventRequestNonce(),
      deadline,
    }

    const signature = await (controller as any)._signTypedData(
      domain,
      types,
      value
    )

    await expect(
      sbt
        .connect(controller)
        .unarchiveEvent(eventId, result, deadline, signature)
    ).to.not.be.reverted
  })

  /// owner
  it("Owner can set base URI", async function () {
    const newBaseURI = "https://new-api.sbt.com/token/"
    await expect(sbt.connect(owner).setBaseURI(newBaseURI)).to.not.be
      .reverted
  })

  it("Owner can set contract URI", async function () {
    const newContractURI = "https://new-api.sbt.com/contract"
    await expect(sbt.connect(owner).setContractURI(newContractURI)).to.not
      .be.reverted
  })

  it("Owner can set controller address allowlist", async function () {
    await expect(
      sbt
        .connect(owner)
        .setControllerAddressAllowlist(await controller.getAddress(), false)
    ).to.not.be.reverted

    expect(
      await sbt.allowlistedControllerAddresses(
        await controller.getAddress()
      )
    ).to.be.false
  })

  it("Owner can pause/unpause contract", async function () {
    await expect(sbt.connect(owner).setPaused(true)).to.not.be.reverted

    await expect(sbt.connect(owner).setPaused(false)).to.not.be.reverted
  })

  it("Owner can withdraw contract funds", async function () {
    // Send some ETH to the contract
    await owner.sendTransaction({
      to: sbt.address,
      value: ethers.utils.parseEther("1.0"),
    })

    const initialBalance = await ethers.provider.getBalance(
      await owner.getAddress()
    )
    await expect(sbt.connect(owner).withdraw()).to.not.be.reverted

    const finalBalance = await ethers.provider.getBalance(
      await owner.getAddress()
    )
    expect(finalBalance).to.be.gt(initialBalance)
  })

  it("Owner can recover ERC20 tokens", async function () {
    const tokenAddress = "0x0000000000000000000000000000000000000000"
    const tokenAmount = ethers.utils.parseEther("1.0")
    await expect(
      sbt
        .connect(owner)
        .recoverERC20(tokenAddress, await owner.getAddress(), tokenAmount)
    ).to.not.be.reverted
  })
})
