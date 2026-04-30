import { expect } from "chai";
import { ethers } from "hardhat";
import { FermahProofLog } from "../typechain-types";

describe("FermahProofLog", function () {
  let contract: FermahProofLog;
  let owner: any;
  let relayer: any;
  let submitter: any;

  const circuitId = "fibonacci-v1";
  const proofType = 0; // Groth16
  const inputHash = ethers.keccak256(ethers.toUtf8Bytes("private_inputs"));
  const fermahJobId = "fermah-job-abc123";

  // Derive a deterministic proofId
  const proofId = ethers.keccak256(
    ethers.toUtf8Bytes(circuitId + submitter + Date.now())
  );

  beforeEach(async () => {
    [owner, relayer, submitter] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("FermahProofLog");
    contract = await Factory.deploy(owner.address);
    await contract.waitForDeployment();

    // Authorize a separate relayer
    await contract.connect(owner).setRelayer(relayer.address, true);
  });

  describe("Deployment", () => {
    it("should set the correct owner", async () => {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("should authorize the owner as a relayer", async () => {
      expect(await contract.authorizedRelayers(owner.address)).to.be.true;
    });
  });

  describe("logProofSubmission", () => {
    it("should log a proof submission", async () => {
      const pid = ethers.keccak256(ethers.toUtf8Bytes("proof1"));
      await expect(
        contract.connect(relayer).logProofSubmission(
          pid,
          submitter.address,
          inputHash,
          circuitId,
          proofType,
          fermahJobId
        )
      )
        .to.emit(contract, "ProofSubmitted")
        .withArgs(pid, submitter.address, circuitId, proofType, inputHash, fermahJobId, expect.anything());

      const record = await contract.getProof(pid);
      expect(record.circuitId).to.equal(circuitId);
      expect(record.status).to.equal(0); // Pending
      expect(record.submitter).to.equal(submitter.address);
    });

    it("should revert for duplicate proofId", async () => {
      const pid = ethers.keccak256(ethers.toUtf8Bytes("proof_dup"));
      await contract.connect(relayer).logProofSubmission(pid, submitter.address, inputHash, circuitId, proofType, fermahJobId);
      await expect(
        contract.connect(relayer).logProofSubmission(pid, submitter.address, inputHash, circuitId, proofType, fermahJobId)
      ).to.be.revertedWith("FermahProofLog: proof already logged");
    });

    it("should revert for non-relayer callers", async () => {
      const pid = ethers.keccak256(ethers.toUtf8Bytes("proof_auth"));
      await expect(
        contract.connect(submitter).logProofSubmission(pid, submitter.address, inputHash, circuitId, proofType, fermahJobId)
      ).to.be.revertedWith("FermahProofLog: not authorized relayer");
    });
  });

  describe("logProofVerified", () => {
    it("should mark proof as verified", async () => {
      const pid = ethers.keccak256(ethers.toUtf8Bytes("proof_verify"));
      await contract.connect(relayer).logProofSubmission(pid, submitter.address, inputHash, circuitId, proofType, fermahJobId);
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof_bytes"));

      await expect(
        contract.connect(relayer).logProofVerified(pid, proofHash)
      )
        .to.emit(contract, "ProofVerified")
        .withArgs(pid, submitter.address, proofHash, fermahJobId, expect.anything());

      const record = await contract.getProof(pid);
      expect(record.status).to.equal(1); // Verified
      expect(await contract.totalVerified()).to.equal(1);
    });
  });

  describe("logProofFailed", () => {
    it("should mark proof as failed", async () => {
      const pid = ethers.keccak256(ethers.toUtf8Bytes("proof_fail"));
      await contract.connect(relayer).logProofSubmission(pid, submitter.address, inputHash, circuitId, proofType, fermahJobId);

      await expect(
        contract.connect(relayer).logProofFailed(pid, "Witness mismatch")
      )
        .to.emit(contract, "ProofFailed")
        .withArgs(pid, submitter.address, "Witness mismatch", expect.anything());

      const record = await contract.getProof(pid);
      expect(record.status).to.equal(2); // Failed
      expect(await contract.totalFailed()).to.equal(1);
    });
  });

  describe("Pagination", () => {
    it("should return paginated proof IDs", async () => {
      for (let i = 0; i < 5; i++) {
        const pid = ethers.keccak256(ethers.toUtf8Bytes(`proof_page_${i}`));
        await contract.connect(relayer).logProofSubmission(pid, submitter.address, inputHash, circuitId, proofType, fermahJobId);
      }
      const [ids, total] = await contract.getProofIds(0, 3);
      expect(ids.length).to.equal(3);
      expect(total).to.equal(5);
    });
  });

  describe("Pause", () => {
    it("should prevent submissions when paused", async () => {
      await contract.connect(owner).pause();
      const pid = ethers.keccak256(ethers.toUtf8Bytes("proof_paused"));
      await expect(
        contract.connect(relayer).logProofSubmission(pid, submitter.address, inputHash, circuitId, proofType, fermahJobId)
      ).to.be.revertedWithCustomError(contract, "EnforcedPause");
    });
  });
});
