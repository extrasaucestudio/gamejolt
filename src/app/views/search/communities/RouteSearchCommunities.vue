<script lang="ts">
import { getQuery } from '../../../../utils/router';
import AppCommunityCard from '../../../../_common/community/card/card.vue';
import { createAppRoute, defineAppRouteOptions } from '../../../../_common/route/route-component';
import { sendSearch } from '../../../components/search/search-service';
import { useSearchRouteController } from '../RouteSearch.vue';

export default {
	...defineAppRouteOptions({
		cache: true,
		resolver: ({ route }) =>
			sendSearch(getQuery(route, 'q') ?? '', {
				type: 'community',
				page: route.query.page ? parseInt(getQuery(route, 'page')!, 10) : 1,
			}),
	}),
};
</script>

<script lang="ts" setup>
const { processPayload, hasSearch, searchPayload } = useSearchRouteController()!;

createAppRoute({
	onResolved({ payload }) {
		processPayload({ payload });
	},
});
</script>

<template>
	<section class="section">
		<div v-if="hasSearch" class="container">
			<div class="row">
				<div
					v-for="community of searchPayload.communities"
					:key="community.id"
					class="col-sm-6 col-md-4 col-lg-3 anim-fade-in"
				>
					<AppCommunityCard :community="community" track-goto elevate />
				</div>
			</div>
		</div>
	</section>
</template>
