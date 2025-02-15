<script lang="ts">
import { computed, inject, InjectionKey, provide, ref } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { getQuery } from '../../../utils/router';
import AppExpand from '../../../_common/expand/AppExpand.vue';
import { formatNumber } from '../../../_common/filters/number';
import AppJolticon from '../../../_common/jolticon/AppJolticon.vue';
import { Meta } from '../../../_common/meta/meta-service';
import AppPagination from '../../../_common/pagination/pagination.vue';
import { createAppRoute, defineAppRouteOptions } from '../../../_common/route/route-component';
import { Screen } from '../../../_common/screen/screen-service';
import { Scroll } from '../../../_common/scroll/scroll.service';
import AppTranslate from '../../../_common/translate/AppTranslate.vue';
import { $gettext, $gettextInterpolate } from '../../../_common/translate/translate.service';
import AppPageHeader from '../../components/page-header/page-header.vue';
import AppSearch from '../../components/search/AppSearch.vue';
import { Search, SearchPayload } from '../../components/search/search-service';
import AppShellPageBackdrop from '../../components/shell/AppShellPageBackdrop.vue';

const Key: InjectionKey<Controller> = Symbol('search-route');

type Controller = ReturnType<typeof createController>;

export function useSearchRouteController() {
	return inject(Key);
}

function createController() {
	const route = useRoute();

	const isBootstrapped = ref(false);

	// We store our own version of the search query and sync back to it on
	// form submission.
	const query = ref(getQuery(route, 'q') ?? '');
	const searchPayload = ref(new SearchPayload('all', {}));

	const hasSearch = computed(() => !!query.value);

	function processPayload({ payload }: { payload: SearchPayload }) {
		const newQuery = getQuery(route, 'q') ?? '';
		query.value = '';

		if (!newQuery) {
			searchPayload.value = new SearchPayload('all', {});
			return;
		}

		// Search results should always be deindexed.
		Meta.seo.deindex();

		query.value = newQuery;
		searchPayload.value = payload;

		// We sync the query to the search service so that all places get
		// updated with the new query.
		Search.query = query.value;
		isBootstrapped.value = true;
	}

	return {
		query,
		searchPayload,
		hasSearch,
		processPayload,
		isBootstrapped,
	};
}

export default {
	...defineAppRouteOptions({}),
};
</script>

<script lang="ts" setup>
const route = useRoute();

const c = createController();
provide(Key, c);

const { isBootstrapped, hasSearch, query, searchPayload } = c;

createAppRoute({
	routeTitle: computed(() => {
		if (route.query.q) {
			return $gettextInterpolate(`Search results for %{ query }`, {
				query: getQuery(route, 'q') ?? '',
			});
		}
		return $gettext(`Search Game Jolt`);
	}),
});

const noResults = computed(() => {
	return (
		isBootstrapped.value &&
		hasSearch.value &&
		!searchPayload.value.gamesCount &&
		!searchPayload.value.usersCount &&
		!searchPayload.value.postsCount &&
		!searchPayload.value.communitiesCount &&
		!searchPayload.value.realm
	);
});
</script>

<template>
	<div>
		<AppPageHeader should-affix-nav :hide-nav="!hasSearch">
			<template v-if="Screen.isXs">
				<label>
					<AppTranslate>Enter your search</AppTranslate>
				</label>
				<!--
					If they click into a tag (which goes to search page), we
					don't want to autofocus the input since they're trying to
					see results. Only autofocus search on mobile if they haven't
					searched for anything yet.
				-->
				<AppSearch autocomplete-disabled :autofocus="!hasSearch" />
			</template>
			<template v-else>
				<template v-if="!hasSearch">
					<p class="text-center text-muted">
						<AppJolticon icon="chevron-up" />
						<AppTranslate>Enter your search query above.</AppTranslate>
						<AppJolticon icon="chevron-up" />
					</p>
				</template>
				<template v-else>
					<div class="small text-upper text-muted">
						<AppTranslate>Showing results for</AppTranslate>
					</div>

					<h2 class="sans-margin-top">
						{{ query }}
					</h2>

					<br />
				</template>
			</template>

			<template v-if="hasSearch" #nav>
				<nav class="platform-list inline">
					<ul>
						<li>
							<RouterLink
								:to="{ name: 'search.results', query: { q: query } }"
								exact-active-class="active"
							>
								<AppTranslate>All</AppTranslate>
							</RouterLink>
						</li>
						<li v-if="searchPayload.communitiesCount">
							<RouterLink
								:to="{ name: 'search.communities', query: { q: query } }"
								exact-active-class="active"
							>
								<AppTranslate>Communities</AppTranslate>
								<span class="badge">
									{{ formatNumber(searchPayload.communitiesCount) }}
								</span>
							</RouterLink>
						</li>
						<li v-if="searchPayload.usersCount">
							<RouterLink
								:to="{ name: 'search.users', query: { q: query } }"
								exact-active-class="active"
							>
								<AppTranslate>Users</AppTranslate>
								<span class="badge">
									{{ formatNumber(searchPayload.usersCount) }}
								</span>
							</RouterLink>
						</li>
						<li v-if="searchPayload.gamesCount">
							<RouterLink
								:to="{ name: 'search.games', query: { q: query } }"
								exact-active-class="active"
							>
								<AppTranslate>Games</AppTranslate>
								<span class="badge">
									{{ formatNumber(searchPayload.gamesCount) }}
								</span>
							</RouterLink>
						</li>
					</ul>
				</nav>
			</template>
		</AppPageHeader>

		<AppExpand :when="noResults">
			<section class="section fill-offset">
				<div class="container">
					<AppTranslate>No results for that search query.</AppTranslate>
				</div>
			</section>
		</AppExpand>

		<AppShellPageBackdrop id="search-results">
			<RouterView />

			<br />

			<AppPagination
				v-if="searchPayload.perPage && searchPayload.count"
				class="text-center"
				:items-per-page="searchPayload.perPage"
				:total-items="searchPayload.count"
				:current-page="searchPayload.page"
				@pagechange="Scroll.to('search-results', { animate: false })"
			/>
		</AppShellPageBackdrop>
	</div>
</template>
