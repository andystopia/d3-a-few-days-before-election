export class USState {
	private electoralVotes: number;
	private name: string;
	private abbr: string;
	constructor(name: string, abbr: string, electoralVotes: number) {
		this.name = name;
		this.abbr = abbr;
		this.electoralVotes = electoralVotes;
	}

	public getAbbreviation() {
		return this.abbr;
	}

	public getElectoralVotes() {
		return this.electoralVotes;
	}

	public getName() {
		return this.name;
	}
}

export class Party {
	private name: string;

	constructor(name: string) {
		this.name = name;
	}

	public getName() {
		return this.name;
	}
}

export const PARTIES = {
	REPUBLICAN: new Party('Republican'),
	DEMOCRAT: new Party('Democrat')
};

export const parties = [PARTIES.REPUBLICAN, PARTIES.DEMOCRAT];

export class USElection {
	private tossups: USState[];

	constructor(tossups: USState[]) {
		this.tossups = tossups;
	}

	public getTossups(): USState[] {
		return this.tossups;
	}

	/**
	 * Given a list of parties, we will assign
	 * the tossup states to each party and return
	 * an `ElectionResult` for each party.
	 * @param parties
	 */
	public tallyVotes(parties: Party[], electionResults: ElectoralVoteCounts) {
		if (parties.length !== this.tossups.length) {
			throw new Error('Number of parties must match number of tossups');
		}

		for (let i = 0; i < tossups.length; i++) {
			electionResults.assignState(parties[i], tossups[i]);
		}
	}
}

export class ElectoralVoteCounts {
	private biasMap = new Map<Party, number>();
	private countMap: Map<Party, Set<USState>> = new Map();

	constructor(starting: Map<Party, number>) {
		this.biasMap = new Map(starting);

		for (const party of starting.keys()) {
			this.countMap.set(party, new Set());
		}
	}

	private getBias(party: Party) {
		return this.biasMap.get(party) ?? 0;
	}
	public getVotes(party: Party) {
		const states = this.countMap.get(party) ?? new Set();
		const arr = Array.from(states);

		return arr.reduce((acc, state) => acc + state.getElectoralVotes(), this.getBias(party));
	}

	public assignState(party: Party, state: USState) {
		if (this.countMap.has(party)) {
			this.countMap.get(party)?.add(state);
		} else {
			this.countMap.set(party, new Set([state]));
		}
	}

	public getWinner(): Party | null {
		const voteMap = new Map<Party, number>();

		for (const party of this.countMap.keys()) {
			voteMap.set(party, this.getVotes(party)!);
		}

		const sorted = Array.from(voteMap.entries()).sort((a, b) => b[1] - a[1]);
		if (sorted[0][1] == sorted[1][1]) {
			return null;
		}
		return sorted[0][0];
	}

	public getStatesAssignedTo(party: Party) {
		return this.countMap.get(party);
	}

	public unassignState(party: Party, state: USState) {
		this.countMap.get(party)!.delete(state);
	}
	public diffParty(partyA: Party, partyB: Party) {
		return this.getVotes(partyA)! - this.getVotes(partyB)!;
	}
}

// Standard Normal variate using Box-Muller transform.
export function gaussianRandom(mean = 0, stdev = 1) {
	const u = 1 - Math.random(); // Converting [0,1) to (0,1]
	const v = Math.random();
	const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
	// Transform to the desired mean and standard deviation:
	return z * stdev + mean;
}

export function stochasticElection(
	election: USElection,
	choose: (state: USState) => Party
): ElectoralVoteCounts {
	const tossupWins = [];
	for (const state of tossups) {
		tossupWins.push(choose(state));
	}

	const electoralCount = new ElectoralVoteCounts(INITIAL_VOTE_COUNTS);

	election.tallyVotes(tossupWins, electoralCount);
	return electoralCount;
}

export interface PartyDistributor {
	randomParty(): Party;
}

export class NormalPartyDistributor {
	private mean: number;
	private stdDev: number;

	/**
	 *
	 * @param mean Mean of the distribution generated, a mean higher than 0.0 will generate more Republicans, and a mean
	 * less will generate more Democrats.
	 * @param stdDev the stddeviation of the distribution
	 */
	constructor(mean: number, stdDev: number) {
		this.mean = mean;
		this.stdDev = stdDev;
	}

	public static fromRange(bias: number, range: number) {
		// we want a normal distribution where 95% of the values
		// are within the range specified.
		const radius = range / 2;
		const stdDev = radius / 2;
		return new NormalPartyDistributor(bias, stdDev);
	}

	randomParty() {
		const rand = gaussianRandom(this.mean, this.stdDev);
		return rand > 0 ? PARTIES.REPUBLICAN : PARTIES.DEMOCRAT;
	}
}

export const INITIAL_VOTE_COUNTS = new Map([
	[PARTIES.REPUBLICAN, 219],
	[PARTIES.DEMOCRAT, 226]
]);

export class FixedPartyDistributor {
	private party: Party;

	constructor(party: Party) {
		this.party = party;
	}

	randomParty() {
		return this.party;
	}
}

export const tossups = [
	new USState('Arizona', 'AZ', 11),
	new USState('Georgia', 'GA', 16),
	new USState('North Carolina', 'NC', 16),
	new USState('Nevada', 'NV', 6),
	new USState('Pennslyvania', 'PA', 19),
	new USState('Wisconsin', 'WI', 10),
	new USState('Michigan', 'MI', 15)
];
