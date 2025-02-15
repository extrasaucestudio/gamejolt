<script lang="ts" setup>
import AppPostCard from '../../../../../_common/fireside/post/card/AppPostCard.vue';
import { FiresidePost } from '../../../../../_common/fireside/post/post-model';
import { Screen } from '../../../../../_common/screen/screen-service';
import { PropType, computed, toRefs, ref } from 'vue';
import { Api } from '../../../../../_common/api/api.service';
import { useRoute } from 'vue-router';
import { HistoryCache } from '../../../../../_common/history/cache/cache.service';
import AppSpacer from '../../../../../_common/spacer/AppSpacer.vue';

const props = defineProps({
	post: {
		type: Object as PropType<FiresidePost>,
		required: true,
	},
});

const { post } = toRefs(props);
const route = useRoute();

const cacheKey = `post-recommendations-${post.value.id}`;

const payload =
	HistoryCache.get(route, cacheKey) ??
	(await Api.sendRequest(`/web/posts/recommendations/${post.value.id}`, undefined, {
		detach: true,
	}));

HistoryCache.store(route, payload, cacheKey);

const posts = ref(FiresidePost.populate<FiresidePost>(payload.posts));

const usablePosts = computed(() => {
	if (Screen.isSm) {
		return posts.value.slice(0, 8);
	}

	return posts.value;
});
</script>

<template>
	<template v-for="recommendedPost of usablePosts" :key="recommendedPost.id">
		<div class="-post">
			<AppPostCard :post="recommendedPost" with-user source="postRecommendation" />
		</div>

		<AppSpacer v-if="Screen.isXs" horizontal :scale="4" />
	</template>
</template>

<style lang="stylus" scoped>
@media $media-xs
	.-post
		min-width: 40vw
</style>
