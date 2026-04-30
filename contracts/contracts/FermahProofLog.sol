// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title FermahProofLog
 * @notice Onchain transparent log of zero-knowledge proof verifications
 *         powered by the Fermah proving network on Base Sepolia.
 * @dev All sensitive inputs remain offchain (CPD privacy). Only hashes
 *      and public metadata are stored onchain for full auditability.
 */
contract FermahProofLog is Ownable, ReentrancyGuard, Pausable {
    // ─────────────────────────────────────────────────────────────────────────
    // Enums & Structs
    // ─────────────────────────────────────────────────────────────────────────

    enum ProofStatus { Pending, Verified, Failed }

    enum ProofType { Groth16, Plonk, Fflonk, Risc0 }

    struct ProofRecord {
        bytes32 proofId;        // Unique identifier (keccak256 of job metadata)
        address submitter;      // Address that submitted the proof request
        bytes32 inputHash;      // Keccak256 of private inputs (CPD — never revealed)
        bytes32 proofHash;      // Keccak256 of the generated proof bytes
        string  circuitId;      // Human-readable circuit identifier
        ProofType proofType;    // Which proving system was used
        ProofStatus status;     // Current verification status
        uint64  timestamp;      // Block timestamp when logged
        uint64  blockNumber;    // Block number when logged
        string  fermahJobId;    // Fermah internal job reference
        string  basescanUrl;    // Explorer URL for transparency
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice All proof records indexed by proofId
    mapping(bytes32 => ProofRecord) public proofRecords;

    /// @notice All proof IDs submitted by an address
    mapping(address => bytes32[]) public submitterProofs;

    /// @notice Authorized relayers that can log proof results onchain
    mapping(address => bool) public authorizedRelayers;

    /// @notice Ordered list of all proof IDs for pagination
    bytes32[] public allProofIds;

    /// @notice Total verified proofs counter
    uint256 public totalVerified;

    /// @notice Total failed proofs counter
    uint256 public totalFailed;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event ProofSubmitted(
        bytes32 indexed proofId,
        address indexed submitter,
        string  circuitId,
        ProofType proofType,
        bytes32 inputHash,
        string  fermahJobId,
        uint64  timestamp
    );

    event ProofVerified(
        bytes32 indexed proofId,
        address indexed submitter,
        bytes32 proofHash,
        string  fermahJobId,
        uint64  timestamp
    );

    event ProofFailed(
        bytes32 indexed proofId,
        address indexed submitter,
        string  reason,
        uint64  timestamp
    );

    event RelayerUpdated(address indexed relayer, bool authorized);

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(address initialOwner) Ownable(initialOwner) {
        // Owner is also an authorized relayer by default
        authorizedRelayers[initialOwner] = true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    modifier onlyRelayer() {
        require(authorizedRelayers[msg.sender], "FermahProofLog: not authorized relayer");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core Functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Log a new proof submission from the Fermah network.
     * @dev Only callable by authorized relayers. Sensitive inputs stay offchain.
     * @param proofId        Unique proof ID (keccak256 of circuit+submitter+nonce)
     * @param submitter      Address initiating the proof
     * @param inputHash      Keccak256 of private circuit inputs (CPD)
     * @param circuitId      Circuit identifier string
     * @param proofType      Proving system used
     * @param fermahJobId    Fermah's internal job identifier
     */
    function logProofSubmission(
        bytes32    proofId,
        address    submitter,
        bytes32    inputHash,
        string calldata circuitId,
        ProofType  proofType,
        string calldata fermahJobId
    ) external onlyRelayer whenNotPaused nonReentrant {
        require(proofRecords[proofId].timestamp == 0, "FermahProofLog: proof already logged");
        require(submitter != address(0), "FermahProofLog: zero address submitter");

        string memory explorerUrl = string(abi.encodePacked(
            "https://sepolia.basescan.org/tx/",
            _toHexString(uint256(proofId))
        ));

        proofRecords[proofId] = ProofRecord({
            proofId:     proofId,
            submitter:   submitter,
            inputHash:   inputHash,
            proofHash:   bytes32(0),
            circuitId:   circuitId,
            proofType:   proofType,
            status:      ProofStatus.Pending,
            timestamp:   uint64(block.timestamp),
            blockNumber: uint64(block.number),
            fermahJobId: fermahJobId,
            basescanUrl: explorerUrl
        });

        submitterProofs[submitter].push(proofId);
        allProofIds.push(proofId);

        emit ProofSubmitted(
            proofId,
            submitter,
            circuitId,
            proofType,
            inputHash,
            fermahJobId,
            uint64(block.timestamp)
        );
    }

    /**
     * @notice Mark a proof as successfully verified by Fermah.
     * @param proofId   The proof ID to update
     * @param proofHash Keccak256 of the generated proof bytes
     */
    function logProofVerified(
        bytes32 proofId,
        bytes32 proofHash
    ) external onlyRelayer whenNotPaused nonReentrant {
        ProofRecord storage record = proofRecords[proofId];
        require(record.timestamp != 0, "FermahProofLog: proof not found");
        require(record.status == ProofStatus.Pending, "FermahProofLog: proof not pending");

        record.proofHash = proofHash;
        record.status    = ProofStatus.Verified;
        totalVerified++;

        emit ProofVerified(
            proofId,
            record.submitter,
            proofHash,
            record.fermahJobId,
            uint64(block.timestamp)
        );
    }

    /**
     * @notice Mark a proof as failed.
     * @param proofId The proof ID to update
     * @param reason  Human-readable failure reason
     */
    function logProofFailed(
        bytes32 proofId,
        string calldata reason
    ) external onlyRelayer whenNotPaused nonReentrant {
        ProofRecord storage record = proofRecords[proofId];
        require(record.timestamp != 0, "FermahProofLog: proof not found");
        require(record.status == ProofStatus.Pending, "FermahProofLog: proof not pending");

        record.status = ProofStatus.Failed;
        totalFailed++;

        emit ProofFailed(
            proofId,
            record.submitter,
            reason,
            uint64(block.timestamp)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Total number of proof submissions
    function totalProofs() external view returns (uint256) {
        return allProofIds.length;
    }

    /// @notice Get paginated list of proof IDs
    function getProofIds(uint256 offset, uint256 limit)
        external view returns (bytes32[] memory ids, uint256 total)
    {
        total = allProofIds.length;
        if (offset >= total) return (new bytes32[](0), total);
        uint256 end = offset + limit > total ? total : offset + limit;
        ids = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            ids[i - offset] = allProofIds[i];
        }
    }

    /// @notice Get all proof IDs for a submitter
    function getSubmitterProofs(address submitter)
        external view returns (bytes32[] memory)
    {
        return submitterProofs[submitter];
    }

    /// @notice Get full proof record
    function getProof(bytes32 proofId)
        external view returns (ProofRecord memory)
    {
        return proofRecords[proofId];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Grant or revoke relayer authorization
    function setRelayer(address relayer, bool authorized) external onlyOwner {
        authorizedRelayers[relayer] = authorized;
        emit RelayerUpdated(relayer, authorized);
    }

    /// @notice Pause all state-changing operations (emergency)
    function pause() external onlyOwner { _pause(); }

    /// @notice Unpause
    function unpause() external onlyOwner { _unpause(); }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal Helpers
    // ─────────────────────────────────────────────────────────────────────────

    function _toHexString(uint256 value) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(66);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            str[2 + i * 2]     = alphabet[(value >> (248 - i * 8)) & 0xf0 >> 4];
            str[3 + i * 2]     = alphabet[(value >> (248 - i * 8)) & 0x0f];
        }
        return string(str);
    }
}
