<script lang="ts" setup>
import { computed, onMounted, onUnmounted, PropType, ref, useSlots } from 'vue';
import { useRouter } from 'vue-router';
import { Backdrop, BackdropController } from '../backdrop/backdrop.service';
import { EscapeStack, EscapeStackCallback } from '../escape-stack/escape-stack.service';
import { Screen } from '../screen/screen-service';
import AppScrollAffix from '../scroll/AppScrollAffix.vue';
import AppScrollScroller, { createScroller } from '../scroll/AppScrollScroller.vue';
import { useStickerStore } from '../sticker/sticker-store';
import AppTheme from '../theme/AppTheme.vue';
import { Theme } from '../theme/theme.model';
import { ModalDismissReason, Modals, useModal } from './modal.service';

export interface AppModalInterface {
	scrollTo: (offsetY: number) => void;
}

defineProps({
	theme: {
		type: Object as PropType<Theme>,
		default: undefined,
	},
});

const emit = defineEmits({
	close: () => true,
});

defineExpose<AppModalInterface>({
	scrollTo,
});

const slots = useSlots();
const router = useRouter();
const modal = useModal()!;
const stickerStore = useStickerStore();
const scroller = createScroller();

const root = ref<HTMLElement>();
const isHoveringContent = ref(false);

let _backdrop: BackdropController | undefined;
let _beforeEachDeregister: (() => void) | undefined;
let _escapeCallback: EscapeStackCallback | undefined;

const zIndex = computed(() => 1050 + modal.index);
const hasFooter = computed(() => !!slots.footer);

onMounted(() => {
	if (!modal.noBackdrop) {
		_backdrop = Backdrop.push({
			context: root.value!,
			className: 'modal-backdrop',
		});
	}

	_beforeEachDeregister = router.beforeEach((_to, _from, next) => {
		_dismissRouteChange();
		next();
	});

	_escapeCallback = () => dismissEsc();
	EscapeStack.register(_escapeCallback);
});

onUnmounted(() => {
	// Make sure we clear the reference to it.
	if (_backdrop) {
		_backdrop.remove();
		_backdrop = undefined;
	}

	if (_beforeEachDeregister) {
		_beforeEachDeregister();
		_beforeEachDeregister = undefined;
	}

	if (_escapeCallback) {
		EscapeStack.deregister(_escapeCallback);
		_escapeCallback = undefined;
	}
});

function _dismissRouteChange() {
	dismiss('route-change');
}

function dismissEsc() {
	if (modal.noEscClose) {
		return;
	}

	dismiss('esc');
}

function dismissBackdrop() {
	if (
		Screen.isMobile ||
		modal.noBackdropClose ||
		isHoveringContent.value ||
		stickerStore.isDrawerOpen.value
	) {
		return;
	}
	dismiss('backdrop');
}

function dismiss(reason: ModalDismissReason) {
	emit('close');
	modal.dismiss(reason);
}

function scrollTo(offsetY: number) {
	scroller.scrollTo(offsetY);
}
</script>

<template>
	<div
		ref="root"
		class="-container"
		role="dialog"
		tabindex="-1"
		:style="{
			zIndex,
		}"
		@click="dismissBackdrop"
	>
		<AppScrollScroller
			:controller="scroller"
			class="modal"
			:class="{
				'modal-xs': modal.size === 'xs',
				'modal-sm': modal.size === 'sm',
				'modal-lg': modal.size === 'lg',
				'modal-full': modal.size === 'full',
			}"
		>
			<component
				:is="Modals.modalBodyWrapper || 'div'"
				v-bind="Modals.modalBodyWrapper ? { modal } : {}"
				class="modal-layer"
			>
				<AppTheme
					class="modal-content"
					:theme="theme"
					@mouseover="isHoveringContent = true"
					@mouseout="isHoveringContent = false"
				>
					<slot />

					<AppScrollAffix v-if="hasFooter" anchor="bottom" :padding="0">
						<div class="-footer fill-offset">
							<slot name="footer" />
						</div>
					</AppScrollAffix>
				</AppTheme>
			</component>
		</AppScrollScroller>
	</div>
</template>

<style lang="stylus" scoped>
-fullscreen()
	top: 0
	right: 0
	bottom: 0
	left: 0

.-container
	-fullscreen()
	position: fixed
	overflow: hidden
	-webkit-overflow-scrolling: touch

	::v-deep(.backdrop)
		z-index: 1

// Container that the modal scrolls within
.modal
	-fullscreen()
	position: absolute
	z-index: 2

.modal-layer
	position: relative
	min-height: 100vh

	@media $media-sm-up
		padding: 30px 0
		padding-top: 100px

.modal-content
	change-bg('bg')
	theme-prop('color', 'fg')
	elevate-3()
	position: relative
	background-clip: padding-box
	outline: 0 // Remove focus outline from opened modal

	// Full screen on xs
	@media $media-xs
		min-height: 100vh

	@media $media-sm-up
		rounded-corners-lg()
		margin: 0 auto

.modal-xs
	.modal-layer
		display: flex
		align-items: center
		justify-content: center

	.modal-content
		rounded-corners-lg()
		width: calc(100% - 32px)
		max-width: 360px
		min-height: auto !important

@media $media-sm-up
	.modal-sm
		.modal-content
			width: 600px

@media $media-md-up
	.modal-content
		width: $container-md

.modal-full
	change-bg('bg')

	.modal-layer
		padding: 0

	.modal-content
		-fullscreen()
		elevate-0()
		position: absolute
		width: auto
		border-radius: 0
		background-color: transparent

.-footer
	padding: $modal-padding-xs
	padding-bottom: 0
	border-bottom-left-radius: $border-radius-large
	border-bottom-right-radius: $border-radius-large

	@media $media-sm-up
		padding: $modal-padding
		padding-bottom: 0

::v-deep(.gj-scroll-affixed)
	z-index: 1

	.-footer
		border-radius: 0
		box-shadow: 0 -5px 10px rgba(0, 0, 0, 0.1)
</style>

<!-- Global styling needed for child content. -->
<style lang="stylus">
.modal-header
	padding: $modal-padding-xs
	padding-bottom: 0
	min-height: ($modal-title-padding + $modal-title-line-height)

.modal-controls
	clearfix()
	padding-right: ($grid-gutter-width-xs / 2)
	text-align: right

	.button
		border-top: 0 !important
		border-top-left-radius: 0 !important
		border-top-right-radius: 0 !important

// Title text within header
.modal-title
	margin-top: 0

.modal-body
	position: relative
	padding: $modal-padding-xs

.modal-footer
	clearfix() // clear it in case folks use .pull-* classes on buttons
	padding: $modal-padding-xs
	padding-top: 0
	text-align: center

	@media $media-sm-up
		text-align: right

@media $media-sm-up
	.modal-header
		padding: $modal-padding
		padding-bottom: 0

	.modal-controls
		padding-right: ($grid-gutter-width / 2)

	.modal-body
		padding: $modal-padding

	.modal-footer
		padding: $modal-padding
		padding-top: 0
</style>
