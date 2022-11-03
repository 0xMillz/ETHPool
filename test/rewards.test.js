const Rewards = artifacts.require('Rewards')
const { ethers } = require('ethers')
const BigNumber = require('bignumber.js')
const truffleAssert = require('truffle-assertions')

contract('Rewards', async (accounts) => {
    let _contract = null
    const {
        utils: { hexValue, parseEther },
    } = ethers
    const deposit1 = parseEther('0.45').toString()
    const deposit2 = parseEther('0.3').toString()

    describe('Roles', () => {
        const DEFAULT_ADMIN_ROLE = hexValue(0x00)
        const TEAM_MEMBER_ROLE =
            '0x8e686555a55ab6b23aa445db999c535d72a040cce9fe8b191d10aa2671cf528e'

        it('sets up the DEFAULT_ADMIN_ROLE for the contract creator', async () => {
            _contract = await Rewards.new()
            const actual = await _contract.hasRole(
                DEFAULT_ADMIN_ROLE,
                accounts[0]
            )
            assert.equal(actual, true)
        })

        it('sets up a TEAM_MEMBER_ROLE for the contract creator', async () => {
            _contract = await Rewards.new()
            const actual = await _contract.hasRole(
                TEAM_MEMBER_ROLE,
                accounts[0]
            )
            assert.equal(actual, true)
        })

        it('allows the DEFAULT_ADMIN_ROLE to add team members', async () => {
            _contract = await Rewards.new()
            await _contract.addTeamMember(accounts[1], {
                from: accounts[0],
            })
            const actual = await _contract.hasRole(
                TEAM_MEMBER_ROLE,
                accounts[1]
            )
            assert.equal(actual, true)
        })

        it('does not allow non-admins to add team members', async () => {
            _contract = await Rewards.new()
            try {
                await _contract.addTeamMember(accounts[1], {
                    from: accounts[1],
                })
                assert.fail('addTeamMember should throw an exception')
            } catch (e) {
                assert(e, 'non-admins should not be able to add team members')
            }
            const actual = await _contract.hasRole(
                TEAM_MEMBER_ROLE,
                accounts[1]
            )
            assert.equal(actual, false)
        })

        it('allows the DEFAULT_ADMIN_ROLE to remove team members', async () => {
            _contract = await Rewards.new()
            await _contract.addTeamMember(accounts[1], {
                from: accounts[0],
            })
            await _contract.removeTeamMember(accounts[1], {
                from: accounts[0],
            })
            const actual = await _contract.hasRole(
                TEAM_MEMBER_ROLE,
                accounts[1]
            )
            assert.equal(actual, false)
        })

        it('does not allow non-admins to remove team members', async () => {
            _contract = await Rewards.new()
            try {
                await _contract.removeTeamMember(accounts[0], {
                    from: accounts[0],
                })
                assert.fail('removeTeamMember should throw an exception')
            } catch (e) {
                assert(
                    e,
                    'non-admins should not be able to remove team members'
                )
            }
            const actual = await _contract.hasRole(
                TEAM_MEMBER_ROLE,
                accounts[1]
            )
            assert.equal(actual, false)
        })

        it('allows the DEFAULT_ADMIN_ROLE to add more admins', async () => {
            _contract = await Rewards.new()
            await _contract.addAdmin(accounts[1], {
                from: accounts[0],
            })
            const actual = await _contract.hasRole(
                DEFAULT_ADMIN_ROLE,
                accounts[1]
            )
            assert.equal(actual, true)
        })

        it('does not allow non-admins to add admins', async () => {
            _contract = await Rewards.new()
            try {
                await _contract.addAdmin(accounts[1], {
                    from: accounts[1],
                })
                assert.fail('addAdmin should throw an exception')
            } catch (e) {
                assert(e, 'non-admins should not be able to add admins')
            }
            const actual = await _contract.hasRole(
                DEFAULT_ADMIN_ROLE,
                accounts[1]
            )
            assert.equal(actual, false)
        })

        it('allows the DEFAULT_ADMIN_ROLE to remove admins', async () => {
            _contract = await Rewards.new()
            await _contract.addAdmin(accounts[1], {
                from: accounts[0],
            })
            await _contract.removeAdmin(accounts[1], {
                from: accounts[0],
            })
            const actual = await _contract.hasRole(
                DEFAULT_ADMIN_ROLE,
                accounts[1]
            )
            assert.equal(actual, false)
        })

        it('does not allow non-admins to remove admins', async () => {
            _contract = await Rewards.new()
            try {
                await _contract.removeAdmin(accounts[0], {
                    from: accounts[1],
                })
                assert.fail('removeAdmin should throw an exception')
            } catch (e) {
                assert(e, 'non-admins should not be able to remove admins')
            }
            const actual = await _contract.hasRole(
                DEFAULT_ADMIN_ROLE,
                accounts[0]
            )
            assert.equal(actual, true)
        })

        it('does not allow admins to remove self', async () => {
            _contract = await Rewards.new()
            try {
                await _contract.removeAdmin(accounts[0], {
                    from: accounts[0],
                })
                assert.fail('removeAdmin should throw an exception')
            } catch (e) {
                assert(e, 'admin should not be able to remove self')
            }
            const actual = await _contract.hasRole(
                DEFAULT_ADMIN_ROLE,
                accounts[0]
            )
            assert.equal(actual, true)
        })
    })

    describe('Pool', () => {
        it('has an initial roundMask of zero', async () => {
            _contract = await Rewards.new()
            const actual = await _contract.roundMask()
            assert.equal(actual, 0)
        })
    })

    describe('contributeToPool', () => {
        it('increments totalParticipants', async () => {
            _contract = await Rewards.new()

            const initialTotal = await _contract.totalParticipants()

            await _contract.contributeToPool({
                from: accounts[1],
                value: deposit1,
            })

            const newTotal = await _contract.totalParticipants()

            assert.equal(initialTotal, 0)
            assert.equal(newTotal, 1)
        })

        it('updates ParticipantData', async () => {
            _contract = await Rewards.new()

            await _contract.contributeToPool({
                from: accounts[1],
                value: deposit1,
            })

            const participant = await _contract.getParticipantData.call(
                accounts[1]
            )

            assert.equal(participant.amount, deposit1)
            assert.equal(participant.participantMask, 0)
        })

        it("doesn't allow further contributions before withdrawing", async () => {
            _contract = await Rewards.new()

            await _contract.contributeToPool({
                from: accounts[1],
                value: deposit1,
            })
            try {
                await _contract.contributeToPool({
                    from: accounts[1],
                    value: deposit1,
                })
            } catch (e) {
                assert(e, 'Withdraw funds before depositing')
            }

            const participant = await _contract.getParticipantData.call(
                accounts[1]
            )

            assert.equal(participant.amount, deposit1)
            assert.equal(participant.participantMask, 0)
        })

        it('updates totalDeposits', async () => {
            _contract = await Rewards.new()

            const initialTotal = await _contract.totalDeposits()

            await _contract.contributeToPool({
                from: accounts[1],
                value: deposit1,
            })

            const newTotal = await _contract.totalDeposits()

            assert.equal(initialTotal, 0)
            assert.equal(newTotal, deposit1)
        })
    })

    describe('getParticipantBalance', () => {
        it('returns correct balance after no rewards: 1 participant', async () => {
            _contract = await Rewards.new()

            const initialBalance = await _contract.getParticipantBalance(
                accounts[1]
            )

            await _contract.contributeToPool({
                from: accounts[1],
                value: deposit1,
            })

            const newBalance = await _contract.getParticipantBalance(
                accounts[1]
            )

            assert.equal(initialBalance, 0)
            assert.equal(newBalance.toString(), deposit1)
        })

        it('returns correct balance after 1 reward: 1 participant', async () => {
            _contract = await Rewards.new()

            const rewardAmount = parseEther('0.1').toString()
            const initialBalance = await _contract.getParticipantBalance(
                accounts[1]
            )
            const expected = BigNumber(rewardAmount).plus(deposit1)

            await _contract.contributeToPool({
                from: accounts[1],
                value: deposit1,
            })
            await _contract.distributeReward({
                from: accounts[0],
                value: rewardAmount,
            })

            const newBalance = await _contract.getParticipantBalance(
                accounts[1]
            )

            assert.equal(initialBalance, 0)
            assert.equal(newBalance.toString(), expected.minus(1).toString())
        })

        it('returns correct balance after 2 rewards: 1 participant', async () => {
            _contract = await Rewards.new()

            const rewardOneAmount = parseEther('0.1').toString()
            const rewardTwoAmount = parseEther('0.05').toString()
            const expected = BigNumber(deposit1)
                .plus(rewardOneAmount)
                .plus(rewardTwoAmount)
            const initialBalance = await _contract.getParticipantBalance(
                accounts[1]
            )

            await _contract.contributeToPool({
                from: accounts[1],
                value: deposit1,
            })
            await _contract.distributeReward({
                from: accounts[0],
                value: rewardOneAmount,
            })
            await _contract.distributeReward({
                from: accounts[0],
                value: rewardTwoAmount,
            })

            const newBalance = await _contract.getParticipantBalance(
                accounts[1]
            )

            assert.equal(initialBalance, 0)
            assert.equal(newBalance.toString(), expected.minus(1).toString())
        })

        it('returns correct balance after no rewards: 2 participants', async () => {
            _contract = await Rewards.new()

            const initialBalanceParticipant2 =
                await _contract.getParticipantBalance(accounts[2])

            await _contract.contributeToPool({
                from: accounts[1],
                value: deposit1,
            })
            await _contract.contributeToPool({
                from: accounts[2],
                value: deposit2,
            })

            const newBalanceParticipant1 =
                await _contract.getParticipantBalance(accounts[1])
            const newBalanceParticipant2 =
                await _contract.getParticipantBalance(accounts[2])

            assert.equal(initialBalanceParticipant2, 0)
            assert.equal(newBalanceParticipant1.toString(), deposit1)
            assert.equal(newBalanceParticipant2.toString(), deposit2)
        })

        it('returns correct balance after 1 reward: 2 participants', async () => {
            _contract = await Rewards.new()
            const rewardAmount = parseEther('0.1').toString()
            const expectedParticipant1 = BigNumber(deposit1).plus(
                BigNumber(rewardAmount).multipliedBy(0.45 / 0.75)
            )
            const expectedParticipant2 = BigNumber(deposit2).plus(
                BigNumber(rewardAmount).multipliedBy(0.3 / 0.75)
            )

            await _contract.contributeToPool({
                from: accounts[1],
                value: deposit1,
            })
            await _contract.contributeToPool({
                from: accounts[2],
                value: deposit2,
            })
            await _contract.distributeReward({
                from: accounts[0],
                value: rewardAmount,
            })

            const newBalanceParticipant1 =
                await _contract.getParticipantBalance(accounts[1])
            const newBalanceParticipant2 =
                await _contract.getParticipantBalance(accounts[2])

            assert.equal(
                BigNumber(newBalanceParticipant1).plus(1).toString(),
                expectedParticipant1.toString()
            )
            assert.equal(
                BigNumber(newBalanceParticipant2).minus(2).toString(),
                expectedParticipant2.toString()
            )
        })

        it('returns correct balance after 2 rewards: 2 participants', async () => {
            _contract = await Rewards.new()
            const reward1Amount = parseEther('0.1').toString()
            const reward2Amount = parseEther('0.25').toString()
            const expectedParticipant1 = BigNumber(deposit1)
                .plus(reward1Amount)
                .plus(
                    BigNumber(reward2Amount).multipliedBy(0.45 / (0.45 + 0.3))
                )
            const expectedParticipant2 = BigNumber(deposit2)
                .plus(BigNumber(reward2Amount).multipliedBy(0.3 / (0.45 + 0.3)))
                .dp(0)

            await _contract.contributeToPool({
                from: accounts[1],
                value: deposit1,
            })
            await _contract.distributeReward({
                from: accounts[0],
                value: reward1Amount,
            })
            await _contract.contributeToPool({
                from: accounts[2],
                value: deposit2,
            })
            await _contract.distributeReward({
                from: accounts[0],
                value: reward2Amount,
            })

            const newBalanceParticipant1 =
                await _contract.getParticipantBalance(accounts[1])
            const newBalanceParticipant2 =
                await _contract.getParticipantBalance(accounts[2])

            assert.equal(
                BigNumber(newBalanceParticipant1).plus(1).toString(),
                expectedParticipant1.toString()
            )
            assert.equal(
                BigNumber(newBalanceParticipant2).minus(6).toString(),
                expectedParticipant2.toString()
            )
        })
    })

    describe('withdraw', () => {
        it('emits a Withdrawal event', async () => {
            _contract = await Rewards.new()
            await _contract.contributeToPool({
                from: accounts[1],
                value: deposit1,
            })
            truffleAssert.eventEmitted(
                await _contract.withdraw({ from: accounts[1] }),
                'Withdrawal',
                ({ participant, depositAmount, total }) =>
                    participant === accounts[1] &&
                    depositAmount.toString() === deposit1 &&
                    total.toString() === deposit1
            )
        })

        it('withdraws the correct amount: 2 participants, 2 rewards', async () => {
            _contract = await Rewards.new()
            await _contract.contributeToPool({
                from: accounts[1],
                value: deposit1,
            })

            _contract = await Rewards.new()
            const reward1Amount = parseEther('0.1').toString()
            const reward2Amount = parseEther('0.25').toString()
            const expectedParticipant1 = BigNumber(deposit1)
                .plus(reward1Amount)
                .plus(
                    BigNumber(reward2Amount).multipliedBy(0.45 / (0.45 + 0.3))
                )
                .plus(BigNumber(reward2Amount).multipliedBy(0.3 / (0.45 + 0.3)))
                .dp(0)

            await _contract.contributeToPool({
                from: accounts[1],
                value: deposit1,
            })
            await _contract.distributeReward({
                from: accounts[0],
                value: reward1Amount,
            })
            await _contract.contributeToPool({
                from: accounts[2],
                value: deposit2,
            })
            await _contract.distributeReward({
                from: accounts[0],
                value: reward2Amount,
            })

            const balParticipant1Before = await web3.eth.getBalance(accounts[1])
            await _contract.withdraw({
                from: accounts[1],
            })
            const balParticipant1After = await web3.eth.getBalance(accounts[1])

            assert(balParticipant1After > balParticipant1Before)
        })
    })
})
