<script lang="ts">
import { computed, nextTick, onMounted, PropType, ref, toRefs, useSlots, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { PostOpenSource, trackPostOpen } from '../../../analytics/analytics.service';
import AppFadeCollapse from '../../../AppFadeCollapse.vue';
import AppBackground from '../../../background/AppBackground.vue';
import { ContentFocus } from '../../../content-focus/content-focus.service';
import AppContentViewer from '../../../content/content-viewer/content-viewer.vue';
import { Environment } from '../../../environment/environment.service';
import { formatFuzzynumber } from '../../../filters/fuzzynumber';
import AppImgResponsive from '../../../img/AppImgResponsive.vue';
import AppJolticon from '../../../jolticon/AppJolticon.vue';
import AppMediaItemBackdrop from '../../../media-item/backdrop/AppMediaItemBackdrop.vue';
import { MediaItem } from '../../../media-item/media-item-model';
import AppResponsiveDimensions from '../../../responsive-dimensions/AppResponsiveDimensions.vue';
import { Screen } from '../../../screen/screen-service';
import AppScrollInview, { ScrollInviewConfig } from '../../../scroll/inview/AppScrollInview.vue';
import AppUserAvatar from '../../../user/user-avatar/user-avatar.vue';
import {
	createVideoPlayerController,
	getVideoPlayerFromSources,
	VideoPlayerController,
	VideoPlayerControllerContext,
} from '../../../video/player/controller';
import AppVideo from '../../../video/video.vue';
import { FiresidePost } from '../post-model';

export const AppPostCardAspectRatio = 10 / 16;

const InviewConfig = new ScrollInviewConfig({ margin: `${Screen.height}px` });
</script>

<script lang="ts" setup>
const props = defineProps({
	post: {
		type: Object as PropType<FiresidePost>,
		required: true,
	},
	source: {
		type: String as PropType<PostOpenSource>,
		required: true,
	},
	videoContext: {
		type: String as PropType<VideoPlayerControllerContext>,
		default: undefined,
	},
	withUser: {
		type: Boolean,
	},
});

const { post, source, videoContext, withUser } = toRefs(props);
const slots = useSlots();

const root = ref<HTMLElement>();
const message = ref<HTMLElement | undefined>();
const cardElem = ref<HTMLElement>();

const videoController = ref<VideoPlayerController>();

const isImageThinner = ref(false);
const isVideoThinner = ref(false);

const cardWidth = ref('100%');
const cardHeight = ref('100%');
const imageWidth = ref('100%');
const imageHeight = ref('100%');
const videoWidth = ref('100%');
const videoHeight = ref('100%');
const leadHeight = ref(0);

const isBootstrapped = ref(import.meta.env.SSR);
const isHydrated = ref(import.meta.env.SSR);

const hasOverlayContent = computed(() => !!slots.overlay);
const shouldPlayVideo = computed(() => isHydrated.value && ContentFocus.hasFocus);

onMounted(() => calcData());

watch(shouldPlayVideo, _initVideoController);

const mediaItem = computed(() => {
	if (post.value?.hasMedia) {
		return post.value.media[0];
	} else if (post.value?.hasVideo) {
		return post.value.videos[0].posterMediaItem;
	}
	return undefined;
});

const video = computed(() => {
	if (!post.value?.hasVideo) {
		return undefined;
	}

	return post.value?.videos[0].media.find(i => i.type == MediaItem.TYPE_TRANSCODED_VIDEO_CARD);
});

const background = computed(() => post.value.background);
const overlay = computed(() => !!background.value || !!mediaItem.value);

const votedOnPoll = computed(() => {
	const poll = post.value?.poll;
	for (let i = 0; i < (poll?.items.length ?? 0); i++) {
		if (poll?.items[i].is_voted) {
			return true;
		}
	}
	return false;
});

const likedPost = computed(() => {
	if (post.value?.user_like) {
		return true;
	}
	return false;
});

const userLink = computed(() => Environment.wttfBaseUrl + post.value?.user.url);

async function calcData() {
	// Safari browsers don't always get the right initial dimensions if we don't do
	await nextTick();

	if (!root.value) {
		return;
	}

	const newCardWidth = root.value.offsetWidth;
	const newCardHeight = root.value.offsetHeight ?? newCardWidth / AppPostCardAspectRatio;
	const cardRatio = newCardWidth / newCardHeight;

	cardWidth.value = newCardWidth + 'px';
	cardHeight.value = newCardHeight + 'px';

	let messageHeight = message.value?.offsetHeight;
	if (messageHeight && overlay.value) {
		messageHeight -= 16;
	}

	// Add in some space for the details on the bottom.
	leadHeight.value = messageHeight ?? newCardHeight - 40;

	const media = mediaItem.value;
	if (!media) {
		return;
	}

	const mediaWidth = media.croppedWidth;
	const mediaHeight = media.croppedHeight;
	const mediaRatio = mediaWidth / mediaHeight;
	isImageThinner.value = mediaRatio < cardRatio;

	if (video.value) {
		const videoWidth = video.value.croppedWidth;
		const videoHeight = video.value.croppedHeight;
		const videoRatio = videoWidth / videoHeight;

		isVideoThinner.value = videoRatio < cardRatio;
	}

	const posterRatio = media.croppedWidth / media.croppedHeight;
	const videoRatio = video.value
		? video.value.croppedWidth / video.value.croppedHeight
		: posterRatio;

	let width;
	let height;

	let newVideoWidth;
	let newVideoHeight;

	if (isImageThinner.value) {
		width = newCardWidth;
		height = width / posterRatio;
	} else {
		height = newCardHeight;
		width = height * posterRatio;
	}

	if (isVideoThinner.value) {
		newVideoWidth = newCardWidth;
		newVideoHeight = newVideoWidth / videoRatio;
	} else {
		newVideoHeight = newCardHeight;
		newVideoWidth = newVideoHeight * videoRatio;
	}

	imageWidth.value = width + 'px';
	imageHeight.value = height + 'px';
	videoWidth.value = newVideoWidth + 'px';
	videoHeight.value = newVideoHeight + 'px';
}

function inView() {
	isBootstrapped.value = true;
	isHydrated.value = true;
}

function outView() {
	isHydrated.value = false;
}

function _initVideoController() {
	if (!videoContext?.value || videoController.value) {
		return;
	}

	if (post.value?.hasVideo && post.value.videos[0].postCardVideo) {
		videoController.value = createVideoPlayerController(
			post.value.videos[0].postCardVideo,
			videoContext.value
		);

		videoController.value.volume = 0;
		videoController.value.muted = true;
	} else if (mediaItem.value?.is_animated) {
		const sourcesPayload = {
			mp4: mediaItem.value.mediaserver_url_mp4,
			webm: mediaItem.value.mediaserver_url_webm,
		};

		videoController.value = getVideoPlayerFromSources(sourcesPayload, 'gif');
	}
}
</script>

<template>
	<div v-if="post" ref="root" class="post-card">
		<AppResponsiveDimensions :ratio="AppPostCardAspectRatio" @change="calcData()">
			<AppScrollInview
				:config="InviewConfig"
				:style="{
					width: cardWidth,
					height: cardHeight,
					'padding-top': GJ_IS_SSR ? (1 / AppPostCardAspectRatio) * 100 + '%' : null,
				}"
				@inview="inView"
				@outview="outView"
			>
				<div v-if="hasOverlayContent" class="-overlay">
					<slot name="overlay" />
				</div>

				<AppBackground
					ref="cardElem"
					class="-background"
					:class="{ '-blur': hasOverlayContent }"
					:background="background"
				>
					<template v-if="!!mediaItem">
						<div class="-inner-media">
							<AppMediaItemBackdrop class="-backdrop" :media-item="mediaItem">
								<AppImgResponsive
									class="-img"
									:src="mediaItem.mediaserver_url"
									alt=""
									:style="{
										width: imageWidth,
										height: imageHeight,
									}"
								/>
							</AppMediaItemBackdrop>

							<template v-if="videoController && isHydrated">
								<AppVideo
									class="-video"
									:player="videoController"
									:should-play="shouldPlayVideo"
									allow-degraded-autoplay
									:style="{
										width: videoWidth,
										height: videoHeight,
									}"
								/>
							</template>
						</div>
						<div v-if="!!mediaItem" class="-inner-gradient" />
					</template>

					<template v-else>
						<div v-if="!!background" class="-inner-gradient" />
						<div ref="message" class="-inner-message">
							<div :class="{ '-overlay-message': overlay }">
								<AppFadeCollapse
									:collapse-height="leadHeight"
									ignore-threshold
									as-mask
								>
									<AppContentViewer :source="post.lead_content" />
								</AppFadeCollapse>
							</div>
						</div>
					</template>

					<div class="-details" :class="{ '-light': overlay }">
						<template v-if="withUser">
							<AppUserAvatar class="-details-user-avatar" :user="post.user" />
							<a class="-details-user-name" :href="userLink">
								@{{ post.user.username }}
							</a>
						</template>

						<span class="-details-spacer" />

						<template v-if="post.scheduled_for">
							<AppJolticon icon="calendar" />
						</template>

						<template v-if="post.hasPoll">
							<AppJolticon
								:class="{ '-voted': votedOnPoll }"
								icon="pedestals-numbers"
							/>
						</template>

						<template v-if="post.is_pinned">
							<AppJolticon icon="thumbtack" />
						</template>

						<AppJolticon icon="heart-filled" :class="{ '-liked': likedPost }" />
						<span class="-details-likes">
							{{ formatFuzzynumber(post.like_count) }}
						</span>
					</div>

					<RouterLink
						class="-link"
						:to="post.routeLocation"
						@click="trackPostOpen({ source })"
					/>
				</AppBackground>
			</AppScrollInview>
		</AppResponsiveDimensions>
	</div>
</template>

<style lang="stylus" scoped>
@import './common'

$-base-width = 200px
$-padding = 8px

.post-card
	cursor: pointer

	&:hover
		elevate-2()

.-link
	rounded-corners-lg()
	position: absolute
	left: 0
	top: 0
	right: 0
	bottom: 0
	z-index: 1

.-overlay
	position: absolute
	top: 0
	right: 0
	bottom: 0
	left: 0
	background-color: rgba(black, 0.5)
	z-index: 2

.-blur
	filter: blur(4px)

.-background
	width: 100%
	height: 100%
	position: relative

.-inner
	&
	&-media
		position: absolute
		left: 0
		top: 0
		right: 0
		bottom: 0

	&-media
		display: grid
		justify-content: center

	&-gradient
		position: absolute
		top: 0
		left: 0
		right: 0
		bottom: 0
		background: linear-gradient(to top, rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0), rgba(0, 0, 0, 0))

	&-message
		position: absolute
		left: $-padding
		top: $-padding
		right: $-padding
		bottom: ($-padding * 2) + 20

		::v-deep(.fireside-post-lead-content)
			font-size: ceil($font-size-small * 1.1)

.-overlay-message
	change-bg('bg')
	elevate-1()
	border-radius: 8px
	padding: $-padding
	max-height: 100%


	::v-deep(.fireside-post-lead-content)
		color: var(--theme-fg)
		font-size: $font-size-small

.-light
	&
	> *
		color: var(--theme-white) !important
		text-shadow: black 1px 1px 4px

.-voted
.-liked
	color: $gj-overlay-notice !important

.-details
	position: absolute
	left: $-padding
	bottom: $-padding
	right: $-padding
	display: flex
	font-size: 13px
	font-weight: bold

	> *
		color: var(--theme-fg)

		&:not(&:last-child)
			margin-right: $-padding * 0.5

	> .jolticon
		justify-self: flex-end

	> .jolticon
	&-user-avatar
		flex: none
		width: 20px
		height: 20px

	&-user-name
		overflow: hidden
		text-overflow: ellipsis
		padding-right: $-padding * 0.5m
		margin-right: 0 !important
		white-space: nowrap

	&-spacer
		flex: auto

.-backdrop
	position: absolute
	top: 0
	left: 0
	right: 0
	bottom: 0
	display: flex
	align-items: center
	justify-content: center

.-img
	max-width: unset
	object-fit: cover

.-video
	display: flex
	justify-content: center
	align-items: center

	::v-deep(> video)
		height: 100% !important
		width: 100% !important
</style>
