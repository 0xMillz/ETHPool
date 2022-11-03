// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import { ABDKMath64x64 } from "./abdk-libraries/ABDKMath64x64.sol";

/**
 * @dev Modeled after EIP-1973: Scalable Rewards (https://eips.ethereum.org/EIPS/eip-1973)
 */
contract Rewards is AccessControl {
    using ABDKMath64x64 for uint256;
    using ABDKMath64x64 for int128;

    struct Participant {
        uint256 amount;
        int128 participantMask;
    }

    event Distribution(uint256 rewardAmount);
    event Withdrawal(address participant, uint256 depositAmount, uint256 total);

    int128 public roundMask;
    uint256 public totalParticipants = 0;
    uint256 public totalDeposits = 0;
    mapping(address => Participant) public participantData;
    bytes32 public constant TEAM_MEMBER_ROLE = keccak256("TEAM_MEMBER_ROLE");

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(TEAM_MEMBER_ROLE, msg.sender);
    }

    /**
     * Participants contribute msg.value to pool.
     * Participants must have a zero balance.
     * @return A boolean that indicates if the operation was successful.
     */
    function contributeToPool() external payable returns (bool) {
        require(msg.value > 0, "ETH amount should be positive");
        require(participantData[msg.sender].amount == 0, "Withdraw funds before depositing");

        totalParticipants += 1;
        totalDeposits += msg.value;
        updateParticipantData();
        return true;
    }

    /**
     * A registered team member deposits rewards to pool.
     */
    function distributeReward() external payable onlyRole(TEAM_MEMBER_ROLE) {
        require(msg.value > 0, "Should have a reward amount to distribute");
        require(totalDeposits > 0, "Should have > 0 amount to calculate total / reward rate");
        calculateTPP(msg.value);
        emit Distribution(msg.value);
    }

    /**
      * Updates participantData for a participant during a deposit.
      */
    function updateParticipantData() internal {
        uint256 currentBalance = getParticipantBalance(msg.sender);
        participantData[msg.sender].participantMask = roundMask;
        participantData[msg.sender].amount = currentBalance + msg.value;
    }

    /**
      * Calculates the current ETH balance + rewards for a participant.
      * @return Current ETH balance + rewards.
      */
    function getParticipantBalance(address participant) public view returns (uint256) {
        uint256 deposited = participantData[participant].amount;
        int128 rm = roundMask;
        int128 pm = participantData[participant].participantMask;
        int128 rate = rm.sub(pm);
        uint256 reward = rate.mulu(deposited);
        return deposited + reward;
    }

    /**
     * Withdraws balance + rewards for a participant.
     */
    function withdraw() external returns (bool) {
        require(participantData[msg.sender].amount > 0);
        uint256 withdrawAmount = getParticipantBalance(msg.sender);
        (bool sent, ) = msg.sender.call{value: withdrawAmount}("");
        require(sent, "Withdrawal failed");
        emit Withdrawal(msg.sender, participantData[msg.sender].amount, withdrawAmount);
        totalDeposits -= participantData[msg.sender].amount;
        totalParticipants -= 1;
        participantData[msg.sender].participantMask = 0;
        participantData[msg.sender].amount = 0;
        return sent;
    }

    /**
    * @dev Function to calculate TPP (ETH/reward amount per participant).
    * @return A boolean that indicates if the operation was successful.
    */
    function calculateTPP(uint256 rewardsAmount) private returns (bool) {
        int128 tpp = rewardsAmount.divu(totalDeposits);
        updateRoundMask(tpp);
        return true;
    }

    function getParticipantData(address _participant) public view returns (Participant memory) {
        return participantData[_participant];
    }

    /**
    * Function to update round mask.
    * @return A boolean that indicates if the operation was successful.
    */
    function updateRoundMask(int128 tpp) private returns (bool) {
        roundMask = roundMask + tpp;
        return true;
    }

    function addTeamMember(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(TEAM_MEMBER_ROLE, account);
    }

    function removeTeamMember(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(TEAM_MEMBER_ROLE, account);
    }

    function addAdmin(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(DEFAULT_ADMIN_ROLE, account);
    }

    function removeAdmin(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(msg.sender != account, "Cannot remove self");
        revokeRole(DEFAULT_ADMIN_ROLE, account);
    }
}
