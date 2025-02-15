<script lang="ts">
import { Options, Prop, Vue } from 'vue-property-decorator';
import AppGameThumbnailPlaceholder from '../../../../../_common/game/thumbnail/AppGameThumbnailPlaceholder.vue';
import { Screen } from '../../../../../_common/screen/screen-service';
import { GameGridRowSizeLg, GameGridRowSizeMd, GameGridRowSizeSm } from '../grid.vue';

@Options({
	components: {
		AppGameThumbnailPlaceholder,
	},
})
export default class AppGameGridPlaceholder extends Vue {
	@Prop({ type: Number, required: true }) num!: number;
	@Prop({ type: Boolean, default: false }) truncateToFit!: boolean;
	@Prop({ type: Boolean, default: false }) scrollable!: boolean;
	@Prop({ type: Boolean, default: false }) forceScrollable!: boolean;

	readonly Screen = Screen;

	get isScrollable() {
		return (Screen.isXs && this.scrollable) || this.forceScrollable;
	}

	get count() {
		if (!this.truncateToFit || this.isScrollable) {
			return this.num;
		}

		let rowSize: number;
		if (Screen.breakpoint === 'sm') {
			rowSize = GameGridRowSizeSm;
		} else if (Screen.breakpoint === 'md') {
			rowSize = GameGridRowSizeMd;
		} else if (Screen.breakpoint === 'lg') {
			rowSize = GameGridRowSizeLg;
		} else {
			rowSize = this.num;
		}

		return Math.max(1, Math.floor(this.num / rowSize)) * rowSize;
	}
}
</script>

<template>
	<div :class="{ 'scrollable-grid-xs': scrollable }">
		<div class="game-grid-items">
			<div v-for="i of count" :key="i" class="game-grid-item">
				<AppGameThumbnailPlaceholder />
			</div>
		</div>
	</div>
</template>

<style lang="stylus" scoped>
@import '../grid'
</style>
