<script lang="ts">
const FiresideThemeKey = 'fireside';

export default {
	...defineAppRouteOptions({
		deps: { params: ['hash'] },
		lazy: true,
		resolver: async ({ route }) =>
			Api.sendRequest(`/web/fireside/fetch/${route.params.hash}?meta=1`),
	}),
};
</script>

<script lang="ts" setup>
import { computed, customRef, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { debounce } from '../../../utils/utils';
import AppAnimSlideshow from '../../../_common/animation/AppAnimSlideshow.vue';
import { sheetFireplace } from '../../../_common/animation/slideshow/sheets';
import { Api } from '../../../_common/api/api.service';
import AppAuthJoin from '../../../_common/auth/join/join.vue';
import AppBackground from '../../../_common/background/AppBackground.vue';
import AppButton from '../../../_common/button/AppButton.vue';
import { Fireside } from '../../../_common/fireside/fireside.model';
import AppIllustration from '../../../_common/illustration/AppIllustration.vue';
import AppJolticon from '../../../_common/jolticon/AppJolticon.vue';
import AppLoading from '../../../_common/loading/AppLoading.vue';
import { Meta } from '../../../_common/meta/meta-service';
import AppMobileAppButtons from '../../../_common/mobile-app/AppMobileAppButtons.vue';
import { vAppObserveDimensions } from '../../../_common/observe-dimensions/observe-dimensions.directive';
import AppPopper from '../../../_common/popper/AppPopper.vue';
import { Popper } from '../../../_common/popper/popper.service';
import { createAppRoute, defineAppRouteOptions } from '../../../_common/route/route-component';
import { Ruler } from '../../../_common/ruler/ruler-service';
import { Screen } from '../../../_common/screen/screen-service';
import AppSpacer from '../../../_common/spacer/AppSpacer.vue';
import AppStickerLayer from '../../../_common/sticker/layer/AppStickerLayer.vue';
import { useStickerStore } from '../../../_common/sticker/sticker-store';
import AppStickerTarget from '../../../_common/sticker/target/AppStickerTarget.vue';
import { useCommonStore } from '../../../_common/store/common-store';
import { useThemeStore } from '../../../_common/theme/theme.store';
import AppTranslate from '../../../_common/translate/AppTranslate.vue';
import { $gettext } from '../../../_common/translate/translate.service';
import { useChatStore } from '../../components/chat/chat-store';
import AppFiresideProvider from '../../components/fireside/AppFiresideProvider.vue';
import {
	createFiresideController,
	FiresideController,
	FiresideSidebar,
	toggleStreamVideoStats,
} from '../../components/fireside/controller/controller';
import {
	illEndOfFeed,
	illMaintenance,
	illMobileKikkerstein,
	illNoCommentsSmall,
} from '../../img/ill/illustrations';
import { useAppStore } from '../../store';
import AppFiresideHeader from './AppFiresideHeader.vue';
import AppFiresideStats from './AppFiresideStats.vue';
import AppFiresideBottomBar from './_bottom-bar/AppFiresideBottomBar.vue';
import AppFiresideSidebarChat from './_sidebar/AppFiresideSidebarChat.vue';
import AppFiresideSidebarFiresideSettings from './_sidebar/AppFiresideSidebarFiresideSettings.vue';
import AppFiresideSidebarHeading from './_sidebar/AppFiresideSidebarHeading.vue';
import AppFiresideSidebarHosts from './_sidebar/AppFiresideSidebarHosts.vue';
import AppFiresideSidebarMembers from './_sidebar/AppFiresideSidebarMembers.vue';
import AppFiresideSidebarStreamSettings from './_sidebar/AppFiresideSidebarStreamSettings.vue';
import AppFiresideStream from './_stream/AppFiresideStream.vue';

const appStore = useAppStore();
const commonStore = useCommonStore();
const stickerStore = useStickerStore();
const chatStore = useChatStore()!;
const themeStore = useThemeStore();

const router = useRouter();

const c = shallowRef<FiresideController | null>(null);

let beforeEachDeregister: (() => void) | null = null;

const root = ref<HTMLDivElement>();
const videoContainer = ref<HTMLDivElement>();

const videoWidth = ref(0);
const videoHeight = ref(0);

const fireside = computed(() => c.value?.fireside || payloadFireside.value);
const payloadFireside = ref<Fireside>();

const isFullscreen = computed(() => c.value?.isFullscreen.value === true);
const isShowingStreamOverlay = computed(() => c.value?.isShowingStreamOverlay.value === true);
const popperTeleportId = computed(() => c.value?.popperTeleportId.value);

const routeTitle = computed(() => {
	if (!fireside.value) {
		return $gettext(`Loading Fireside...`);
	}

	return fireside.value.title + ' - Fireside';
});

const cannotViewReason = computed(() => {
	if (!isBootstrapped.value || Screen.isDesktop) {
		return undefined;
	}

	return c.value ? 'needs-resize' : 'get-app';
});

const routeStatus = computed(() => c.value?.status.value);
const background = computed(() => c.value?.chatRoom.value?.background);
const overlayText = computed(() => !!background.value || isFullscreen.value);

const sidebar = customRef<FiresideSidebar>((track, trigger) => ({
	get: () => {
		track();
		return c.value?.sidebar.value || 'chat';
	},
	set: val => {
		if (!c.value || c.value.sidebar.value === val) {
			return;
		}
		c.value.sidebar.value = val;
		trigger();
	},
}));

const collapseSidebar = customRef<boolean>((track, trigger) => ({
	get: () => {
		track();
		return c.value?.collapseSidebar.value === true;
	},
	set: val => {
		if (!c.value || c.value.collapseSidebar.value === val) {
			return;
		}
		c.value.collapseSidebar.value = val;
		trigger();
	},
}));

const videoFillColor = computed(() =>
	!background.value && isFullscreen.value ? 'black' : undefined
);
const focusedUserVideoAspectRatio = computed(
	() => c.value?.rtc.value?.focusedUser?.videoAspectRatio
);

const chatWidth = computed(() => {
	if (isFullscreen.value && collapseSidebar.value) {
		return 200;
	}
	return 350;
});

// If the fireside's status ever changes to setup-failed, we want to direct to a
// 404 page.
watch(routeStatus, status => {
	if (status === 'setup-failed') {
		commonStore.setError(404);
	}
});

watch(
	() => [payloadFireside.value, Screen.isMobile],
	() => {
		if (c.value || Screen.isMobile || !payloadFireside.value) {
			return;
		}

		c.value ??= createFiresideController(payloadFireside.value, {
			appStore,
			commonStore,
			stickerStore,
			chatStore,
			router,
		});

		c.value.setFullscreenableElement(root);
	}
);

const { isBootstrapped } = createAppRoute({
	routeTitle,
	onResolved({ payload }) {
		Meta.description = payload.metaDescription;
		Meta.fb = payload.fb || {};
		Meta.fb.title = routeTitle.value;
		Meta.twitter = payload.twitter || {};
		Meta.twitter.title = routeTitle.value;

		payloadFireside.value = new Fireside(payload.fireside);

		setPageTheme();
	},
	onDestroyed() {
		c.value?.cleanup();
		themeStore.clearPageTheme(FiresideThemeKey);

		beforeEachDeregister?.();
		beforeEachDeregister = null;
	},
});

function onDimensionsChange() {
	if (!videoContainer.value) {
		return;
	}

	const rtc = c.value?.rtc.value;
	const focusedUser = rtc?.focusedUser;
	if (!rtc) {
		return;
	}

	const { width, height } = Ruler.offset(videoContainer.value);
	const containerRatio = width / height;

	let receiveRatio = focusedUser?.videoAspectRatio || 16 / 9;

	const minRatio = 0.5;
	const maxRatio = 2;
	receiveRatio = Math.max(minRatio, Math.min(maxRatio, receiveRatio));

	// If the video is wider than the containing element...
	if (receiveRatio > containerRatio) {
		videoWidth.value = width;
		videoHeight.value = width / receiveRatio;
	} else if (receiveRatio < containerRatio) {
		videoHeight.value = height;
		videoWidth.value = height * receiveRatio;
	} else {
		videoWidth.value = width;
		videoHeight.value = height;
	}
}

const debounceDimensionsChange = debounce(onDimensionsChange, 500);

function setPageTheme() {
	const theme = fireside.value?.user?.theme ?? null;
	themeStore.setPageTheme({ key: FiresideThemeKey, theme });
}

function toggleVideoStats() {
	if (c.value) {
		toggleStreamVideoStats(c.value);
		Popper.hideAll();
	}
}

function onClickRetry() {
	c.value?.retry();
}

watch(() => c.value?.isPersonallyStreaming.value, onIsPersonallyStreamingChanged);

watch(focusedUserVideoAspectRatio, onDimensionsChange);

watch(
	() => c.value?.rtc.value?.focusedUser?.userModel?.id,
	() => {
		const { stickers, newStickers } = c.value?.stickerTargetController ?? {};
		// Clear any current live stickers when changing the focused user.
		stickers?.value.splice(0, stickers.value.length);
		newStickers?.value.splice(0, newStickers.value.length);
	}
);

onBeforeUnmount(() => {
	c.value?.toggleFullscreen(false);
});

function onIsPersonallyStreamingChanged() {
	if (import.meta.env.SSR) {
		return;
	}

	if (!c.value || c.value.isPersonallyStreaming.value) {
		beforeEachDeregister ??= router.beforeEach((_to, _from, next) => {
			if (
				!window.confirm(
					$gettext(
						`You are currently streaming to a fireside. If you leave this page, you will stop streaming. Are you sure you want to leave?`
					)
				)
			) {
				return next(false);
			}
			next();
		});
	} else {
		beforeEachDeregister?.();
		beforeEachDeregister = null;
	}
}
</script>

<template>
	<div
		:id="popperTeleportId"
		ref="root"
		class="route-fireside"
		:class="{ '-video-square': isFullscreen }"
		:style="`--fireside-chat-width: ${chatWidth}px`"
	>
		<AppStickerLayer
			:style="{
				width: '100%',
				height: '100%',
			}"
		>
			<AppBackground
				class="-fill"
				:background="background"
				darken
				:fade-opacity="isFullscreen ? 0.85 : undefined"
			>
				<div class="-fireside">
					<div class="-body">
						<AppFiresideHeader
							v-if="fireside && !isFullscreen"
							class="-fireside-header"
							:class="{ '-overlay': overlayText }"
							:fireside="fireside"
							:sticker-target-controller="c?.stickerTargetController"
							:overlay="overlayText"
						/>

						<template v-if="cannotViewReason === 'get-app'">
							<div class="-view-blocked">
								<AppIllustration :asset="illMobileKikkerstein" :max-width="90">
									<h2 class="-view-blocked-heading">
										<AppTranslate>
											We want you to have the best fireside experience
											possible!
										</AppTranslate>
									</h2>

									<AppSpacer vertical :scale="6" />

									<AppMobileAppButtons source="fireside" />

									<AppSpacer vertical :scale="6" />

									<AppTranslate>
										Download the mobile app to watch streams, follow your
										friends, and place stickers!
									</AppTranslate>

									<template v-if="Screen.isPointerMouse">
										<AppSpacer vertical :scale="4" />

										<AppTranslate>
											If you're on desktop, resize your window larger to watch
											this fireside.
										</AppTranslate>
									</template>
								</AppIllustration>
							</div>
						</template>
						<template v-if="cannotViewReason === 'needs-resize'">
							<div class="-view-blocked">
								<AppIllustration :asset="illNoCommentsSmall">
									<h2 class="-view-blocked-heading">
										<AppTranslate>
											This window size is unsupported
										</AppTranslate>
									</h2>

									<AppSpacer vertical :scale="4" />

									<AppTranslate>
										Please make your browser larger to be able to view this
										content.
									</AppTranslate>
								</AppIllustration>
							</div>
						</template>
						<AppFiresideProvider v-else-if="c" :controller="c">
							<template v-if="routeStatus === 'loading' || routeStatus === 'initial'">
								<div key="loading" class="-message-wrapper">
									<div class="-message">
										<AppIllustration :asset="illEndOfFeed">
											<AppLoading
												centered
												:label="$gettext(`Traveling to the fireside...`)"
											/>
										</AppIllustration>
									</div>
								</div>
							</template>
							<template v-else-if="routeStatus === 'unauthorized'">
								<div key="unauthorized" class="-message-wrapper">
									<div class="-message">
										<h2 class="section-header text-center">
											<AppTranslate>Join Game Jolt</AppTranslate>
										</h2>

										<div class="text-center">
											<p class="lead">
												<AppTranslate>
													Do you love games as much as we do?
												</AppTranslate>
											</p>
										</div>

										<hr class="underbar underbar-center" />
										<br />

										<AppAuthJoin />
									</div>
								</div>
							</template>
							<template v-else-if="routeStatus === 'expired'">
								<div key="expired" class="-message-wrapper">
									<div class="-message">
										<AppIllustration :asset="illNoCommentsSmall">
											<p>
												<AppTranslate>
													This fireside's fire has burned out.
												</AppTranslate>
											</p>
											<p>
												<RouterLink :to="{ name: 'home' }">
													<small>
														<AppTranslate>
															Everybody go home
														</AppTranslate>
													</small>
												</RouterLink>
											</p>
										</AppIllustration>
									</div>
								</div>
							</template>
							<template v-else-if="routeStatus === 'setup-failed'">
								<div key="setup-failed" class="-message-wrapper">
									<div class="-message">
										<AppIllustration :asset="illMaintenance">
											<p>
												<AppTranslate>
													Could not reach this fireside.
												</AppTranslate>
												<br />
												<AppTranslate>
													Maybe try finding it again?
												</AppTranslate>
											</p>
											&nbsp;
											<AppButton block @click="onClickRetry">
												<AppTranslate>Retry</AppTranslate>
											</AppButton>
											&nbsp;
										</AppIllustration>
									</div>
								</div>
							</template>
							<template v-else-if="routeStatus === 'disconnected'">
								<div key="disconnected" class="-message-wrapper">
									<div class="-message">
										<AppIllustration :asset="illNoCommentsSmall">
											<p>
												<AppTranslate>
													You have been disconnected from fireside
													services.
												</AppTranslate>
												<br />
												<br />
												<small>
													<AppTranslate>
														We are actively trying to reconnect you, but
														you can also try refreshing the page.
													</AppTranslate>
												</small>
											</p>
										</AppIllustration>
									</div>
								</div>
							</template>
							<template v-else-if="routeStatus === 'blocked'">
								<div key="blocked" class="-message-wrapper">
									<div class="-message">
										<div class="text-center">
											<AppJolticon icon="friend-remove-2" big notice />
										</div>
										<div class="text-center">
											<h3>
												<AppTranslate>
													You are blocked from joining this fireside
												</AppTranslate>
											</h3>
											<p>
												<router-link :to="{ name: 'home' }">
													<small>
														<AppTranslate>Return home</AppTranslate>
													</small>
												</router-link>
											</p>
										</div>
									</div>
								</div>
							</template>
							<div v-else class="-video-wrapper">
								<div class="-video-padding">
									<div
										v-if="
											c.isStreaming.value &&
											c.chatRoom.value &&
											c.rtc.value &&
											c.rtc.value.listableStreamingUsers.length > 0
										"
										ref="videoContainer"
										v-app-observe-dimensions="debounceDimensionsChange"
										class="-video-container"
										:class="{
											'-video-fullscreen': isFullscreen,
										}"
										:style="{
											backgroundColor: videoFillColor,
										}"
									>
										<div
											class="-video-inner"
											:style="{
												width: videoWidth + 'px',
												height: videoHeight + 'px',
											}"
										>
											<template v-if="c.rtc.value && c.rtc.value.focusedUser">
												<AppStickerTarget
													:key="c.rtc.value.focusedUser?.uid"
													class="-video-inner -abs-stretch"
													:controller="c.stickerTargetController"
												>
													<AppPopper trigger="right-click">
														<AppFiresideStream
															:rtc-user="c.rtc.value.focusedUser"
															:has-header="isFullscreen"
															:has-hosts="isFullscreen"
															:sidebar-collapsed="collapseSidebar"
														/>

														<template #popover>
															<div class="list-group">
																<a
																	class="list-group-item"
																	@click="toggleVideoStats()"
																>
																	<AppTranslate>
																		Toggle Video Stats
																	</AppTranslate>
																</a>
															</div>
														</template>
													</AppPopper>
												</AppStickerTarget>
											</template>
										</div>
									</div>
									<div v-else class="-video-container">
										<div
											class="-center-guide"
											:class="{
												'-overlay': overlayText,
												'-bold': overlayText,
											}"
										>
											<template v-if="c.canStream.value">
												<AppAnimSlideshow
													class="-fireplace"
													:sheet="sheetFireplace"
													:overlay="overlayText"
												/>

												<div>
													<div>Start streaming by going to</div>
													<a
														class="-center-guide-link"
														@click="sidebar = 'stream-settings'"
													>
														<span>
															Fireside settings > Stream settings
														</span>
													</a>
													<div>using the gear icons below.</div>
												</div>

												<div>
													<AppTranslate>
														Double check your audio and video source in
														the settings menu, and then click
													</AppTranslate>
													{{ ' ' }}
													<a
														class="-center-guide-link"
														@click="sidebar = 'stream-settings'"
													>
														<AppTranslate>
															Start streaming!
														</AppTranslate>
													</a>
												</div>
											</template>
											<AppAnimSlideshow
												v-else
												class="-fireplace"
												:sheet="sheetFireplace"
												:overlay="overlayText"
											/>

											<AppFiresideStats />
										</div>
									</div>
								</div>

								<div
									v-if="!isFullscreen"
									:style="{
										width: '100%',
										paddingRight: collapseSidebar
											? chatWidth + 'px'
											: undefined,
									}"
								>
									<div class="-bottom-bar-padding">
										<AppFiresideBottomBar :overlay="overlayText" />
									</div>
								</div>
							</div>
						</AppFiresideProvider>
					</div>

					<AppFiresideProvider v-if="!cannotViewReason && c" :controller="c">
						<div
							class="-trailing-shadow"
							:class="{ '-trailing-shadow-none': collapseSidebar }"
						>
							<div
								v-if="routeStatus === 'joined'"
								key="sidebar"
								class="-trailing"
								:class="{
									'-trailing-float': collapseSidebar,
									'-fade':
										isFullscreen && collapseSidebar && !isShowingStreamOverlay,
								}"
							>
								<AppFiresideSidebarHeading v-if="collapseSidebar" collapsed />
								<AppFiresideSidebarChat v-else-if="sidebar === 'chat'" />
								<AppFiresideSidebarMembers v-else-if="sidebar === 'members'" />
								<AppFiresideSidebarHosts v-else-if="sidebar === 'hosts'" />
								<AppFiresideSidebarFiresideSettings
									v-else-if="sidebar === 'fireside-settings'"
								/>
								<AppFiresideSidebarStreamSettings
									v-else-if="sidebar === 'stream-settings'"
								/>
							</div>
						</div>
					</AppFiresideProvider>
				</div>
			</AppBackground>
		</AppStickerLayer>
	</div>
</template>

<style lang="stylus" scoped>
$-center-guide-width = 400px

.route-fireside
	change-bg('bg-offset')
	height: calc(100vh - var(--shell-top) - var(--shell-bottom))
	--video-radius: 12px
	--fireside-chat-width: 350px

	&.-video-square
		--video-radius: 0px

.-view-blocked
	display: flex
	justify-content: center
	flex-direction: column
	align-items: center
	width: 100%
	height: 100%
	padding: 16px 32px 116px
	text-align: center

.-view-blocked-heading
	font-size: 21px
	margin: 0
	color: var(--theme-fg)

.-overlay
	*
		fireside-overlay-text-shadow()

		&:not(a)
			color: white

.-fill
	width: 100%
	height: 100%

.-video-fullscreen
	position: absolute !important
	top: 0
	right: 0
	bottom: 0
	left: 0
	z-index: 0
	padding: ($grid-gutter-width / 2)

.-abs-stretch
	top: 0
	right: 0
	bottom: 0
	left: 0

.-bold
	font-weight: bold

.-fireside
	width: 100%
	height: 100%
	overflow: hidden
	display: flex
	flex-direction: row

.-body
	flex: auto
	display: flex
	flex-direction: column
	width: 100%
	overflow: hidden

.-fireside-header
	flex: none
	width: 100%
	padding: 16px
	z-index: 2

.-trailing
	position: relative
	flex: none
	display: flex
	flex-direction: column
	overflow: visible !important
	width: var(--fireside-chat-width)
	height: 100%
	bottom: 0
	right: 0
	z-index: 2
	opacity: 3
	visibility: visible

	&.-fade
		opacity: 0
		visibility: hidden

.-trailing-float
	position: absolute
	bottom: 16px
	right: 16px
	height: unset
	padding-left: 16px

.-trailing-shadow
	elevate-2()
	transition: none !important

.-trailing-shadow-none
	elevate-0()

.-message-wrapper
	@extends .-abs-stretch
	change-bg('bg')
	position: absolute
	z-index: 1
	display: flex
	justify-content: center
	align-items: center
	padding-left: ($grid-gutter-width / 2)
	padding-right: ($grid-gutter-width / 2)

.-message
	rounded-corners-lg()
	elevate-2()
	change-bg('bg-offset')
	padding: 16px
	width: 100%
	max-width: 600px

.-video-wrapper
.-video-container
.-video-inner
	display: flex
	justify-content: center
	align-items: center

.-video-wrapper
	flex: 3 0
	flex-direction: column
	overflow: hidden

.-video-padding
	width: 100%
	height: 100%
	padding: 8px
	min-height: 0

.-video-container
	min-height: 0
	width: 100%
	height: 100%
	position: relative

.-video-inner
	elevate-2()
	border-radius: var(--video-radius)
	overflow: hidden
	position: absolute !important
	flex-direction: column
	background-color: var(--theme-bg-subtle)
	transition: width 200ms, height 200ms, border-radius 1s

.-center-guide
	display: flex
	flex-direction: column
	justify-content: center
	align-items: center
	gap: 40px
	width: 400px
	height: 100%
	text-align: center

.-center-guide-link
	font-weight: bold
	color: var(--theme-link)

.-fireplace
	width: 100%
	max-width: $-center-guide-width
	flex: 0 1 $-center-guide-width

.-bottom-bar-padding
	flex: none
	width: 100%
	padding-top: 8px
	max-width: 100%
	overflow: hidden
	display: inline-flex
	align-items: flex-start
	grid-gap: 16px

	.-hosts
		min-width: 0
		margin-left: auto
		margin-right: auto

	.-share
		margin-right: 8px
		flex: none

	> *
		margin-top: 0 !important
		margin-bottom: 0 !important
</style>
