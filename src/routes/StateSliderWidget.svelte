<script lang="ts">
    import {type PartyDistributor, NormalPartyDistributor, FixedPartyDistributor, PARTIES} from "$lib/Election";
	type Props = {
		stateName: string;
        setDistributor: (distribution: PartyDistributor) => void;
	};

	let { stateName, setDistributor }: Props = $props();

	const pcts = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 7, 10, 15];
	const pctsRev = [...pcts].reverse();

	const varPcts = [0.25, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10];

    let idx = $state(0);

    let varIdx = $state(6);


    let nonExtremeIdx = $derived(idx != -pctsRev.length - 1 && idx != pcts.length + 1);
    

    const distributor = $derived.by(() => {

        if (idx == -pctsRev.length - 1) {
            return new FixedPartyDistributor(PARTIES.DEMOCRAT);
        } 
        if (idx == pcts.length + 1) { 
            return new FixedPartyDistributor(PARTIES.REPUBLICAN);
        }

        if (idx == 0) {
            return new NormalPartyDistributor(0.0, varPcts[varIdx]);
        }
        else if (idx < 0) {
            return new NormalPartyDistributor(0.0 - pctsRev[-idx - 1], varPcts[varIdx]);
        } else  {
            return new NormalPartyDistributor(0.0 + pcts[idx - 1], varPcts[varIdx]);
        }
    });

    $effect(() => {
        setDistributor(distributor);
    })

</script>

<div class="rounded-lg bg-neutral-100 pb-2 font-sans border border-neutral-400">
	<div class="mt-1 border-b px-4 py-1 font-bold">
		State of <span class="rounded-md bg-neutral-200 px-2 font-sans font-semibold">{stateName}</span>
	</div>
	<div class="px-4">
		<div class="text-sm font-bold">Alignment</div>
        <button class={`mb-1 transition-colors duration-100 w-full rounded-md ${idx == -pctsRev.length - 1 ? "bg-blue-700/80 font-semibold text-neutral-100" : "bg-blue-700/20"}  py-0.5 text-xs`}
        onclick={() => idx = -pctsRev.length - 1}>100%</button>
		<div
			class="grid grid-cols-[repeat(6,1fr)] place-items-center gap-x-1 gap-y-1 px-1 font-sans text-xs"
		>
			{#each pctsRev as pct, i}
				<button 
                    class={`w-full transition-colors duration-100 rounded-md  py-0.5 ${idx == (-i - 1) ? "bg-blue-700/80 font-semibold text-neutral-100" : "bg-blue-700/20"} `}
                    onclick={() => idx = -i - 1}
                    >{pct}%</button>
			{/each}
		</div>
		<button class={`mb-1 w-full rounded-md ${idx == 0 ? "bg-neutral-700 text-neutral-100" : "bg-neutral-200 text-neutral-800"} font-semibold py-0.5 text-xs transition-colors duration-100`} onclick={() => idx = 0}>Dead Draw</button>
		<div
			class="grid grid-cols-[repeat(6,1fr)] place-items-center gap-x-1 gap-y-1 px-1 font-sans text-xs"
		>
			{#each pcts as pct, i}
				<button 
                class={`w-full rounded-md transition-colors duration-100 py-0.5 ${idx == i + 1 ? "bg-red-700/80 font-semibold text-neutral-100" : "bg-red-700/20"} `}
                onclick={() => idx = i + 1}
                >{pct}%</button>
			{/each}
		</div>
        <button class={`mb-1 w-full transition-colors duration-100 rounded-md ${idx == pcts.length + 1 ? "bg-red-700/80 font-semibold text-neutral-100" : "bg-red-700/20"} py-0.5 text-xs`}
        onclick={() => idx = pcts.length + 1}
        >100%</button>
        <div class={`${nonExtremeIdx ? "opacity-100" : "opacity-50"} transition-colors duration-100`}>
            <div class="mt-2 text-sm font-bold">Range in Polling Percentages</div>
            <div
                class="grid grid-cols-[repeat(6,1fr)] place-items-center gap-x-1 gap-y-1 px-1 font-sans text-xs"
            >
                {#each varPcts as pct, i}
                    <button class={`w-full transition-colors duration-100 rounded-md  py-0.5 ${varIdx == i && nonExtremeIdx ? "bg-neutral-700 text-white font-semibold" : "bg-neutral-200"}`} onclick={() => varIdx = i}>{pct}%</button>
                {/each}
            </div>
        </div>
	</div>
</div>
