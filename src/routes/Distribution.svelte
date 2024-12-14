<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
    import * as d3 from 'd3';
    import { ElectoralVoteCounts, Party } from '../lib/Election';

    interface Props {
        allResults: ElectoralVoteCounts[];
        parties: Party[];
        PARTIES: {REPUBLICAN: Party, DEMOCRAT: Party};
        title: Snippet;
        ymax?: number;
        subcaption?: string;
    }
    let {allResults, parties, PARTIES, title, ymax = 4, subcaption = "Paths to President"} : Props  = $props();

    const diff = $derived(allResults.map((res) => res.diffParty(PARTIES.REPUBLICAN, PARTIES.DEMOCRAT)));

	let vizRef: HTMLDivElement;
	let tooltip: HTMLDivElement;

	let size = $state(100);

	let hoveredResult = $state(-1);

	let resultDeclaration = $derived.by(() => {
		if (hoveredResult == -1) {
			return null;
		}

		const result = allResults[hoveredResult];

		const outputs = [];
		for (let party of parties) {
			const states = result.getStatesAssignedTo(party);
			if (states == null) {
				continue;
			}
			for (const state of states) {
				outputs.push({
					name: state.getAbbreviation(),
					party: party.getName(),
					votes: state.getElectoralVotes()
				});
			}
		}
		return outputs.sort((a, b) => a.name.localeCompare(b.name));
	});

	$effect(() => {
		vizRef.innerHTML = '';
		const _ = size;
		let sampleSVG = d3.select(vizRef);

		// use the sampleSVG and create a sample scatter plot

		// set the dimensions and margins of the graph
		var margin = { top: 10, right: 0, bottom: 50, left: 0 },
			height = 95 - margin.top - margin.bottom;

		// append the svg object to the body of the page
		var svg = sampleSVG
			.append('svg')
			.attr('width', '100%')
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		const extent = d3.max(diff.map((d) => Math.abs(d)))!;
		// Add X axis
		var x = d3
			.scaleLinear()
			.domain([-extent - extent / 10, extent + extent / 10])
			.range([0, vizRef.clientWidth]);
		svg
			.append('g')
			.attr('transform', 'translate(0,' + height + ')')
			.call(d3.axisBottom(x));

		// Add Y axis
		var y = d3.scaleLinear().domain([0, ymax]).range([height, 0]);
		// svg.append('g').call(d3.axisLeft(y).ticks(2));

		const data: [number, number][] = diff.map((d, i) => [i, d]);

		const occMap = new Map();

		// Add dots
		svg
			.append('g')
			.selectAll('dot')
			.data(data)
			.enter()
			.append('circle')
			.attr('cx', function (d) {
				return x(d[1]);
			})
			.attr('cy', function (d) {
				if (occMap.has(d[1])) {
					occMap.set(d[1], occMap.get(d[1]) + 1);
				} else {
					occMap.set(d[1], 1);
				}
				return y(occMap.get(d[1]));
			})
			.attr('r', () => Math.min(size / 300, height / 11))
			.style('fill', function (d) {
				if (allResults[d[0]].getWinner() == PARTIES.REPUBLICAN) {
					return 'rgb(185, 28, 28)';
				} else if (allResults[d[0]].getWinner() == null) {
					return 'gray';
				} else {
					return 'rgb(29, 78, 216)';
				}
			})
			.on('mouseenter', (evt, x) => {
				hoveredResult = x[0];
				tooltip.style.opacity = '100%';
			})
			.on('mouseleave', (evt, x) => {
				tooltip.style.opacity = '0';
			});
		svg
			.append('text')
			.attr('class', 'x label')
			.attr('text-anchor', 'middle')
			.attr('font-size', '12px')
			.attr('font-weight', 'bold')
			.attr('x', vizRef.clientWidth / 2)
			.attr('y', height + 40)
			.text('Electoral College Win Margin');
	});
	let containerRect: HTMLDivElement;

	onMount(() => {
		const resizeObserver = new ResizeObserver((res) => {
			size = containerRect.clientWidth;
		});
		resizeObserver.observe(containerRect);
	});
</script>

<div
	class="relative mt-4 bg-zinc-100 py-2"
	aria-roledescription="visualization of luck"
	role="presentation"
	onmousemove={(ev) => {
		const left = ev.clientX - ev.currentTarget.getBoundingClientRect().left + 3;
		const top = ev.clientY - ev.currentTarget.getBoundingClientRect().top;

		tooltip.style.left = `${left}px`;
		tooltip.style.top = `calc(${top}px - 2rem)`;
	}}
>
	<h1 class="my-2 text-center font-serif text-2xl">{@render title()}</h1>
	<div class="grid place-items-center">
		<div class="grid max-w-[800px] grid-cols-3 place-items-center px-20 pb-5">
			<div class="text-center font-semibold leading-4">
				<div class="text-nowrap font-black text-blue-700">
					<span class="mr-2 text-3xl">{diff.filter((diff) => diff < 0).length}</span> Harris
				</div>
				<div>{subcaption}</div>
			</div>
			<div class="mt-2 grid place-items-center text-sm italic">
				<div class="font-black text-zinc-500">{diff.filter((diff) => diff == 0).length} Ties</div>
			</div>
			<div class="text-center font-semibold leading-4">
				<div class="text-nowrap font-black text-red-700">
					<span class="mr-2 text-3xl">{diff.filter((diff) => diff > 0).length}</span> Trump
				</div>
				<div>{subcaption}</div>
			</div>
		</div>
		<!-- {diff} -->

		<div
			bind:this={containerRect}
			class="w-full overflow-clip pl-8 pr-12"
		>
			<div bind:this={vizRef} class="w-full"></div>
		</div>

		<div
			class="absolute w-36 rounded-md border bg-white px-2 py-1 opacity-0 transition-opacity"
			bind:this={tooltip}
		>
			{#if resultDeclaration != null}
				<div class="pb-1 text-center text-xs font-black">Breakdown</div>
				<div class="grid grid-cols-2 gap-x-1 gap-y-0.5">
					{#each resultDeclaration as { name, party, votes }}
						<div
							class={`flex gap-x-1 text-xs ${party == 'Republican' ? 'bg-red-700' : 'bg-blue-700'} rounded-md pr-2 `}
						>
							<div class="bg-white/20 pl-2 pr-0.5 text-white">{votes}</div>
							<div class="font-black text-white">{name}</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
