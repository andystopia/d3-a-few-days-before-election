<script lang="ts">
	import '../lib/Election';
	import * as d3 from 'd3';
	import { onMount } from 'svelte';

	import {
		USElection,
		tossups,
		ElectoralVoteCounts,
		parties,
		PARTIES,
		Party,
		USState,
		stochasticElection,
		type PartyDistributor,
		NormalPartyDistributor,
		gaussianRandom,

		INITIAL_VOTE_COUNTS

	} from '$lib/Election';

	import Distribution from './Distribution.svelte';
	import StateSliderWidget from './StateSliderWidget.svelte';

	const election = new USElection(tossups);

	function getAllPermutations(n: number): boolean[][] {
		const result: boolean[][] = [];
		for (let i = 0; i < 1 << n; i++) {
			const permutation: boolean[] = [];
			for (let j = 0; j < n; j++) {
				permutation.push((i & (1 << j)) !== 0);
			}
			result.push(permutation);
		}
		return result;
	}

	function simulatePermutation(permutation: boolean[]): ElectoralVoteCounts {
		const tossupWins = permutation.map((win) => (win ? 1 : 0)).map((idx) => parties[idx]);

		const electoralCount = new ElectoralVoteCounts(INITIAL_VOTE_COUNTS);

		election.tallyVotes(tossupWins, electoralCount);
		return electoralCount;
	}

	function removeOverlappingWins(results: ElectoralVoteCounts[]) {
		// idea is, for every winning result,
		// if, for the party that wins, we can remove a tossup state,
		// and that party still wins, then we can remove this election result.

		const newResults = [];

		for (const result of results) {
			let winner = result.getWinner();

			if (winner == null) {
				newResults.push(result);
				continue;
			}

			const states = Array.from(result.getStatesAssignedTo(winner)!);

			let shouldAdd = true;
			for (const state of states) {
				if (state.getAbbreviation() == 'NV' && winner == PARTIES.DEMOCRAT) {
					console.log(states);
				}
				result.unassignState(winner, state);
				const newWinner = result.getWinner();
				result.assignState(winner, state);

				if (newWinner === winner) {
					shouldAdd = false;
					break;
				}
			}

			if (shouldAdd) {
				newResults.push(result);
			}
		}

		return newResults;
	}

	const allResults = getAllPermutations(tossups.length).map(simulatePermutation);
	const filteredResults = removeOverlappingWins(allResults);

	const pathwaysRepub = filteredResults.filter((result) => result.getWinner() === PARTIES.REPUBLICAN);
	const pathwaysDem = filteredResults.filter((result) => result.getWinner() === PARTIES.DEMOCRAT);

	const statePathCounts: Map<Party, Map<USState, number>> = new Map([
		[PARTIES.REPUBLICAN, new Map()],
		[PARTIES.DEMOCRAT, new Map()]
	]);

	for (const toss of tossups) {
		for (const party of parties) {
			statePathCounts.get(party)!.set(toss, 0);
		}
	}

	for (let result of filteredResults) {
		const winner = result.getWinner();
		if (winner == null) {
			continue;
		}

		const states = result.getStatesAssignedTo(winner)!;

		for (let state of states) {
			statePathCounts.get(winner)!.set(state, statePathCounts.get(winner)!.get(state)! + 1);
		}
	}

	function orderTossupsByParty(party: Party): USState[] {
		const tossupsCopy = [...tossups];
		tossupsCopy.sort((a, b) => {
			const aCount = statePathCounts.get(party)!.get(a)!;
			const bCount = statePathCounts.get(party)!.get(b)!;
			return bCount - aCount;
		});

		return tossupsCopy;
	}

	const demTossups = orderTossupsByParty(PARTIES.DEMOCRAT);
	const repTossups = orderTossupsByParty(PARTIES.REPUBLICAN);

	const randomElection: ElectoralVoteCounts[] = [];

	for (let i = 0; i < 1000; i++) {
		randomElection.push(
			stochasticElection(election, (state) =>
				Math.random() >= 0.5 ? PARTIES.REPUBLICAN : PARTIES.DEMOCRAT
			)
		);
	}

	let stateDistributions = $state(
		(() => {
			const distMap = new Map<USState, PartyDistributor>();
			for (const toss of tossups) {
				distMap.set(toss, new NormalPartyDistributor(0.0, 1));
			}
			return distMap;
		})()
	);

	// svelte-ignore state_referenced_locally
	let adjustedElection: ElectoralVoteCounts[] = $state(computeAdjustedElection(stateDistributions));

	$effect(() => {
		let _ = adjustedElection;
		console.log('election updated');
	});
    
	function computeAdjustedElection(lookup: Map<USState, PartyDistributor>): ElectoralVoteCounts[] {
		console.log('here');
		const elects = [];
		for (let i = 0; i < 1000; i++) {
			elects.push(stochasticElection(election, (state) => lookup.get(state)!.randomParty()));
		}
		return elects;
	}
</script>

<div class="py-4">
	<div class="mb-2 px-20 font-serif">
		<h1 class="mb-7 pl-4 pt-8 text-center font-serif text-3xl font-black">
			Tossup of the {tossups.length} Swing States
		</h1>
		<p class="pl-4 text-center text-sm">
			The NYT has identified {tossups.length} swing states which could determine the US 2024 Election.<br
			/>
		</p>
	</div>
	<p class="pt-4 text-center font-serif text-sm">
		<span class="bg-yellow-200 font-semibold"
			>Arizona, Georgia, North Carolina, <br /> Nevada, Pennslyvania, Wisconsin, and Michigan.</span
		>
	</p>
</div>

<Distribution {allResults} {PARTIES} {parties} subcaption={'Plausible Outcomes'}>
	{#snippet title()}
		All Plausible Electoral Victories
	{/snippet}
</Distribution>

<h3 class="mt-10 text-center font-bold">Narrowing the Pathways</h3>
<p class="mx-auto mb-10 mt-8 max-w-2xl text-balance px-5 text-center font-serif">
	Let's say a candidate wins, for example three states, and reaches that <emph
		class="text-nowrap italic">270-to-win</emph
	> number. If there is a pathway with four states, which includes those prior three states, then the
	additional state in the pathway didn't influence the outcome of the election, and is extraneous. We
	can remove the pathways with extraneous states.
</p>

<Distribution allResults={filteredResults} {PARTIES} {parties}>
	{#snippet title()}
		Pathways To 270
	{/snippet}
</Distribution>

<p class="mx-auto mb-10 mt-8 max-w-2xl text-balance px-10 text-center font-serif">
	This distribution yields an interesting insight. Notably the number of winning pathways is the
	same for each candidate. This graph also tells us that Harris <emph class="italic">must</emph> win
	Pennslyvania, unless she wins Michigan, Georgia, and North Carolina.
</p>

<h3 class="text-center font-bold">Continuing the Election of Random Chance</h3>

<p class="mx-auto mb-10 mt-8 max-w-2xl text-balance px-5 text-center font-serif">
	Let's continue with the assumption that every state is equally likely to be won.
</p>
<p class="mx-auto mb-10 mt-8 max-w-2xl text-balance px-5 text-center font-serif">
	Let's say that Trump wins Pennslyvania. This leaves Harris with one path to victory, which
	includes winning three states. The odds of winning these three states is 1 in 8.
</p>
<p class="mx-auto mb-10 mt-8 max-w-2xl text-balance px-5 text-center font-serif">
	Harris' win of Pennslyvania is only an indicator on election day of whether she will win the
	presidency. The actual probabilities of the election are much more complex.
</p>

<h3 class="mt-10 text-center font-bold">A Fully Random Election</h3>

<p class="mx-auto mb-10 mt-8 max-w-2xl text-balance px-5 text-center font-serif">
	Let's say that the election is just determined sheerly randomly, every swing state is as likely to
	go one way as to go another way. We can simulate this occurrence in the swing states and tally the
	votes to see who wins.
</p>

<Distribution
	allResults={randomElection}
	{PARTIES}
	{parties}
	ymax={40}
	subcaption={'Electoral Wins'}
>
	{#snippet title()}
		Simulating 1000 Random Elections
	{/snippet}
</Distribution>

<p class="mx-auto mb-10 mt-8 max-w-2xl text-balance px-5 text-center font-serif">
	Despite the strong contingency of Harris' win on Pennslyvania, the random election, in most
	simulations, demonstrates that Harris has a slight advantage to Trump in the electoral college.
</p>

<h2 class="mx-auto mb-10 mt-8 max-w-2xl text-balance px-5 text-center font-serif text-2xl">
	Role of States In Election Pathways
</h2>

<div class="mx-auto grid max-w-lg grid-cols-2 gap-x-1 border bg-neutral-200">
	<div class="bg-neutral-100 font-serif">
		<div class="grid border-b-2 py-1 text-center text-lg font-bold">Harris</div>
		<div class="grid" style={`grid-template-columns: 1fr repeat(${pathwaysDem.length}, 1.1em) 1.3em`}>
			{#each demTossups as tossup}
				<div class="mr-1 border-r pr-1 text-right font-mono">{tossup.getAbbreviation()}</div>
				{#each filteredResults as filteredResult}
					{#if filteredResult.getWinner() === PARTIES.DEMOCRAT}
						{#if filteredResult.getStatesAssignedTo(PARTIES.DEMOCRAT)!.has(tossup)}
							<div class="h-4 w-4 place-self-center rounded-full bg-blue-700"></div>
						{:else}
							<div></div>
						{/if}
					{/if}
				{/each}
				<div
					class="ml-1 grid place-items-center bg-blue-700 font-mono text-xs font-bold text-white"
				>
					{statePathCounts.get(PARTIES.DEMOCRAT)!.get(tossup)}
				</div>
			{/each}
		</div>
	</div>
	<div class="bg-neutral-100 font-serif">
		<div class="grid border-b-2 py-1 text-center text-lg font-bold">Trump</div>
		<div class="grid" style={`grid-template-columns: 1fr repeat(${pathwaysRepub.length}, 1.1em) 1.3em`}>
			{#each repTossups as tossup}
				<div class="mr-1 border-r pr-1 text-right font-mono">{tossup.getAbbreviation()}</div>
				{#each filteredResults as filteredResult}
					{#if filteredResult.getWinner() === PARTIES.REPUBLICAN}
						{#if filteredResult.getStatesAssignedTo(PARTIES.REPUBLICAN)!.has(tossup)}
							<div class="h-4 w-4 place-self-center rounded-full bg-red-700"></div>
						{:else}
							<div></div>
						{/if}
					{/if}
				{/each}
				<div class="ml-1 grid place-items-center bg-red-700 font-mono text-xs font-bold text-white">
					{statePathCounts.get(PARTIES.REPUBLICAN)!.get(tossup)}
				</div>
			{/each}
		</div>
	</div>
</div>

<p class="mx-auto mt-8 max-w-2xl text-balance px-5 text-center font-serif">
	The above figure plots, for each candidate, the state combinations they need which will lead to an
	electoral victory. The states are in the rows, and a dot is placed in each column if that state is
	part of the pathway to victory. The number in the rightmost column indicates the number of times
	that state was part of a pathway to victory.
</p>

<p class="mx-auto mt-8 max-w-2xl text-balance px-5 text-center font-serif">
	We see Harris needs PA in 10/11 pathways to 270. We also see that a Trump win of Pennslyvania and
	Arizona isn't enough to block Harris from winning the election, though it certainly shifts the
	scales significantly in his favor.
</p>

<h2 class="mx-auto mb-10 mt-8 max-w-2xl text-balance px-5 text-center font-serif text-2xl">
	Probability Adjustment
</h2>

<p class="mx-auto mt-8 max-w-2xl text-balance px-5 text-center font-serif">
	A poll which registers as 52% in one candidate's favor simply indicates that candidate might be
	preferred to win that state. The number 52% indicates the percentage of the people who support
	that candidate, it does not mean there's a 52% chance of that candidate winning the state.
</p>
<p class="mx-auto mb-10 mt-2 max-w-2xl text-balance px-5 text-center font-serif">
	Put another way, let's say a poll indicates that there is 52% support for one candidate, and that
	that percentage is the percent of voters who do vote for that candidate on election day. In this
	case, the candidate will get 52% of the vote and will win. Note that this result holds true no
	matter how many elections we hold, this candidate will continue to win 52% of the vote, and
	therefore the election, giving them a 100% win rate.
</p>

<p class="mx-auto mb-10 mt-2 max-w-2xl text-balance px-5 text-center font-serif">
	So, do we are about the polling percentage? <strong>Yes</strong>, we do, but we
	<emph class="italic">also</emph> care about how certain we are that it's 52%. If 2 polls indicate 52%
	support, and one indicates 48% support, then we can say that their opponent has more chances of winning
	compared to a candidate which polls three 52% polls.
</p>

<div class="mx-auto grid max-w-2xl grid-cols-2 gap-2">
	{#each tossups as state}
		<StateSliderWidget
			stateName={state.getName()}
			setDistributor={(dist) => {
				stateDistributions = stateDistributions.set(state, dist);
				adjustedElection = computeAdjustedElection(stateDistributions);
			}}
		/>
	{/each}
</div>

<Distribution
	allResults={adjustedElection}
	{PARTIES}
	{parties}
	ymax={40}
	subcaption={'Electoral Wins'}
>
	{#snippet title()}
		Simulating 1000 Random, <emph class="italic">Adjusted</emph> Elections
	{/snippet}
</Distribution>

<div class="h-32"></div>

<!-- {#each allResults as result}
	<div class="grid w-full grid-cols-2">
		<div class="flex flex-row gap-x-2">
			{#each result.getStatesAssignedTo(PARTIES.REPUBLICAN)! as repState}
				<div class="rounded-md bg-red-500 px-2 text-xs font-bold text-white mb-0.5">
					{repState.getName()}
				</div>
			{/each}
		</div>
		<div class="flex flex-row gap-x-2">
			{#each result.getStatesAssignedTo(PARTIES.DEMOCRAT)! as demState}
				<div class="rounded-md bg-blue-500 px-2 text-xs font-bold text-white">
					{demState.getName()}
				</div>
			{/each}
		</div>
	</div>
{/each} -->
