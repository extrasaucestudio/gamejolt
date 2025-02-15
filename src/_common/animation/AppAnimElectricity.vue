<script lang="ts" setup>
import { computed, CSSProperties, onMounted, PropType, ref, toRefs } from 'vue';
import { debounce } from '../../utils/utils';
import { vAppObserveDimensions } from '../observe-dimensions/observe-dimensions.directive';
import { Ruler } from '../ruler/ruler-service';
import AppAnimSlideshow from './AppAnimSlideshow.vue';
import {
	ImgSlideshow,
	sheetShockRectBL,
	sheetShockRectTR,
	sheetShockSquare,
} from './slideshow/sheets';

type ShockAnimation = 'square' | 'wide-rect' | 'adaptive';

const props = defineProps({
	shockAnim: {
		type: String as PropType<ShockAnimation>,
		default: 'adaptive',
	},
	disabled: {
		type: Boolean,
	},
	ignoreAssetPadding: {
		type: Boolean,
	},
});

const { shockAnim, disabled, ignoreAssetPadding } = toRefs(props);

const _squareSheet = sheetShockSquare;
const _rectSheets = [sheetShockRectBL, sheetShockRectTR];

const root = ref<HTMLDivElement>();

const size = ref({ width: 200, height: 200 });

const chosenAsset = computed(() => {
	if (disabled.value) {
		return null;
	}

	const square = [_squareSheet];
	const wideRect = _rectSheets;

	switch (shockAnim.value) {
		case 'adaptive': {
			const { width, height } = size.value;
			if (width / 2 < height) {
				return square;
			}

			return wideRect;
		}

		case 'square':
			return square;

		case 'wide-rect':
			return wideRect;
	}
});

onMounted(() => {
	onDimensionsChanged();
});

function onDimensionsChanged() {
	if (!root.value) {
		return;
	}
	const { width, height } = Ruler.offset(root.value);
	size.value = { width, height };
}

function getStyleForAsset(sheet: ImgSlideshow): CSSProperties {
	const { width, height } = size.value;
	const { frameAspectRatio } = sheet;

	const isBL = sheet === sheetShockRectBL;
	const isTR = sheet === sheetShockRectTR;

	if (!isBL && !isTR) {
		// Square asset has roughly 25% padding between the asset and the visual
		// "edge" of the electricity.
		const inset = ignoreAssetPadding.value ? 0 : '-25%';
		return {
			left: inset,
			top: inset,
			right: inset,
			bottom: inset,
		};
	}

	// Trying to offset the animation asset so it aligns with the edge of the
	// actual widget we're overlaying.
	const extraVertical = ignoreAssetPadding.value ? 0 : 0.4;
	const extraHorizontal = ignoreAssetPadding.value ? 0 : 0.115;

	let offsetY = `${extraVertical * 100}%`;
	let offsetX = `${extraHorizontal * 100}%`;
	let pos: CSSProperties;

	if (isBL) {
		offsetX = `-${offsetX}`;
		pos = { bottom: 0, left: 0 };
	} else {
		offsetY = `-${offsetY}`;
		pos = { top: 0, right: 0 };
	}

	const offset: CSSProperties = ignoreAssetPadding.value
		? {}
		: {
				transform: `translate3d(${offsetX}, ${offsetY}, 0)`,
		  };

	return {
		...pos,
		width: `calc(min(100%, ${height}px * ${frameAspectRatio}))`,
		height: `calc(min(100%, ${width}px / ${frameAspectRatio}))`,
		...offset,
	};
}

const debounceDimensionsChanged = debounce(onDimensionsChanged, 500);
</script>

<template>
	<div ref="root" v-app-observe-dimensions="debounceDimensionsChanged" class="anim-electricity">
		<slot />

		<template v-if="chosenAsset">
			<div
				v-for="(sheet, index) of chosenAsset"
				:key="sheet.asset + `-${index}`"
				:style="getStyleForAsset(sheet)"
				class="-overlay"
			>
				<AppAnimSlideshow :sheet="sheet" />
			</div>
		</template>
	</div>
</template>

<style lang="stylus" scoped>
.anim-electricity
	position: relative

.-overlay
	position: absolute
	z-index: 1
	pointer-events: none
</style>
